// Twiddle:旋转子方阵复原。上游 twiddle.c。
// a-d 转四角、小键盘转九宫定位块都是快捷方式(碰棋盘就能做到),不设按钮。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { int, range } from './util/params'

const twiddle: Game = {
  id: 'twiddle',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 4], [3, 5], [6, 7]] },
  pages: samePages('twiddle'),
  types: {
    menu: verbatim,
    params: [
      // 宽高 50:格子里要写编号,字号是格边的 1/3(twiddle.c:1005),和 Fifteen 同一条线。
      int('Width', () => range(2, 50)),
      int('Height', () => range(2, 50)),
      // 块边长只跟上游的 n ≤ min(宽, 高)。顶上那几档很贵:打乱步数为 0(默认)时
      // 上游要走 w·h·n²·2 步、每步 O(n²)(twiddle.c:340),而 n = 宽 = 高 那格还会
      // 整场作废重来(365 关掉了防撤销)。范围是 owner 定的,耗时留到第三轮。
      int('Rotating block size', (r) =>
        range(2, Math.min(r.int('Width'), r.int('Height'))),
      ),
      // 打乱步数同 Sixteen:用途是「数出这几步再倒回去」,真要打乱用 0。
      int('Number of shuffling moves', () => range(0, 100)),
    ],
  },
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
