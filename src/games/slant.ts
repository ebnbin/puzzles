// Slant:斜线成环禁。上游 slant.c。\ / ⌫ 是上游自己的绝对键,各发自己那个键;循环键不给按钮。
// 光标没显示时三个一起灰(标签两词俱空)。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { act, cross } from './util/pad'

const FADE: Prefer<'slant'> = { kind: 'flag', kw: 'fade-grounded', glyph: 'fadeSlant' }

// validate_params slant.c:229-244,不看 full:宽高各 ≥ 2。
const custom: Custom<'slant'> = {
  fields: [width(2), height(2), difficulty(['easy', 'hard'])],
  rules: [],
}

const slant: Game<'slant'> = {
  id: 'slant',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('slant'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: (deal) => preferKeys(deal, [FADE]),
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'backslash', slot: 7, key: '\\', idle: { glyph: 'backslash', word: 'backslash' } }),
      act({ id: 'slash', slot: 8, key: '/', idle: { glyph: 'slash', word: 'slash' } }),
      act({ id: 'blank', slot: 9, key: '\b', idle: { glyph: 'bareSquare', word: 'noLine' } }),
    ],
  },
  observe: still,
}

export default slant
