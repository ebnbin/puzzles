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
      // 块边长再封 30:打乱步数为 0(默认)时上游要走 w·h·n²·2 步、每步 O(n²)
      // (twiddle.c:340),50×50 上 n=30 落定 9.5 秒、n=40 已经 22 秒、n=50 是 140 秒。
      int('Rotating block size', (r) =>
        range(2, Math.min(r.int('Width'), r.int('Height'), 30)),
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
