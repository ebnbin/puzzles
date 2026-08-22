// Sixteen:整行整列循环滑动。上游 sixteen.c。
// 光标可以停在棋盘外一圈,还有 lock_tile / lock_position 两档模式
// (sixteen.c:566)。锁上任一档之后方向键推的是整行整列,图标和读法都换一套
// ——从标签里的 Unlock 读出「锁着」,不自己记模式。
import type { ArrowKey, Field, Game, Slot, Span } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Way } from './util/pad'
import { PUSH, act, arrowFace, walk } from './util/pad'
import { SQUARE_MAX } from './util/fields'

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

// game_configure 的下标(sixteen.c:138)。三条界互不相干:上游只要求两边 ≥ 2、
// w×h 不溢出、洗牌步数 ≥ 0(sixteen.c:177)。
const WIDTH = 0
const HEIGHT = 1
const SHUFFLE = 2

const size = (): Span => ({ min: 2, max: SQUARE_MAX })

// 洗牌步数是**标准杆**,不是难度百分比:填了它状态栏就显示「Moves: k (target n)」,
// 玩家对着那个数打。0 是上游默认(五个预设全是 0),含义是**完全随机**而不是
// 「不打乱」——两条生成路径完全不同(sixteen.c:216)。
// 这个参数只出现在 sixteen / twiddle / netslide 三家,共同点是没有难度枚举、
// solve_game 只返回 "S" 直接摆好:求解器评不了难度,于是「洗几步」就是唯一的旋钮。
// 上界 50 是玩法判断,不是性能判断——杆数要人去数,而且上游自己说洗得越多
// 「(target n)」越可能是假话(实际存在更短的解)。生成不要钱:实测 50×50 洗
// 一千万步也只 164 ms,完全随机那条路(O(n²) 的 perm_parity)100×100 才 210 ms。
const shuffle = (): Span => ({ min: 0, max: 50 })

const fields: readonly Field[] = [
  { at: WIDTH, label: 'Width', span: size },
  { at: HEIGHT, label: 'Height', span: size },
  { at: SHUFFLE, label: 'Number of shuffling moves', span: shuffle },
]

const sixteen: Game = {
  id: 'sixteen',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('sixteen'),
  types: { menu: verbatim },
  fields,
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
