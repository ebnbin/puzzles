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
OUT_ENGINE="$ROOT/public/engine"

# Every puzzle is built twice: once as upstream ships it, into public/games,
# and once as an ES module the React host can mount, into public/engine. The
# two differ only in their JavaScript wrapper — the .wasm must come out
# identical, which is checked below.
#
# Both sets are committed, and the duplicated .wasm costs nothing: identical
# content means git stores one blob for each pair.

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

# --- Second build: ES modules for the TypeScript rewrite ------------------
# Same sources, same flags, same resulting .wasm — only the JavaScript wrapper
# differs. Upstream's build leaves the glue in global scope and runs main() on
# load, which cannot be mounted twice or torn down; MODULARIZE wraps it in a
# factory so React can instantiate a puzzle per mount. STRICT_JS is dropped
# because ES modules are strict already and emcc rejects the combination.
#
# The link flags go through CMAKE_EXE_LINKER_FLAGS rather than
# CMAKE_C_LINK_FLAGS: upstream's emscripten.cmake assigns the latter
# unconditionally, so passing it on the command line would be overwritten.
#
# Upstream's cmake names emccpre.js and emcclib.js directly, and emcc appends
# --pre-js rather than replacing it, so ours cannot simply be added: both
# would run, and upstream's assignment to Module would discard what the host
# passed in. Build from a throwaway copy of the tree with the two files
# swapped instead, which leaves vendor/ untouched and keeps the substitution
# visible here rather than hidden in a patch.
echo "==> building ES modules"
rm -rf "$BUILD/src-esm"
cp -r "$SRC" "$BUILD/src-esm"
cp "$ROOT/engine/puzzle-pre.js" "$BUILD/src-esm/emccpre.js"
cp "$ROOT/engine/puzzle-lib.js" "$BUILD/src-esm/emcclib.js"

emcmake cmake -S "$BUILD/src-esm" -B "$BUILD/esm" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DMIN_CHROME_VERSION="$MIN_CHROME_VERSION" \
  -DMIN_FIREFOX_VERSION="$MIN_FIREFOX_VERSION" \
  -DMIN_SAFARI_VERSION="$MIN_SAFARI_VERSION" \
  -DCMAKE_EXE_LINKER_FLAGS="-sSTRICT_JS=0 -sMODULARIZE=1 -sEXPORT_ES6=1"

cmake --build "$BUILD/esm" --parallel "$(nproc)"

rm -rf "$OUT_ENGINE"
mkdir -p "$OUT_ENGINE"
# Whatever was published as a playable puzzle, publish an ES module for.
for html in "$OUT_GAMES"/*.html; do
  name="$(basename "$html" .html)"
  [ -f "$BUILD/esm/$name.js" ] || { echo "no ES module built for $name" >&2; exit 1; }
  cp "$BUILD/esm/$name.js" "$BUILD/esm/$name.wasm" "$OUT_ENGINE/"

  # Only the JavaScript wrapper differs between the two builds, so the
  # binaries must stay identical. If they ever diverge, the rewrite is no
  # longer being compared against the same puzzle.
  cmp "$OUT_GAMES/js/$name.wasm" "$OUT_ENGINE/$name.wasm" ||
    { echo "$name.wasm differs between the two builds" >&2; exit 1; }
done

# --- Metadata for the launcher -------------------------------------------
echo "==> extracting game metadata"
node "$ROOT/scripts/extract-games.mjs"

echo
echo "done: $(ls "$OUT_GAMES"/*.html | wc -l) games, $(ls "$OUT_DOC"/*.html | wc -l) manual pages"
