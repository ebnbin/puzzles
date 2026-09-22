// Sixteen:整行整列循环滑动。上游 sixteen.c。
// 光标可以停在棋盘外一圈,还有 lock_tile / lock_position 两档模式
// (sixteen.c:564)。锁上任一档之后方向键推的是整行整列,图标和读法都换一套
// ——从标签里的 Unlock 读出「锁着」,不自己记模式。
import type { ArrowKey, Game, Slot } from './game'
import { still } from './game'
import { height, shuffles, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Way } from './util/pad'
import { PUSH, act, arrowFace, walk } from './util/pad'

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

const sixteen: Game<'sixteen'> = {
  id: 'sixteen',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('sixteen'),
  // validate_params sixteen.c:177-186,不看 full:宽高各 ≥ 2,打乱步数 ≥ 0(0 = 随机
  // 打乱,sixteen.c:216);INT_MAX 那条在 100 以内碰不到。三者之间没有联动。
  types: {
    menu: verbatim,
    custom: { fields: [width(2), height(2), shuffles()], rules: [] },
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
