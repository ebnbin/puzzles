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
// 约束只从「块」这一侧兜:宽高各自照方格盘约定 2–50 自由走,块的上界跟着
// min(w,h) 缩。这样把宽拖小会把块一起带下来,而不是把宽卡住——上游要的是
// w ≥ n,两边随便哪边让都合法,让块让路的那种拖起来不会卡。
//
// **没有按代价收窄**:movetarget = 0 时上游要洗 2·w·h·n² 次、每次 O(n²)
// (twiddle.c:340),实测 50×50 n=26 冻 7 秒、n=42 冻 25 秒(wasm 在主线程);
// 而且每步旋转的动画是 0.13·√(n−1) 秒,n=50 时每走一步要等 0.9 秒。
// 这两条都是「合法但用不了」,先按硬限制放开看效果,再定要不要收。
const size = (): Span => ({ min: 2, max: SQUARE_MAX })

const block = (controls: readonly DialogControl[]): Span => {
  const w = numberAt(controls, WIDTH)
  const h = numberAt(controls, HEIGHT)
  const lo = Math.min(
    Number.isFinite(w) ? Math.round(w) : SQUARE_MAX,
    Number.isFinite(h) ? Math.round(h) : SQUARE_MAX,
  )
  return { min: 2, max: Math.max(2, Math.min(lo, SQUARE_MAX)) }
}

// 洗牌步数同 Sixteen:0 是上游默认(八个预设全是 0),含义是「洗透」而不是
// 「不打乱」;填了就变成标准杆,状态栏显示 Moves: k (target n)。上游无上界,
// 50 取自 Sixteen 那次的结论——杆数要人去数。
const shuffle = (): Span => ({ min: 0, max: 50 })

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
