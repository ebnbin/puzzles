// Sixteen:整行整列循环滑动。上游 sixteen.c。
// 光标可以停在棋盘外一圈,还有 lock_tile / lock_position 两档模式
// (sixteen.c:566)。锁上任一档之后方向键推的是整行整列,图标和读法都换一套
// ——从标签里的 Unlock 读出「锁着」,不自己记模式。
import type { ArrowKey, Game, Slot } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Way } from './util/pad'
import { PUSH, act, arrowFace, walk } from './util/pad'
import { gate, int } from './util/params'

const WORDS = ['Slide', 'Back', 'Lock tile', 'Lock pos', 'Unlock']

const SIDES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const MOVES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
]
// 宽高互推:两根滑块的档位都是全表,动了一根另一根若配不上就被推到最近的合法档;对方在
// 表外(Game ID 带进来的)时给全表,好把它拉回来。
const fits = (a: number, b: number) => a <= 4 * b && b <= 4 * a && a * b >= 6
const beside = (other: number) => {
  const list = SIDES.filter((s) => fits(s, other))
  return list.length ? list : SIDES
}

const shove = (dir: Way, slot: Slot): ArrowKey<null> => ({
  id: dir,
  slot,
  moves: true,
  face: (view) =>
    view.labels.enter === 'Unlock' || view.labels.space === 'Unlock'
      ? { art: { glyph: PUSH[dir] }, says: view.words.arrows.shove[dir] }
      : arrowFace(view, dir),
  press: (board) => walk(board, dir),
})

const sixteen: Game = {
  id: 'sixteen',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('sixteen'),
  types: {
    menu: verbatim,
    params: [
      // 可选值全部列出,不是规则。宽高同 Fifteen:上游只要求 ≥ 2,16 是设计定的上限;
      // 配对:长边 ≤ 短边 4 倍,面积 ≥ 6。
      int('Width', () => SIDES, { within: (r) => beside(r.int('Height')) }),
      int('Height', () => SIDES, { within: (r) => beside(r.int('Width')) }),
      // 打乱步数 0 是完全随机(默认、全部预设);N > 0 只从已解状态走 N 步,玩法是倒推回去。
      // 上限 w+h:再多目标就名存实亡(3×3 到 6 步时最优解还等于 N 的只剩一半)。0 与非 0
      // 用「限定打乱步数」这扇门切换,打开时写 1。
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
      shove('left', 1), shove('down', 2), shove('right', 3), shove('up', 5),
      act({
        id: 'tile',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'lockTile', word: 'carryTile' },
        words: WORDS,
        faces: {
          'Lock tile': { glyph: 'lockTile', word: 'carryTile' },
          Unlock: { glyph: 'lockTileOn', word: 'carryTile', on: true },
          Slide: { glyph: 'primary', word: 'pushLine' },
        },
      }),
      act({
        id: 'place',
        slot: 6,
        key: ' ',
        idle: { glyph: 'lockPlace', word: 'holdPlace' },
        words: WORDS,
        faces: {
          'Lock pos': { glyph: 'lockPlace', word: 'holdPlace' },
          Unlock: { glyph: 'lockPlaceOn', word: 'holdPlace', on: true },
          Back: { glyph: 'secondary', word: 'pullLine' },
        },
      }),
    ],
  },
  observe: still,
}

export default sixteen
