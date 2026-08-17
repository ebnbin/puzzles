// Unruly:黑白各半不三连。上游 unruly.c。六个转移每个一按,黑↔白也是,一个
// 字节不记(instead:对方在场时向 Empty 要清空);线索格上一起灰。0/1/2 直接
// 设是快捷方式,不设按钮。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['Black', 'White', 'Empty']

const unruly: Game = {
  id: 'unruly',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [1, 2, 3, 4, 5, 6, 7, 8], relief: [[4, 5], [7, 8]] },
  pages: samePages('unruly'),
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
        instead: 'Empty',
      }),
      act({
        id: 'white',
        slot: 6,
        key: ' ',
        idle: { glyph: 'white', word: 'whiteSquare' },
        words: WORDS,
        does: 'White',
        instead: 'Empty',
      }),
    ],
  },
  observe: still,
}

export default unruly
