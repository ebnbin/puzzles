// Range:涂黑限视野。上游 range.c。涂黑、打点三态三对不同词,全从标签解出来;
// 线索格上一起灰(两词俱空)。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { act, cross } from './util/pad'

const WORDS = ['Fill', 'Dot', 'Empty']

// validate_params range.c:918-932:宽高各 ≥ 1;宽加高不超过 128(线索存在 signed char
// 里,range.c:923),100 封顶下仍碰得到;full 下 1×1、1×2、2×1、2×2 造不出来。生成是
// 去线索失败就重来的概率重试。
const custom: Custom<'range'> = {
  fields: [width(1), height(1)],
  rules: [
    rule('range.c:923', ['w', 'h'], (v) => v.w > 127 - (v.h - 1)),
    rule('range.c:927', ['w', 'h'], (v) => v.w <= 2 && v.h <= 2),
  ],
}

const range: Game<'range'> = {
  id: 'range',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [1], paper: true },
  pages: samePages('range'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'fill',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'black', word: 'fillSquare' },
        words: WORDS,
        does: 'Fill',
        instead: 'Empty',
      }),
      act({
        id: 'dot',
        slot: 6,
        key: ' ',
        idle: { glyph: 'dotSquare', word: 'dotSquare' },
        words: WORDS,
        does: 'Dot',
        instead: 'Empty',
      }),
    ],
  },
  observe: still,
}

export default range
