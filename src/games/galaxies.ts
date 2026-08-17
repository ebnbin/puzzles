// Galaxies:点对称星系分割。上游 galaxies.c。Enter 七个词一个键(它的标签
// 不看是哪个键,第二个键会是复制)。提示键走一步显然推理,料在发牌时定死,
// 第一按之后棋盘不再动。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { act, cross } from './util/pad'

const WORDS = ['New arrow', 'Move arrow', 'Place', 'Remove', 'Cancel', 'Edge', 'Clear']

const galaxies: Game = {
  id: 'galaxies',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('galaxies'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'edge',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'edge', word: 'drawEdge' },
        words: WORDS,
        faces: {
          Edge: { glyph: 'edge', word: 'drawEdge' },
          Clear: { glyph: 'noEdge', word: 'clearEdge', on: true },
          'New arrow': { glyph: 'galaxyArrow', word: 'newArrow' },
          'Move arrow': { glyph: 'galaxyArrow', word: 'moveArrow' },
          Place: { glyph: 'done', word: 'dropArrow', on: true },
          Remove: { glyph: 'cancel', word: 'removeArrow', on: true },
          Cancel: { glyph: 'cancel', word: 'cancelArrow', on: true },
        },
      }),
    ],
  },
  observe: still,
}

export default galaxies
