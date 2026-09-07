// Unequal:带大小关系的拉丁方(含 Adjacent 变体)。上游 unequal.c。
import type { Game } from './game'
import { still } from './game'
import { keepPencil, samePages, verbatim } from './util/declare'
import {
  PENCIL_HIGHLIGHT,
  clearKey,
  digitKeys,
  hintKey,
  leadingNumber,
  marksKey,
  preferKeys,
} from './util/keys'
import { act, cross } from './util/pad'
import { int, range } from './util/params'

const unequal: Game = {
  id: 'unequal',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('unequal'),
  types: {
    menu: verbatim,
    params: [
      // Adjacent 模式从 Tricky(难度下标 2)起至少 5 阶(unequal.c:273)。
      int('Size (s*s)', (r) =>
        range(r.pick('Mode') === 1 && r.pick('Difficulty') >= 2 ? 5 : 3, 32),
      ),
    ],
  },
  prefs: { panel: verbatim, volatile: false, defaults: keepPencil },
  keypad: ({ params, prefs }) => {
    const order = leadingNumber(params)
    if (!order) return null
    return [
      ...digitKeys(order, { startAtZero: order > 9 }),
      clearKey(),
      marksKey(),
      hintKey(),
      ...preferKeys(prefs, [PENCIL_HIGHLIGHT]),
    ]
  },
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'pencil', slot: 4, key: 'Enter', idle: { glyph: 'pencil', word: 'pencil' } }),
    ],
  },
  observe: still,
}

export default unequal
