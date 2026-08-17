// Mines:扫雷。上游 mines.c。Enter 开格/连开、Space 插旗/取旗,脸跟着标签换。
// 亮 ≠ 安全:旗插错了 Clear 照样亮,按下去踩雷——风险是这步棋本身的,和点
// 数字完全相同;但记住,一个亮着的按钮比一次点击更像背书。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['Uncover', 'Clear', 'Mark', 'Unmark']

const mines: Game = {
  id: 'mines',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[16, 17]] },
  pages: samePages('mines'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'uncover',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'uncover', word: 'uncover' },
        words: WORDS,
        faces: {
          Uncover: { glyph: 'uncover', word: 'uncover' },
          Clear: { glyph: 'chord', word: 'chord' },
        },
      }),
      act({
        id: 'flag',
        slot: 6,
        key: ' ',
        idle: { glyph: 'flag', word: 'flag' },
        words: WORDS,
        faces: {
          Mark: { glyph: 'flag', word: 'flag' },
          Unmark: { glyph: 'flag', word: 'unflag' },
        },
      }),
    ],
  },
  observe: still,
}

export default mines
