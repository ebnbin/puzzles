// Light Up:放灯照亮全盘。上游 lightup.c。放灯、打叉是上游自己的绝对键;
// 对方的记号上一按替换(先发对方的键擦掉再落自己)。第二下必然落得下:能挡它
// 的只有黑格,而黑格上邻居一个字不报。黑格上两个一起灰。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { act, cross } from './util/pad'

const LIT_BLOBS: Prefer<'lightup'> = { kind: 'flag', kw: 'show-lit-blobs', glyph: 'litBlob' }

// validate_params lightup.c:355-376:宽高 ≥ 2;full 下黑格百分比 5..100(362),4 重旋转
// 只许正方形(365-367),4 重对称宽高至少一维 ≥ 3(368)。INT_MAX 那条在 100 以内碰不到。
// 百分比只是提示,生成器造不出来会每 20 次加 5,加到 90 为止(lightup.c:1609);难度是
// 等到低一档解法解不动为止的重试(1595-1601)。
const ROT4 = 4
const REF4 = 3
const custom: Custom<'lightup'> = {
  fields: [
    width(2),
    height(2),
    { kind: 'int', key: 'blackpc', word: 'blackPc', min: 5, max: 100, role: 'count', suffix: '%' },
    {
      kind: 'pick',
      key: 'symm',
      word: 'symmetry',
      options: ['none', 'mirror2', 'rotational2', 'mirror4', 'rotational4'],
    },
    difficulty(['easy', 'tricky', 'hard'], 'difficulty'),
  ],
  rules: [
    rule('lightup.c:365', ['w', 'h', 'symm'], (v) => v.symm === ROT4 && v.w !== v.h),
    rule('lightup.c:368', ['w', 'h', 'symm'], (v) => (v.symm === ROT4 || v.symm === REF4) && v.w < 3 && v.h < 3),
  ],
}

const lightup: Game<'lightup'> = {
  id: 'lightup',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [2, 3], paper: true },
  pages: samePages('lightup'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: (deal) => preferKeys(deal, [LIT_BLOBS]),
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'light',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'lamp', word: 'light' },
        faces: {
          Light: { glyph: 'lamp', word: 'light' },
          Clear: { glyph: 'lamp', word: 'unlight', on: true },
        },
        replaces: 'Clear',
      }),
      act({
        id: 'mark',
        slot: 6,
        key: ' ',
        idle: { glyph: 'dotSquare', word: 'cannot' },
        faces: {
          Mark: { glyph: 'dotSquare', word: 'cannot' },
          Clear: { glyph: 'dotSquare', word: 'uncannot', on: true },
        },
        replaces: 'Clear',
      }),
    ],
  },
  observe: still,
}

export default lightup
