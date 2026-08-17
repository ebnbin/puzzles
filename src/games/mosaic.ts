// Mosaic:数字提示的马赛克。上游 mosaic.c。黑、白两个开关和 unruly 逐字同一套;
// 解完之后两个一起灰(上游自己不报了)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['Black', 'White', 'Empty']

const mosaic: Game = {
  id: 'mosaic',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [3, 4, 5] },
  pages: samePages('mosaic'),
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

export default mosaic
