// Bridges:岛间架桥。上游 bridges.c。Space 标记岛屿完成;架桥/无桥是一次性
// 上膛键(下一次方向键带 Ctrl/Shift 直接连;上游在移动失败时不清 dragging,
// 所以走成才卸膛——由 walk 里的存档对比判定)。
import type { Game } from './game'
import { still } from './game'
import type { Custom, Values } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { hintKey, preferKeys } from './util/keys'
import { act, arm, cross } from './util/pad'

// 'g'/'G' 当场翻这条偏好(bridges.c:2589),所以偏好是 volatile 的:按完键要重读。
const HINTS: Prefer = {
  kind: 'flag',
  label: 'Show possible bridge locations',
  glyph: 'maybeBridge',
}

// 上游默认不画候选桥位(bridges.c:2145),这边翻过来:between_island 是纯几何——
// 只问「这两个岛在同一行列上、中间没别的岛」,不看数字、不看已架的桥,画出来的就是
// 这一局所有合法桥位。手指要在岛之间拖,先看得见能拖到哪。
const SHOW_LANES = { 'show-hints': 'true' } as const

// validate_params bridges.c:811-826:宽高各 ≥ 3;最大桥数、岛屿占比、扩展因子都是下拉框,
// 取值就是选项本身(1..4、5%..30%、0%..100%),校验永远过;INT_MAX 那条在 100 以内碰不到。
// 三个数值型枚举画成 slider,当前值显示选项原文,机器里存的是选项下标。
// 生成(bridges.c:1856-2002)先铺 max(floor(占比·面积/100), 3) 个岛,岛数 > 3 时要求低一档
// 解不出(1990-1996)、本档解得出(1998-2002),否则 goto 重来。下面三种组合每一轮都被
// 回绝,不是概率(唯一出口是连续 50 次放岛失败只剩 ≤ 3 岛,实测八百万轮里 7 次、还要过
// 四边检查,按必死处理):
//  - 最多 1 桥且允许环路时的 Medium:maxb=1 下 stage2(1424-1470)每个方向的判据
//    navail−1 < count 与 stage1 的 fillone 判据 count > nadj−1 相同,环路检查又被
//    allowloops 短路,Medium 能解的 Easy 都能解,岛数 ≥ 4 一律「too easy」;
//  - 最多 1 桥时 4 或 5 个岛的 Medium/Hard,以及允许环路时 4 个岛的 Medium(任意桥数):
//    把 k 个岛的全部相对布局 × 桥数组合交给求解器穷举(scripts/upstream-probe/br_enum.c),
//    没有一种能同时过两关。6 岛以上没穷举,放行。
// 桥数、占比都是计数层,让位时先动桥数(1 桥改 2 桥比把占比压到 5% 更像用户本意)。
const MEDIUM = 1
const ONE_BRIDGE = 0
const islandsWanted = (v: Values) => Math.max(Math.floor(((v.islands + 1) * 5 * v.w * v.h) / 100), 3)
const custom: Custom = {
  fields: [
    width(3),
    height(3),
    difficulty(['easy', 'medium', 'hard']),
    { kind: 'flag', key: 'loops', label: 'Allow loops', word: 'allowLoops' },
    { kind: 'scale', key: 'maxb', label: 'Max. bridges per direction', word: 'maxBridges' },
    { kind: 'scale', key: 'islands', label: '%age of island squares', word: 'islandPc' },
    { kind: 'scale', key: 'expansion', label: 'Expansion factor (%age)', word: 'expansionPc' },
  ],
  rules: [
    rule('bridges.c:1990', ['w', 'h', 'maxb', 'islands', 'loops', 'diff'], (v) =>
      !!v.loops && v.maxb === ONE_BRIDGE && v.diff === MEDIUM && islandsWanted(v) >= 4),
    rule('bridges.c:1990', ['w', 'h', 'maxb', 'islands', 'diff'], (v) =>
      v.maxb === ONE_BRIDGE && v.diff >= MEDIUM && islandsWanted(v) >= 4 && islandsWanted(v) <= 5),
    rule('bridges.c:1990', ['w', 'h', 'islands', 'loops', 'diff'], (v) =>
      !!v.loops && v.diff === MEDIUM && islandsWanted(v) === 4),
  ],
}

const bridges: Game = {
  id: 'bridges',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('bridges'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: true, defaults: SHOW_LANES },
  keypad: ({ prefs }) => [hintKey(), ...preferKeys(prefs, [HINTS])],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'done', slot: 7, key: ' ', idle: { glyph: 'islandDone', word: 'islandDone' } }),
      arm({ id: 'bridge', slot: 8, glyph: 'bridge', word: 'buildBridge', mods: { ctrl: true } }),
      arm({ id: 'nobridge', slot: 9, glyph: 'noBridge', word: 'noBridge', mods: { shift: true } }),
    ],
  },
  observe: still,
}

export default bridges
