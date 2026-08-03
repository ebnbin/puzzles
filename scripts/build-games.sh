#!/usr/bin/env bash
#
# Rebuild the WebAssembly puzzles and the HTML manual from vendor/sgtpuzzles.
#
# The output of this script is committed to the repository under public/, so
# deployment never needs a C toolchain. You only need to run this when bumping
# the vendored upstream source or changing build flags.
#
# Requires: cmake, ninja, halibut, git, python3
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/vendor/sgtpuzzles"
BUILD="$ROOT/.build"
EMSDK_DIR="$BUILD/emsdk"
OUT_DOC="$ROOT/public/doc"
OUT_ENGINE="$ROOT/public/engine"

# Every puzzle is built twice from the same C: once with upstream's own
# JavaScript wrapper, and once as an ES module the React host can mount. Only
# the second is published, into public/engine. The first is never copied out of
# the build directory — it exists so that the two .wasm can be compared.
#
# That comparison is the whole reason it is built. Swapping emccpre.js and
# emcclib.js for ours must not reach the binary; if it ever does, the puzzle the
# app runs has quietly stopped being the puzzle upstream wrote.

EMSDK_VERSION=6.0.4

# Emscripten 6.x dropped support for browsers as old as sgtpuzzles targets by
# default (Chrome 57, Firefox 68) and refuses to emit code for them. Raising
# the floors to Emscripten's own minimums is required to compile at all.
#
# This used to claim the result was byte-identical to the binaries on
# upstream's own website. It is not, and never was: theirs are built with
# assertions on and ours are not, so ours are roughly half the size (net.wasm
# 130 KB against 300 KB, and the glue 39 KB against 111 KB — same story for
# every game sampled). The source is upstream's, unmodified; the build
# configuration is not.
#
# The identity that is real, and is checked by the cmp below, is between our
# own two builds: the same C compiled twice, differing only in its JavaScript
# wrapper, must produce the same .wasm.
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

# --- Reference build: upstream's own wrapper ------------------------------
# Nothing here is published. It is compiled so the ES modules below have
# something to be compared against; see the note at the top.
echo "==> configuring (reference)"
emcmake cmake -S "$SRC" -B "$BUILD/web" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DMIN_CHROME_VERSION="$MIN_CHROME_VERSION" \
  -DMIN_FIREFOX_VERSION="$MIN_FIREFOX_VERSION" \
  -DMIN_SAFARI_VERSION="$MIN_SAFARI_VERSION"

echo "==> compiling (reference)"
cmake --build "$BUILD/web" --parallel "$(nproc)"

# --- Build the manual -----------------------------------------------------
# Runs halibut with the flags copied verbatim from upstream's Buildscr, lays
# the Simplified Chinese translation from doc-zh/ alongside it, and gives both
# a head and a stylesheet. See scripts/build-doc.mjs.
echo "==> building manual"
node "$ROOT/scripts/build-doc.mjs"

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
# Which puzzles are playable is upstream's answer rather than ours: html/ holds
# one page per published puzzle, and is what its own website is built from.
# `group` is the exception it makes for itself — an unfinished/ puzzle, carried
# there but not shipped — and nullgame, being an internal template, has no page
# to be found here at all.
for html in "$SRC"/html/*.html; do
  name="$(basename "$html" .html)"
  [ "$name" = group ] && continue
  [ -f "$BUILD/esm/$name.js" ] || { echo "no ES module built for $name" >&2; exit 1; }
  cp "$BUILD/esm/$name.js" "$BUILD/esm/$name.wasm" "$OUT_ENGINE/"

  # Only the JavaScript wrapper differs between the two builds, so the
  # binaries must stay identical. If they ever diverge, the rewrite is no
  # longer being compared against the same puzzle.
  cmp "$BUILD/web/$name.wasm" "$OUT_ENGINE/$name.wasm" ||
    { echo "$name.wasm differs between the two builds" >&2; exit 1; }
done

# --- Metadata for the launcher -------------------------------------------
echo "==> extracting game metadata"
node "$ROOT/scripts/extract-games.mjs"

# --- Pictures ---------------------------------------------------------------
# Every picture in the app is a real board, rendered in a browser against a
# preview of the site — so the site has to be built and served first, and one
# server does all three. See scripts/build-tiles.mjs for why the positions come
# from upstream's saved games.
#
# All three, not just the thumbnails: they are photographs of the engine and of
# engine/palette.ts, so an upstream upgrade or a palette change dates every one
# of them at once. Running one and not the others is how they drift apart.
echo "==> rendering pictures"
npm --prefix "$ROOT" run build
npm --prefix "$ROOT" exec -- vite preview --port 4173 --strictPort &
preview=$!
trap 'kill $preview 2>/dev/null' EXIT
for _ in $(seq 30); do
  curl -sf -o /dev/null http://localhost:4173/ && break
  sleep 1
done
node "$ROOT/scripts/build-tiles.mjs"
node "$ROOT/scripts/build-howto.mjs"
node "$ROOT/scripts/build-art.mjs"
kill $preview 2>/dev/null
trap - EXIT

echo
# One directory per language under public/doc/, so the pages are a level down
# from where this used to look for them. It counted zero for as long as that has
# been true, which is the trouble with a summary line nobody checks.
echo "done: $(ls "$OUT_ENGINE"/*.js | wc -l) games," \
  "$(ls "$OUT_DOC"/*/*.html | wc -l) manual pages"
