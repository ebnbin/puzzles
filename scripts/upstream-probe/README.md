# 上游生成器探针

自定义参数的规则(`src/games/*.ts` 里的 `rules`)以上游 C 源码为准;读代码断不了的
「这组参数到底生不生得出」,用这里的工具在本机跑上游代码本身来回答。不进 build,
不进浏览器,只在改规则时手动跑。要 gcc,不要 emsdk。

- `mkgen.sh <game>`:把 `vendor/sgtpuzzles/<game>.c` 编成 `gen-<game>`。
  `./gen-<game> <参数串> [种子数] [超时秒]` 按参数串跑 `new_game_desc`,超时打印
  `TIMEOUT`;生出来还会过一遍 `validate_desc`,装不回去打印 `DESC-INVALID`。
  只能反驳「一定生不出」(生出来了就不是必死),超时本身不是证明。
- `lu_enum.c`:Light Up 小盘穷举。`lu_enum W H a|v|o|f|r`(全部布局 / 2 重镜像 /
  2 重旋转 / 4 重镜像 / 4 重旋转)把该形状的每个谜面交给 `puzzle_is_good`,报告
  Easy/Tricky/Hard 各多少,某档为 0 就是该组合必死。编:
  `cd vendor/sgtpuzzles && gcc -O2 -w -I. -o lu_enum ../../scripts/upstream-probe/lu_enum.c nullfe.c malloc.c random.c misc.c combi.c`
- `br_enum.c`:Bridges 少岛穷举。`br_enum K MAXB LOOPS DIFF` 把 K 个岛的全部相对
  布局 × 桥数组合交给求解器,按生成器的判据(低一档解不出、本档解得出)数通过数,
  为 0 就是该组合必死。编:同上,把 combi.c 换成 dsf.c findloop.c,加 -lm。
