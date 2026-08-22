// Net:旋转管道拼出连通网络。上游 net.c。
// current_key_label 不查自己的可见性标志(net.c:2124 只看锁定),所以光标可见性
// 由宿主镜像;能唤醒光标的键抄自 interpret_move 键盘那半边(方向、确认、ASDF)。
// 触摸长按借中键:上游触摸右键(MOD_STYLUS)是锁定,而这个前端发不出 MOD_STYLUS,
// 中键的锁定与之等价(net.c:2300)。
import type { Field, Game, Span } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
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

// 下界 3:宽或高**恰好等于 2** 会把主线程冻住,任何开关下都会。new_game_desc 有
// 两个无界循环——唯一性那个(net.c:1343)和洗牌那个(net.c:1454,不看 unique,
// 要求初始局面无闭环)。闭环最少要一个 2×2 的圈:1 宽形不成,≥3 宽有横向余量修得掉,
// 只有 2 宽两头堵死,干净洗牌的概率随另一边变长而塌。实测(每档 6 次)2×3 零次卡死、
// 2×12 两次、2×20 四次,而 1×60 和 3×60 在开关两态下都是零次。
// 上游只禁了「环绕+唯一解」那一种(net.c:390,附了证明),另外两种它不禁,照样空转。
// 1 是安全的,但 1×N 是一列直管、没有推理内容,不值为它多写两条规则。
// 上界 50:桌面 1440×900 上每格 15.7 px、生成 70 ms;再大手机侧就只剩个位数像素。
const size = (): Span => ({ min: 3, max: 50 })

// 墙数是概率乘候选数((w−1)(h−1)),严格线性;按百分比分档是上游自己的做法
// (bridges 的两个同类参数就是离散百分比)。
const fields: readonly Field[] = [
  { at: WIDTH, label: 'Width', span: size },
  { at: HEIGHT, label: 'Height', span: size },
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
