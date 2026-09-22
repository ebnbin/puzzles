// Twiddle:旋转子方阵复原。上游 twiddle.c。
// a-d 转四角、小键盘转九宫定位块都是快捷方式(碰棋盘就能做到),不设按钮。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { BOARD_MAX, height, rule, shuffles, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params twiddle.c:212-225,不看 full:旋转块 ≥ 2,宽高都不小于旋转块(相等
// 允许,整盘一块是上游特判过的合法情形),打乱步数 ≥ 0(0 = 随机,twiddle.c:338)。
// 宽高的下限 2 是经旋转块传出来的。旋转块在计数层:缩小棋盘时它跟着缩,它自己只能在
// min(宽, 高) 以内滑。INT_MAX 那条(220)在 100 以内碰不到。
const custom: Custom<'twiddle'> = {
  fields: [
    width(2),
    height(2),
    { kind: 'int', key: 'n', word: 'block', min: 2, max: BOARD_MAX, role: 'count' },
    { kind: 'flag', key: 'rowsonly', word: 'rowsOnly' },
    { kind: 'flag', key: 'orientable', word: 'orientable' },
    shuffles(),
  ],
  rules: [
    rule('twiddle.c:216', ['w', 'n'], (v) => v.w < v.n),
    rule('twiddle.c:218', ['h', 'n'], (v) => v.h < v.n),
  ],
}

const twiddle: Game<'twiddle'> = {
  id: 'twiddle',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 4], [3, 5], [6, 7]] },
  pages: samePages('twiddle'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'left', slot: 4, key: 'Enter', idle: { glyph: 'turnLeft', word: 'turnLeft' } }),
      act({ id: 'right', slot: 6, key: ' ', idle: { glyph: 'turnRight', word: 'turnRight' } }),
    ],
  },
  observe: still,
}

export default twiddle
