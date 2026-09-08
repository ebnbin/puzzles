// Rect:把棋盘切成带数字的矩形。上游 rect.c。
// 键盘可以自己拉一次拖拽(rect.c:2191)。标签四态(rect.c:2374):没拖拽
// Mark/Erase;拖拽没动过两键同报 Cancel;动过之后开拖的键 Done、另一键 Cancel。
// 「哪个键开的拖拽」标签说不出来,自己记一位:四个状态里三个标签说得清,只有
// 「开了没动」靠记,猜错免费——那一格两个键本来都是放弃。
import type { Game, Labels, View } from './game'
import { keyOf, plain } from './game'
import { samePages, verbatim } from './util/declare'
import type { ActSpec, FaceSpec } from './util/pad'
import { act, cross, wordOf } from './util/pad'
import type { Read } from './util/params'
import { CAP, float, formatFloat, int, range } from './util/params'

// 面板上调的是「粒度」t:0 = base 就是棋盘本身(矩形最碎),1 = base 缩到最小的
// 2×2(矩形最少)。写进控件的仍是上游的 e —— 按长边 M = max(宽, 高) 反算:
//   base = M − (M − 2)·t,  e = M / base − 1。
// 同一个 t 在不同棋盘上算出的 e 不同,这正是它跨棋盘对齐粒度的办法(矩形个数只由
// base 面积决定)。改宽高会重算这张表,存着的 e 被吸到最近一档,t 因此会漂一点。
const GRAIN = 100 // t 的档数:0.00、0.01 … 1.00
// e 的小数位:两位时小棋盘上相邻两档会算成同一个 e,表就不严格递增了。
const DIGITS = 4
const SCALE = 10 ** DIGITS

const longSide = (r: Read) => Math.max(r.int('Width'), r.int('Height'))

// e 只往小里截、不四舍五入:截大了 ⌊M/(1+e)⌋ 会掉到 base 下面一格去。
const eOf = (M: number, t: number) =>
  Math.floor((M / (M - (M - 2) * t) - 1) * SCALE + 1e-9) / SCALE

const tOf = (M: number, e: number) => (M <= 2 ? 0 : (M - M / (1 + e)) / (M - 2))

const grain = (r: Read): number[] => {
  const M = longSide(r)
  if (!Number.isFinite(M) || M < 2) return []
  const out: number[] = []
  for (let k = 0; k <= GRAIN; k++) {
    const e = eOf(M, k / GRAIN)
    if (out[out.length - 1] !== e) out.push(e) // 只有 2×2 的棋盘整张表塌成一档
  }
  return out
}

type Facts = { opened: string | null }

const WORDS = ['Mark', 'Erase', 'Done', 'Cancel']

// 拖拽中还没动过(两键同报 Cancel)时,开拖的那一侧亮的是灰勾:承诺的是
// 「这里将来落 Done」,不是现在能按。
const PENDING = '\0pending'

const opener = (labels: Labels, was: string | null) =>
  labels.enter === 'Done'
    ? 'Enter'
    : labels.space === 'Done'
      ? ' '
      : labels.enter === 'Cancel'
        ? was
        : null

const opens = (key: string, labels: Labels) =>
  (key === 'Enter' || key === ' ') && labels.enter === 'Mark'

const dragging = (view: View<Facts>, key: string) => {
  const word = wordOf(key, view.labels)
  if (
    view.labels.enter === 'Cancel' &&
    view.labels.space === 'Cancel' &&
    view.facts.opened === key
  )
    return PENDING
  return word
}

const duo = (spec: Pick<ActSpec<Facts>, 'id' | 'slot' | 'key' | 'idle'>) =>
  act<Facts>({
    ...spec,
    words: WORDS,
    word: (view) => dragging(view, spec.key),
    faces: {
      [spec.idle.word === 'mark' ? 'Mark' : 'Erase']: spec.idle,
      Done: { glyph: 'done', word: 'done' },
      Cancel: { glyph: 'cancel', word: 'cancel' },
      [PENDING]: { glyph: 'done', word: 'done', idle: true },
    } as Record<string, FaceSpec>,
  })

const rect: Game<Facts> = {
  id: 'rect',
  // 拖拽没动过时两键同报 Cancel(rect.c:2374),要申报给边界复原。
  upstream: { labels: 'live', echoes: ['Cancel'], cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('rect'),
  types: {
    menu: verbatim,
    params: [
      // 宽高从 2 起:上游允许 1×n(只查 w·h ≥ 2),但生成时 base 边长 = ⌊1/(1+e)⌋ = 0
      // ——钳位那句写的是 w >= 2,救不了它——扩展因子一动就把引擎打死
      // (random.c:275 断言)。两维都 ≥ 2 时 base 必 ≥ 2×2。
      int('Width', () => range(2, CAP)),
      int('Height', () => range(2, CAP)),
      // 上游只要求非负(rect.c:229)。这一档调的是粒度 t,读数是 t、写进去的是 e。
      float('Expansion factor', DIGITS, grain, {
        show: (e, r) => tOf(longSide(r), e).toFixed(2),
        note: (e) => `e ${formatFloat(e, DIGITS)}`,
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross<Facts>(),
      duo({ id: 'mark', slot: 4, key: 'Enter', idle: { glyph: 'mark', word: 'mark' } }),
      duo({ id: 'erase', slot: 6, key: ' ', idle: { glyph: 'erase', word: 'erase' } }),
    ],
  },
  observe: {
    init: { opened: null },
    next: (facts, saw) => {
      if ('spoke' in saw) return { opened: opener(saw.spoke, facts.opened) }
      if ('sent' in saw && plain(saw.sent) && opens(keyOf(saw.sent), saw.before))
        return { opened: keyOf(saw.sent) }
      if ('deal' in saw) return { opened: null }
      return facts
    },
  },
}

export default rect
