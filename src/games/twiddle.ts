// Twiddle:旋转子方阵复原。上游 twiddle.c。
// a-d 转四角、小键盘转九宫定位块都是快捷方式(碰棋盘就能做到),不设按钮。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const twiddle: Game = {
  id: 'twiddle',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 4], [3, 5], [6, 7]] },
  pages: samePages('twiddle'),
  types: { menu: verbatim },
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
