// Unruly:黑白各半不三连。上游 unruly.c。六个转移每个一按,黑↔白也是,一个
// 字节不记(instead:对方在场时向 Empty 要清空);线索格上一起灰。0/1/2 直接
// 设是快捷方式,不设按钮。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params unruly.c:287-329:宽高都是偶数且 ≥ 6;行列不重复模式下,宽为 2n 时高
// 不超过 A177790[n](长 2n 且不三连的行只有这么多种),反之亦然;INT_MAX 那条在 100
// 以内碰不到。奇数刻度靠规则挡住,slider 松手吸附到相邻的偶数。
const A177790 = [1, 2, 6, 14, 34, 84, 208, 518, 1296, 3254, 8196, 20700, 52404, 132942,
  337878, 860142, 2192902, 5598144, 14308378, 36610970, 93770358, 240390602, 616787116, 1583765724]
const custom: Custom<'unruly'> = {
  fields: [
    width(6, 'w2'),
    height(6, 'h2'),
    { kind: 'flag', key: 'unique', word: 'uniqueRows' },
    difficulty(['trivial', 'easy', 'normal']),
  ],
  rules: [
    rule('unruly.c:289', ['w2'], (v) => v.w2 % 2 !== 0),
    rule('unruly.c:289', ['h2'], (v) => v.h2 % 2 !== 0),
    rule('unruly.c:316', ['h2', 'w2', 'unique'], (v) =>
      !!v.unique && v.w2 < 2 * A177790.length && v.h2 > A177790[v.w2 / 2]),
    rule('unruly.c:320', ['w2', 'h2', 'unique'], (v) =>
      !!v.unique && v.h2 < 2 * A177790.length && v.w2 > A177790[v.h2 / 2]),
  ],
}

const unruly: Game<'unruly'> = {
  id: 'unruly',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [1, 2, 3, 4, 5, 6, 7, 8], relief: [[4, 5], [7, 8]] },
  pages: samePages('unruly'),
  types: { menu: verbatim, custom },
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
        does: 'Black',
        instead: 'Empty',
      }),
      act({
        id: 'white',
        slot: 6,
        key: ' ',
        idle: { glyph: 'white', word: 'whiteSquare' },
        does: 'White',
        instead: 'Empty',
      }),
    ],
  },
  observe: still,
}

export default unruly
