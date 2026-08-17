// Singles:涂黑去重。上游 singles.c。涂黑、画圈全从标签解出来,一个字节不记;
// 圈 ↔ 黑一按到位:对方词在场时先按对方语义顶掉再落自己(twice),撤销要两次。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['Black', 'Circle', 'Restore', 'Remove']

const singles: Game = {
  id: 'singles',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [3, 4, 5, 6], paper: true },
  pages: samePages('singles'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'black',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'black', word: 'blackSquare' },
        words: WORDS,
        does: 'Black',
        instead: 'Restore',
        twice: true,
      }),
      act({
        id: 'circle',
        slot: 6,
        key: ' ',
        idle: { glyph: 'circleSquare', word: 'circle' },
        words: WORDS,
        does: 'Circle',
        instead: 'Remove',
        twice: true,
      }),
    ],
  },
  observe: still,
}

export default singles
