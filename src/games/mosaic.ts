// Mosaic:数字提示的马赛克。上游 mosaic.c。黑、白两个开关和 unruly 逐字同一套;
// 解完之后两个一起灰(上游自己不报了)。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params mosaic.c:240-249:宽高各 ≥ 3,面积不超过 10000 格(100×100 正好够)。
// 生成是解不出就重来的概率重试。
const custom: Custom<'mosaic'> = {
  fields: [
    height(3, 'height'),
    width(3, 'width'),
    { kind: 'flag', key: 'aggressive', word: 'aggressive' },
  ],
  rules: [rule('mosaic.c:245', ['width', 'height'], (v) => v.height > Math.floor(10000 / v.width))],
}

const mosaic: Game<'mosaic'> = {
  id: 'mosaic',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [3, 4, 5] },
  pages: samePages('mosaic'),
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

export default mosaic
