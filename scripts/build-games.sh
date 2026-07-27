#!/usr/bin/env bash
#
# Rebuild the WebAssembly puzzles and the HTML manual from vendor/sgtpuzzles.
#
# The output of this script is committed to the repository under public/, so
# deployment never needs a C toolchain. You only need to run this when bumping
# the vendored upstream source or changing build flags.
#
# Requires: cmake, ninja, halibut, perl, git, python3
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/vendor/sgtpuzzles"
BUILD="$ROOT/.build"
EMSDK_DIR="$BUILD/emsdk"
OUT_GAMES="$ROOT/public/games"
OUT_DOC="$ROOT/public/doc"

EMSDK_VERSION=6.0.4

# Emscripten 6.x dropped support for browsers as old as sgtpuzzles targets by
# default (Chrome 57, Firefox 68) and refuses to emit code for them. Raising
# the floors to Emscripten's own minimums is required to compile at all; it
# does not alter game behaviour, and the resulting binaries are byte-identical
# to the ones published on the upstream website.
MIN_CHROME_VERSION=85
MIN_FIREFOX_VERSION=79
MIN_SAFARI_VERSION=150000

[ -d "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

# --- Emscripten SDK -------------------------------------------------------
if [ ! -d "$EMSDK_DIR" ]; then
  echo "==> fetching emsdk"
  mkdir -p "$BUILD"
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
fi
echo "==> activating emscripten $EMSDK_VERSION"
"$EMSDK_DIR/emsdk" install "$EMSDK_VERSION"
"$EMSDK_DIR/emsdk" activate "$EMSDK_VERSION"
# shellcheck disable=SC1091
source "$EMSDK_DIR/emsdk_env.sh" >/dev/null 2>&1

# --- Compile the puzzles --------------------------------------------------
echo "==> configuring"
emcmake cmake -S "$SRC" -B "$BUILD/web" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DMIN_CHROME_VERSION="$MIN_CHROME_VERSION" \
  -DMIN_FIREFOX_VERSION="$MIN_FIREFOX_VERSION" \
  -DMIN_SAFARI_VERSION="$MIN_SAFARI_VERSION"

echo "==> compiling"
cmake --build "$BUILD/web" --parallel "$(nproc)"

# --- Generate the per-game HTML pages -------------------------------------
# jspage.pl is upstream's own page generator; the pages it emits are the ones
# shipped on the upstream website, and are used here unmodified.
echo "==> generating game pages"
rm -rf "$OUT_GAMES"
mkdir -p "$OUT_GAMES/js"
(cd "$OUT_GAMES" && perl "$SRC/html/jspage.pl" \
  --jspath=js/ /dev/null "$SRC"/html/*.html)

# unfinished/ puzzles (currently just `group`) are not published upstream.
rm -f "$OUT_GAMES/group.html"

for js in "$BUILD/web"/*.js; do
  name="$(basename "$js" .js)"
  # nullgame is an internal template, not a playable puzzle.
  [ "$name" = nullgame ] && continue
  [ -f "$OUT_GAMES/$name.html" ] || continue
  cp "$js" "$BUILD/web/$name.wasm" "$OUT_GAMES/js/"
done

# --- Build the manual -----------------------------------------------------
# Flags copied verbatim from upstream's Buildscr so the anchors the game pages
# link to (../doc/<game>.html#<game>) resolve.
echo "==> building manual"
rm -rf "$OUT_DOC"
mkdir -p "$OUT_DOC"
(cd "$OUT_DOC" && halibut --html \
  -Chtml-contents-filename:index.html \
  -Chtml-index-filename:indexpage.html \
  -Chtml-template-filename:%k.html \
  -Chtml-template-fragment:%k \
  "$SRC/puzzles.but")

# --- Metadata for the launcher -------------------------------------------
echo "==> extracting game metadata"
node "$ROOT/scripts/extract-games.mjs"

echo
echo "done: $(ls "$OUT_GAMES"/*.html | wc -l) games, $(ls "$OUT_DOC"/*.html | wc -l) manual pages"
