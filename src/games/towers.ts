// Towers:从塔的可见数推高度的拉丁方。上游 towers.c。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { clearKey, digitKeys, leadingNumber, marksKey } from './util/keys'
import { act, cross } from './util/pad'

const towers: Game = {
  id: 'towers',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('towers'),
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

export default towers
