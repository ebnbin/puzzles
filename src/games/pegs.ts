// Pegs:单人跳棋。上游 pegs.c。Enter 选中一颗(给方向键上膛,跳跃是下一次
// 方向键),上了膛换成叉。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['Select', 'Cancel']

const pegs: Game = {
  id: 'pegs',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[1, 2]] },
  pages: samePages('pegs'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'jump',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'jump', word: 'jump' },
        words: WORDS,
        faces: {
          Select: { glyph: 'jump', word: 'jump' },
          Cancel: { glyph: 'cancel', word: 'unjump', on: true },
        },
      }),
    ],
  },
  observe: still,
}

export default pegs
