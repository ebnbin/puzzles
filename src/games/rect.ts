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
  types: { menu: verbatim },
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
