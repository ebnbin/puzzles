// Slant:斜线成环禁。上游 slant.c。\ / ⌫ 是上游自己的绝对键(slant.c 直接认
// 这三个字面),各发自己那个键;循环键不再给按钮。光标没显示时三个一起灰
// (标签两词俱空)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const slant: Game = {
  id: 'slant',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('slant'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
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
