// Keen:算式笼子的拉丁方。上游 keen.c。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty } from './util/custom'
import { keepPencil, samePages, verbatim } from './util/declare'
import {
  PENCIL_HIGHLIGHT,
  clearKey,
  digitKeys,
  leadingNumber,
  marksKey,
  preferKeys,
} from './util/keys'
import { act, cross } from './util/pad'

// validate_params keen.c:225-232:网格 3..9。
const custom: Custom<'keen'> = {
  fields: [
    { kind: 'int', key: 'w', word: 'gridSize', min: 3, max: 9, role: 'dim' },
    difficulty(['easy', 'normal', 'hard', 'extreme', 'unreasonable']),
    { kind: 'flag', key: 'multiplication_only', word: 'multiplyOnly' },
  ],
  rules: [],
}

const keen: Game<'keen'> = {
  id: 'keen',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('keen'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false, defaults: keepPencil },
  keypad: (deal) => {
    const { params } = deal
    const size = leadingNumber(params)
    if (!size) return null
    return [
      ...digitKeys(size),
      clearKey(),
      marksKey(),
      ...preferKeys(deal, [PENCIL_HIGHLIGHT]),
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
