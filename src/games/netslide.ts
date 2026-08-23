// Netslide:整行整列滑动的 Net。上游 netslide.c。
// 两个确认键不分工(netslide.c:1115 只有右键反向),只给一个键;光标在边框
// 上时四个方向键只有两个活,看起来像 bug——上游键盘本来就这样,标签整圈报
// 同一个词,分不出光标在哪条边,没有依据置灰。
import type { Field, Game, Span } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { SQUARE_MAX } from './util/fields'

// game_configure 的下标(netslide.c:261)。[2] 是上游自带的勾选框,不归这里管。
const WIDTH = 0
const HEIGHT = 1
const BARRIER = 3
const SHUFFLE = 4

// 下界 2 是上游硬界(netslide.c:311)。**不要照抄 net 的 3**:net 躲的是宽或高
// 恰好 2 时两个无界循环空转,而这里的棋盘是一次生成树扩张,没有唯一性检查也没有
// 洗牌重试,2×50 实测 0.4 ms。
const size = (): Span => ({ min: 2, max: SQUARE_MAX })

// 洗牌步数的 0 **不同于 sixteen 的「完全随机」**:上游把它换成 2(w−1)(h−1) 步
// (netslide.c:575),一个跟着盘大小走的默认值。所以 100 够用——大盘要洗透用 0,
// 1–100 是「洗浅一点」那一侧,而实测错位率到 100 步就贴着 ~90% 的天花板了。
const shuffle = (): Span => ({ min: 0, max: 100 })

const fields: readonly Field[] = [
  { at: WIDTH, label: 'Width', span: size },
  { at: HEIGHT, label: 'Height', span: size },
  // 与 net 逐字相同:墙数 = 概率 × 候选墙数,严格线性。
  {
    at: BARRIER,
    label: 'Barrier probability',
    percent: true,
    decimals: 2,
    span: () => ({ min: 0, max: 1, step: 0.05 }),
  },
  { at: SHUFFLE, label: 'Number of shuffling moves', span: shuffle },
]

const netslide: Game = {
  id: 'netslide',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('netslide'),
  types: { menu: verbatim },
  fields,
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'slide', slot: 4, key: 'Enter', idle: { glyph: 'primary', word: 'slide' } }),
    ],
  },
  observe: still,
}

export default netslide
