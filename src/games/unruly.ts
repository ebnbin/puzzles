// Unruly:黑白各半不三连。上游 unruly.c。六个转移每个一按,黑↔白也是,一个
// 字节不记(instead:对方在场时向 Empty 要清空);线索格上一起灰。0/1/2 直接
// 设是快捷方式,不设按钮。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { CAP, evens, int } from './util/params'

const WORDS = ['Black', 'White', 'Empty']

// unique 模式下的封顶表 A177790(unruly.c:296-323):宽 2n 时高不超过 A[n],反之亦然;
// 表外的宽度不设限。
const A177790 = [
  1, 2, 6, 14, 34, 84, 208, 518, 1296, 3254, 8196, 20700, 52404, 132942, 337878,
  860142, 2192902, 5598144, 14308378, 36610970, 93770358, 240390602, 616787116,
  1583765724,
]
const fits = (a: number, b: number) => a >= 2 * A177790.length || b <= A177790[a / 2]

const unruly: Game = {
  id: 'unruly',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [1, 2, 3, 4, 5, 6, 7, 8], relief: [[4, 5], [7, 8]] },
  pages: samePages('unruly'),
  types: {
    menu: verbatim,
    params: [
      int('Width', () => evens(6, CAP)),
      int('Height', (r) => {
        const w = r.int('Width')
        const unique = r.flag('Unique rows and columns')
        return evens(6, CAP).filter((h) => !unique || (fits(w, h) && fits(h, w)))
      }),
    ],
  },
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
