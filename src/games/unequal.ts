// Unequal:带大小关系的拉丁方(含 Adjacent 变体)。上游 unequal.c。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, rule } from './util/custom'
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

// validate_params unequal.c:268-277:阶数 3..32;相邻模式下 Tricky 起的难度要阶数 ≥ 5。
// 试够次数还造不出指定难度时上游自己降一档(unequal.c:1255),是降级不是失败。
const ADJACENT = 1
const SET = 2
const custom: Custom<'unequal'> = {
  fields: [
    { kind: 'pick', key: 'mode', word: 'mode', options: ['unequalMode', 'adjacent'] },
    { kind: 'int', key: 'order', word: 'order', min: 3, max: 32, role: 'dim' },
    difficulty(['trivial', 'easy', 'tricky', 'extreme', 'recursive']),
  ],
  rules: [rule('unequal.c:273', ['order', 'mode', 'diff'], (v) => v.order < 5 && v.mode === ADJACENT && v.diff >= SET)],
}

const unequal: Game<'unequal'> = {
  id: 'unequal',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('unequal'),
  types: { menu: verbatim, custom },
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
