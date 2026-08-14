#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/vendor/sgtpuzzles"
BUILD="$ROOT/.build"
EMSDK_DIR="$BUILD/emsdk"
OUT_DOC="$ROOT/public/doc"
OUT_ENGINE="$ROOT/public/engine"

EMSDK_VERSION=6.0.4

MIN_CHROME_VERSION=85
MIN_FIREFOX_VERSION=79
MIN_SAFARI_VERSION=150000

[ -d "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

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

echo "==> configuring (reference)"
emcmake cmake -S "$SRC" -B "$BUILD/web" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DMIN_CHROME_VERSION="$MIN_CHROME_VERSION" \
  -DMIN_FIREFOX_VERSION="$MIN_FIREFOX_VERSION" \
  -DMIN_SAFARI_VERSION="$MIN_SAFARI_VERSION"

echo "==> compiling (reference)"
cmake --build "$BUILD/web" --parallel "$(nproc)"

echo "==> building manual"
node "$ROOT/scripts/build-doc.mjs"

echo "==> building ES modules"
rm -rf "$BUILD/src-esm"
cp -r "$SRC" "$BUILD/src-esm"
cp "$ROOT/engine/puzzle-pre.js" "$BUILD/src-esm/emccpre.js"
cp "$ROOT/engine/puzzle-lib.js" "$BUILD/src-esm/emcclib.js"

# 链接参数必须走 CMAKE_EXE_LINKER_FLAGS:上游的 emscripten.cmake 会无条件
# 覆盖 CMAKE_C_LINK_FLAGS,从命令行传后者等于没传。
emcmake cmake -S "$BUILD/src-esm" -B "$BUILD/esm" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DMIN_CHROME_VERSION="$MIN_CHROME_VERSION" \
  -DMIN_FIREFOX_VERSION="$MIN_FIREFOX_VERSION" \
  -DMIN_SAFARI_VERSION="$MIN_SAFARI_VERSION" \
  -DCMAKE_EXE_LINKER_FLAGS="-sSTRICT_JS=0 -sMODULARIZE=1 -sEXPORT_ES6=1"

cmake --build "$BUILD/esm" --parallel "$(nproc)"

rm -rf "$OUT_ENGINE"
mkdir -p "$OUT_ENGINE"
for html in "$SRC"/html/*.html; do
  name="$(basename "$html" .html)"
  # group 是上游自己都不发布的半成品
  [ "$name" = group ] && continue
  [ -f "$BUILD/esm/$name.js" ] || { echo "no ES module built for $name" >&2; exit 1; }
  cp "$BUILD/esm/$name.js" "$BUILD/esm/$name.wasm" "$OUT_ENGINE/"

  cmp "$BUILD/web/$name.wasm" "$OUT_ENGINE/$name.wasm" ||
    { echo "$name.wasm differs between the two builds" >&2; exit 1; }
done

echo "==> extracting game metadata"
node "$ROOT/scripts/extract-games.mjs"

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
echo "done: $(ls "$OUT_ENGINE"/*.js | wc -l) games," \
  "$(ls "$OUT_DOC"/*/*.html | wc -l) manual pages"
