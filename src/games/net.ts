// Net:旋转管道拼出连通网络。上游 net.c。
// current_key_label 不查自己的可见性标志(net.c:2124 只看锁定),所以光标可见性
// 由宿主镜像;能唤醒光标的键抄自 interpret_move 键盘那半边(方向、确认、ASDF)。
// 触摸长按借中键:上游触摸右键(MOD_STYLUS)是锁定,而这个前端发不出 MOD_STYLUS,
// 中键的锁定与之等价(net.c:2300)。
import type { Field, Game, Span } from './game'
import { still } from './game'
import type { DialogControl } from '../engine/types'
import { samePages, verbatim } from './util/declare'
import { flagAt, numberAt } from './util/fields'
import type { Prefer } from './util/keys'
import { jumbleKey, preferKeys } from './util/keys'
import { act, cross } from './util/pad'

const LOOPS: Prefer = {
  kind: 'flag',
  label: 'Highlight loops involving unlocked squares',
  glyph: 'loopWarn',
}

// game_configure 的下标(net.c:271)。
const WIDTH = 0
const HEIGHT = 1
const BARRIER = 3
const UNIQUE = 4

// 宽和高的界互相牵制,两条禁令:
//   「不能都 ≤1」(net.c:322)——只堵掉 1×1,所以对方是 1 时自己至少 2;
//   宽或高等于 2 而唯一解开着——2 夹在 1 和 3 中间,是个洞。上游只在**环绕**时
//   禁它(net.c:390,那种情形能证明无解);非环绕它不禁,但生成器一样收敛不了,
//   会在 goto begin_generation 里空转、把主线程冻住(实测 2×10 六次卡死四次,
//   3×10 零次,2 宽关掉唯一解零次)。所以这里按「唯一解」整个禁掉,比上游宽。
const size =
  (other: number) =>
  (controls: readonly DialogControl[]): Span => ({
    min: numberAt(controls, other) <= 1 ? 2 : 1,
    max: 100,
    ...(flagAt(controls, UNIQUE) ? { skip: [2] } : {}),
  })

// 墙数是概率乘候选数((w−1)(h−1)),严格线性;按百分比分档是上游自己的做法
// (bridges 的两个同类参数就是离散百分比)。
const fields: readonly Field[] = [
  { at: WIDTH, label: 'Width', span: size(HEIGHT) },
  { at: HEIGHT, label: 'Height', span: size(WIDTH) },
  {
    at: BARRIER,
    label: 'Barrier probability',
    percent: true,
    decimals: 2,
    span: () => ({ min: 0, max: 1, step: 0.05 }),
  },
]

const net: Game = {
  id: 'net',
  upstream: {
    labels: 'live',
    cursor: {
      kind: 'mirrored',
      wakes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
              'Enter', ' ', 'a', 's', 'd', 'f', 'A', 'S', 'D', 'F'],
    },
  },
  touch: { hold: 'middle' },
  dark: {},
  pages: samePages('net'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  fields,
  // J 重排没有鼠标入口(net.c:2331),是这里唯一够不着的键。
  keypad: ({ prefs }) => [jumbleKey(), ...preferKeys(prefs, [LOOPS])],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'rotate', slot: 4, key: 'Enter', idle: { glyph: 'rotate', word: 'rotateLeft' } }),
      act({ id: 'lock', slot: 6, key: ' ', idle: { glyph: 'lock', word: 'lock' } }),
    ],
  },
  observe: still,
}

export default net
