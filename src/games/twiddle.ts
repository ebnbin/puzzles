// Twiddle:旋转子方阵复原。上游 twiddle.c。
// a-d 转四角、小键盘转九宫定位块都是快捷方式(碰棋盘就能做到),不设按钮。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { gate, int } from './util/params'

const SIDES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const BLOCKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const MOVES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
]
// 宽高互推同 Sixteen:两根滑块的档位都是全表,动了一根另一根若配不上就被推到最近的合法档;对方在
// 表外(Game ID 带进来的)时给全表,好把它拉回来。
const fits = (a: number, b: number) => a <= 4 * b && b <= 4 * a && a * b >= 6
const beside = (other: number) => {
  const list = SIDES.filter((s) => fits(s, other))
  return list.length ? list : SIDES
}
// 块边长 2..min(宽, 高),只去掉 n = 宽 = 高:整盘一个旋转位置、四种局面,两步内必解,不成题。
const blocks = (w: number, h: number) =>
  BLOCKS.filter((n) => n <= Math.min(w, h) && !(w === h && n === w))

const twiddle: Game = {
  id: 'twiddle',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 4], [3, 5], [6, 7]] },
  pages: samePages('twiddle'),
  types: {
    menu: verbatim,
    params: [
      // 可选值全部列出,不是规则。宽高同 Fifteen / Sixteen:上游只要求 ≥ n,16 是设计定的上限;
      // 配对:长边 ≤ 短边 4 倍,面积 ≥ 6。
      int('Width', () => SIDES, { within: (r) => beside(r.int('Height')) }),
      int('Height', () => SIDES, { within: (r) => beside(r.int('Width')) }),
      // 上游只要求 2 ≤ n ≤ min(宽, 高)。不另设上限:16×15 配 15 只剩两个位置,可达局面仍是
      // 10^397 量级(docs/params.md)。
      int('Rotating block size', (r) => blocks(r.int('Width'), r.int('Height'))),
      // 打乱步数同 Sixteen:0 是完全随机(默认、全部预设);N > 0 只从已解状态转 N 下,玩法是倒推
      // 回去。上限 w+h;0 与非 0 用「限定打乱步数」这扇门切换,打开时写 1。
      int('Number of shuffling moves', (r) =>
        MOVES.filter((n) => n <= r.int('Width') + r.int('Height')),
      ),
      gate('Number of shuffling moves', { off: 0, on: 1, word: 'limitShuffle' }),
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
