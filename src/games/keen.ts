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

// validate_params keen.c:226-233:网格 3..9。3×3 的 Hard 以上上游自己压到 Normal
// (keen.c:936),是降级不是失败;其余是概率重试。
const custom: Custom = {
  fields: [
    { kind: 'int', key: 'w', label: 'Grid size', word: 'gridSize', min: 3, max: 9, role: 'dim' },
    difficulty(['easy', 'normal', 'hard', 'extreme', 'unreasonable']),
    { kind: 'flag', key: 'mult', label: 'Multiplication only', word: 'multiplyOnly' },
  ],
  rules: [],
}

const keen: Game = {
  id: 'keen',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('keen'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false, defaults: keepPencil },
  keypad: ({ params, prefs }) => {
    const size = leadingNumber(params)
    if (!size) return null
    return [
      ...digitKeys(size),
      clearKey(),
      marksKey(),
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

export default keen
