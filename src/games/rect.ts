// Rect:把棋盘切成带数字的矩形。上游 rect.c。键盘可以自己拉一次拖拽(rect.c:2191)。标签四态
// (rect.c:2374):没拖拽 Mark/Erase;拖拽没动过两键同报 Cancel;动过之后开拖的键 Done、另一键
// Cancel。「哪个键开的拖拽」标签说不出来,自己记一位。
import type { Game, Labels, View } from './game'
import { keyOf, plain } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { ActSpec, FaceSpec } from './util/pad'
import { act, cross, wordOf } from './util/pad'

type Facts = { opened: string | null }

// 拖拽中还没动过(两键同报 Cancel)时,开拖的那一侧画灰勾。
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
    word: (view) => dragging(view, spec.key),
    faces: {
      [spec.idle.word === 'mark' ? 'Mark' : 'Erase']: spec.idle,
      Done: { glyph: 'done', word: 'done' },
      Cancel: { glyph: 'cancel', word: 'cancel' },
      [PENDING]: { glyph: 'done', word: 'done', idle: true },
    } as Record<string, FaceSpec>,
  })

// validate_params rect.c:221-232,不看 full:宽高 > 0 且面积 ≥ 2;扩展因子 ≥ 0,上游用 %g 显示,
// 没有上限,量程取 0..100、步长 0.1。生成期多一条:宽或高为 1 时扩展因子必须是 0(rect.c:1165-1168
// 只托底 ≥ 2 的那一维,随后 random_upto(rs, -1) 在 random.c:275 的 assert 上必炸)。
const custom: Custom<'rect'> = {
  fields: [
    width(1),
    height(1),
    { kind: 'float', key: 'expandfactor', word: 'expand', min: 0, max: 100, step: 0.1, digits: 1 },
    { kind: 'flag', key: 'unique', word: 'unique' },
  ],
  rules: [
    rule('rect.c:227', ['w', 'h'], (v) => v.w * v.h < 2),
    rule('rect.c:1165', ['w', 'expandfactor'], (v) => v.w === 1 && v.expandfactor > 0),
    rule('rect.c:1167', ['h', 'expandfactor'], (v) => v.h === 1 && v.expandfactor > 0),
  ],
}

const rect: Game<'rect', Facts> = {
  id: 'rect',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('rect'),
  types: { menu: verbatim, custom },
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
