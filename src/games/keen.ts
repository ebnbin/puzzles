// Keen:算式笼子的拉丁方。上游 keen.c。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { clearKey, digitKeys, leadingNumber, marksKey } from './util/keys'
import { act, cross } from './util/pad'

const keen: Game = {
  id: 'keen',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('keen'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ params }) => {
    const size = leadingNumber(params)
    if (!size) return null
    return [
      ...digitKeys(size),
      clearKey(),
      marksKey(),
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

export default keen
