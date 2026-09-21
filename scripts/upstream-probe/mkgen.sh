#!/bin/sh
# 用法:scripts/upstream-probe/mkgen.sh <game> [out-dir] → 产出 <out-dir>/gen-<game>(默认当前目录)。
# 本机 gcc 直接编上游 C 源,链接 nullfe.c 的空前端;何时用见 README.md。
here=$(cd "$(dirname "$0")" && pwd); V=$here/../../vendor/sgtpuzzles; out=${2:-.}
cd "$V" && gcc -O2 -w -I. -DPUZZLE_SRC="\"$1.c\"" -o "$out/gen-$1" "$here/gen.c" \
  nullfe.c malloc.c random.c misc.c dsf.c combi.c divvy.c tree234.c findloop.c matching.c latin.c tdq.c \
  laydomino.c sort.c grid.c loopgen.c penrose.c penrose-legacy.c hat.c spectre.c -lm
