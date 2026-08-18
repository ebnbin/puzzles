// Unequal:带大小关系的拉丁方(含 Adjacent 变体)。上游 unequal.c。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { clearKey, digitKeys, hintKey, leadingNumber, marksKey } from './util/keys'
import { act, cross } from './util/pad'

const unequal: Game = {
  id: 'unequal',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('unequal'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ params }) => {
    const order = leadingNumber(params)
    if (!order) return null
    return [
      ...digitKeys(order, { startAtZero: order > 9 }),
      clearKey(),
      marksKey(),
      hintKey(),
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
