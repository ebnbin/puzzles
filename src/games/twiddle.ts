// Twiddle:旋转子方阵复原。上游 twiddle.c。
// a-d 转四角、小键盘转九宫定位块都是快捷方式(碰棋盘就能做到),不设按钮。
import type { DialogControl } from '../engine/types'
import type { Field, Game, Span } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { SQUARE_MAX, numberAt } from './util/fields'

// game_configure 的下标(twiddle.c:157)。[3] [4] 是上游自带的勾选框,不归这里管。
const WIDTH = 0
const HEIGHT = 1
const BLOCK = 2
const SHUFFLE = 5

// 上游对旋转块只有两条(twiddle.c:212):n ≥ 2、且 n ≤ w、n ≤ h。逐个 n 问过引擎,
// 合法集恰好就是 [2, min(w,h)] 这个闭区间,没有洞。
//
// 约束只从「块」这一侧兜:宽高各自照方格盘约定 2–50 自由走,块的上界跟着缩。
// 这样把宽拖小会把块一起带下来,而不是把宽卡住——上游要的是 w ≥ n,两边随便
// 哪边让都合法,让块让路的那种拖起来不会卡。
const size = (): Span => ({ min: 2, max: SQUARE_MAX })

// 块的上限比上游更紧,两条各管一件事。
//
// 一、**旋转中心不能只剩一个**。中心数是 (w−n+1)(h−n+1),等于 1 只发生在 w、h、n
//     三者相等时——整盘一起转,总共 4 个状态,不成其为谜题。注意这**不是**
//     「n ≤ min(w,h)−1」:非方盘不该受牵连,5×50 取 n=5 还有 46 个中心。
//     唯一的例外是 2×2,它只有 n=2 可选,再挡就没有合法值了,留着。
//
// 二、**固定封 16**。每步旋转的动画是 0.13·√(n−1) 秒(twiddle.c:1065),实测
//     n=16 是 523 ms、n=32 是 811 ms、n=50 是 1.3 秒——每走一步都要等这么久,
//     而这是每一步都付的钱。n=16 一次转 256 格,已是上游最大预设(6x6n4 的
//     16 格)的十六倍,给得很足。
//     (生成慢不在这条里:那部分现在跑在 worker 上,有遮罩能取消。)
const BLOCK_MAX = 16

const block = (controls: readonly DialogControl[]): Span => {
  const w = numberAt(controls, WIDTH)
  const h = numberAt(controls, HEIGHT)
  const width = Number.isFinite(w) ? Math.round(w) : SQUARE_MAX
  const height = Number.isFinite(h) ? Math.round(h) : SQUARE_MAX
  const lo = Math.min(width, height)
  const room = width === height ? lo - 1 : lo
  return { min: 2, max: Math.max(2, Math.min(room, BLOCK_MAX)) }
}

// 洗牌步数同 Sixteen:0 是上游默认(八个预设全是 0),含义是「洗透」而不是
// 「不打乱」;填了就变成标准杆,状态栏显示 Moves: k (target n)。上游无上界,
// 100 与 Sixteen 同档;步长留 1,粗了会让 par-1 到 par-4 够不着。
const shuffle = (): Span => ({ min: 0, max: 100 })

const fields: readonly Field[] = [
  { at: WIDTH, label: 'Width', span: size },
  { at: HEIGHT, label: 'Height', span: size },
  { at: BLOCK, label: 'Rotating block size', span: block },
  { at: SHUFFLE, label: 'Number of shuffling moves', span: shuffle },
]

const twiddle: Game = {
  id: 'twiddle',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 4], [3, 5], [6, 7]] },
  pages: samePages('twiddle'),
  types: { menu: verbatim },
  fields,
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'left', slot: 4, key: 'Enter', idle: { glyph: 'turnLeft', word: 'turnLeft' } }),
      act({ id: 'right', slot: 6, key: ' ', idle: { glyph: 'turnRight', word: 'turnRight' } }),
    ],
  },
  observe: still,
}

export default twiddle
