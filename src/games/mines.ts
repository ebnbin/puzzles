// Mines:扫雷。上游 mines.c。Enter 开格/连开、Space 插旗/取旗,脸跟着标签换。
// 亮 ≠ 安全:旗插错了 Clear 照样亮,按下去踩雷——风险是这步棋本身的,和点
// 数字完全相同;但记住,一个亮着的按钮比一次点击更像背书。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import type { Read } from './util/params'
import { CAP, int, range } from './util/params'

const WORDS = ['Uncover', 'Clear', 'Mark', 'Unmark']

const area = (r: Read) => r.int('Width') * r.int('Height')

const mines: Game = {
  id: 'mines',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[16, 17]] },
  pages: samePages('mines'),
  types: {
    menu: verbatim,
    params: [
      // 宽高从 4 起。上游只在勾了「Ensure solubility」时要求两维 > 2(mines.c:290),
      // 但 3×3 的面积 9 连一颗雷都放不下(雷数 ≤ 面积 − 9,309),而 3×n 一到高密度,
      // 唯一解那条路修不出来(3×100 撒 30% 的雷跑五分钟也不出)。4 起面积恒 ≥ 16,
      // 两条都不再是问题,高也不用再看宽。
      int('Width', () => range(4, CAP)),
      int('Height', () => range(4, CAP)),
      int('Mines', (r) => range(1, area(r) - 9), (n, r) => `${Math.round((100 * n) / area(r))}%`),
    ],
  },
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
