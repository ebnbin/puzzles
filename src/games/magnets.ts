// Magnets:磁铁摆极。上游 magnets.c。Enter 磁极循环 +→−→空,Space 空白骨牌
// →两个问号→空,脸跟着标签换。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['+', '-', 'X', '?', 'Clear']

// validate_params magnets.c:236-250:宽高各 ≥ 2;Tricky 要宽或高至少 5,Easy 要至少 3。
// INT_MAX 那条在 100 以内碰不到。生成是难度不符就重来的概率重试(magnets.c:1719)。
const TRICKY = 1
const custom: Custom<'magnets'> = {
  fields: [
    width(2),
    height(2),
    difficulty(['easy', 'tricky']),
    { kind: 'flag', key: 'stripclues', word: 'stripClues' },
  ],
  rules: [
    rule('magnets.c:243', ['w', 'h', 'diff'], (v) => v.diff >= TRICKY && v.w < 5 && v.h < 5),
    rule('magnets.c:246', ['w', 'h', 'diff'], (v) => v.diff < TRICKY && v.w < 3 && v.h < 3),
  ],
}

const magnets: Game<'magnets'> = {
  id: 'magnets',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('magnets'),
  types: { menu: verbatim, custom },
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
