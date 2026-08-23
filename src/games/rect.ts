// Rect:把棋盘切成带数字的矩形。上游 rect.c。
// 键盘可以自己拉一次拖拽(rect.c:2191)。标签四态(rect.c:2374):没拖拽
// Mark/Erase;拖拽没动过两键同报 Cancel;动过之后开拖的键 Done、另一键 Cancel。
// 「哪个键开的拖拽」标签说不出来,自己记一位:四个状态里三个标签说得清,只有
// 「开了没动」靠记,猜错免费——那一格两个键本来都是放弃。
import type { DialogControl } from '../engine/types'
import type { Field, Game, Labels, Span, View } from './game'
import { keyOf, plain } from './game'
import { samePages, verbatim } from './util/declare'
import type { ActSpec, FaceSpec } from './util/pad'
import { act, cross, wordOf } from './util/pad'
import { SQUARE_MAX, numberAt } from './util/fields'

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

// game_configure 的下标(rect.c:177)。[3] 是上游自带的勾选框,不归这里管。
const WIDTH = 0
const HEIGHT = 1
const EXPAND = 2

const sideAt = (controls: readonly DialogControl[], at: number, fallback: number) => {
  const n = numberAt(controls, at)
  return Number.isFinite(n) ? Math.max(1, Math.round(n)) : fallback
}

// 上游只要求 w ≥ 1、h ≥ 1、w×h ≥ 2(rect.c:220),所以 1×N 合法、1×1 不合法:
// 另一边是 1 的时候这一边最小 2。上限上游没有,照方格盘约定封 50。
const side = (other: number) => (controls: readonly DialogControl[]): Span => ({
  min: sideAt(controls, other, SQUARE_MAX) === 1 ? 2 : 1,
  max: SQUARE_MAX,
})

// 拉伸系数上游只有 e ≥ 0,没有上界。唯一的事实线是**饱和点**:上游先生成
// base = max(2, (int)(边长/(1+e))) 的小底盘再拉开(rect.c:1165),两边都钉到 2
// 之后再调 e 生成的是逐字相同的局,那条线是 e = max(w,h)/3 − 1。
const EXPAND_STEP = 0.1

const expand = (controls: readonly DialogControl[]): Span => {
  const w = sideAt(controls, WIDTH, SQUARE_MAX)
  const h = sideAt(controls, HEIGHT, SQUARE_MAX)
  // 收到步长网格上:顶格要拖得到。收尾是必须的,156 × 0.1 会漂成 15.600000000000001。
  const stops = Math.max(0, Math.floor((Math.max(w, h) / 3 - 1) / EXPAND_STEP))
  return { min: 0, max: Number((stops * EXPAND_STEP).toFixed(6)), step: EXPAND_STEP }
}

const fields: readonly Field[] = [
  { at: WIDTH, label: 'Width', span: side(HEIGHT) },
  { at: HEIGHT, label: 'Height', span: side(WIDTH) },
  { at: EXPAND, label: 'Expansion factor', span: expand, decimals: 1 },
]

const rect: Game<Facts> = {
  id: 'rect',
  // 拖拽没动过时两键同报 Cancel(rect.c:2374),要申报给边界复原。
  upstream: { labels: 'live', echoes: ['Cancel'], cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('rect'),
  types: { menu: verbatim },
  fields,
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
