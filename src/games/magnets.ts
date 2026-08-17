// Magnets:磁铁摆极。上游 magnets.c。Enter 磁极循环 +→−→空,Space 空白骨牌
// →两个问号→空,脸跟着标签换。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['+', '-', 'X', '?', 'Clear']

const magnets: Game = {
  id: 'magnets',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('magnets'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'pole',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'plusSquare', word: 'plus' },
        words: WORDS,
        faces: {
          '+': { glyph: 'plusSquare', word: 'plus' },
          '-': { glyph: 'minusSquare', word: 'minus' },
          Clear: { glyph: 'emptyCell', word: 'clearSquare' },
        },
      }),
      act({
        id: 'blank',
        slot: 6,
        key: ' ',
        idle: { glyph: 'crossSquare', word: 'blankDomino' },
        words: WORDS,
        faces: {
          X: { glyph: 'crossSquare', word: 'blankDomino' },
          '?': { glyph: 'questionSquare', word: 'notBlankDomino' },
          Clear: { glyph: 'emptyCell', word: 'clearSquare' },
        },
      }),
    ],
  },
  observe: still,
}

export default magnets
