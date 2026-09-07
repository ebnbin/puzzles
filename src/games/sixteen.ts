// Sixteen:整行整列循环滑动。上游 sixteen.c。
// 光标可以停在棋盘外一圈,还有 lock_tile / lock_position 两档模式
// (sixteen.c:566)。锁上任一档之后方向键推的是整行整列,图标和读法都换一套
// ——从标签里的 Unlock 读出「锁着」,不自己记模式。
import type { ArrowKey, Game, Slot } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Way } from './util/pad'
import { PUSH, act, arrowFace, walk } from './util/pad'
import { int, range } from './util/params'

const WORDS = ['Slide', 'Back', 'Lock tile', 'Lock pos', 'Unlock']

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
      // 宽高 50:格子里要写编号,字号是格边的 1/3(sixteen.c:889),50×50 在
      // 2560×1440 上是每格 24 px、字号 8 px,四位数刚好读得出来。
      int('Width', () => range(2, 50)),
      int('Height', () => range(2, 50)),
      // 打乱步数 100:它的用途是「数出这几步再倒回去」,不是打乱——真要打乱用 0
      // (完全随机,也是默认和全部预设的取值)。100 远超人数得过来的量级。
      int('Number of shuffling moves', () => range(0, 100)),
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
