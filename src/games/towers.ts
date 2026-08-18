// Towers:从塔的可见数推高度的拉丁方。上游 towers.c。
import type { Game } from './game'
import { still } from './game'
import { keepPencil, samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import {
  PENCIL_HIGHLIGHT,
  clearKey,
  digitKeys,
  leadingNumber,
  marksKey,
  preferKeys,
} from './util/keys'
import { act, cross } from './util/pad'

const LOOK: Prefer = {
  kind: 'cycle',
  answers: ['2D', '3D'],
  glyphs: ['towersFlat', 'towersTall'],
}

const towers: Game = {
  id: 'towers',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('towers'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false, defaults: keepPencil },
  keypad: ({ params, prefs }) => {
    const size = leadingNumber(params)
    if (!size) return null
    return [
      ...digitKeys(size),
      clearKey(),
      marksKey(),
      ...preferKeys(prefs, [PENCIL_HIGHLIGHT, LOOK]),
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
