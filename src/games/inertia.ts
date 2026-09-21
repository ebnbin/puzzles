// Inertia:滑到底收宝石避地雷。上游 inertia.c。唯一走八方的:斜向借小键盘
// 的 7/9/1/3(inertia.c 认 MOD_NUM_KEYPAD 的方位数字),中间那格留给「重放
// 求解器下一步」,按过求解才出现(第二层)。没有键盘光标,方向键即走子。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, layerByWords, step } from './util/pad'

const WORDS = ['Advance']

// validate_params inertia.c:208-219:宽高各 ≥ 2,面积 ≥ 6(宝石数是面积的五分之一,至少
// 得有一颗);INT_MAX 那条在 100 以内碰不到。
const custom: Custom = {
  fields: [width(2), height(2)],
  rules: [rule('inertia.c:219', ['w', 'h'], (v) => v.w * v.h < 6)],
}

const inertia: Game = {
  id: 'inertia',
  upstream: { labels: 'live', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('inertia'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    layer: layerByWords(WORDS, ['Advance']),
    keys: [
      step('downLeft', 1), step('down', 2), step('downRight', 3),
      step('left', 4), step('right', 6),
      step('upLeft', 7), step('up', 8), step('upRight', 9),
      act({
        id: 'advance',
        slot: 5,
        key: 'Enter',
        layer: 2,
        idle: { glyph: 'advance', word: 'advance' },
        words: WORDS,
        faces: { Advance: { glyph: 'advance', word: 'advance' } },
      }),
    ],
  },
  observe: still,
}

export default inertia
