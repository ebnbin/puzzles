// Net:旋转管道拼出连通网络。上游 net.c。
// current_key_label 不查自己的可见性标志(net.c:2124 只看锁定),所以光标可见性
// 由宿主镜像;能唤醒光标的键抄自 interpret_move 键盘那半边(方向、确认、ASDF)。
// 触摸长按借中键:上游触摸右键(MOD_STYLUS)是锁定,而这个前端发不出 MOD_STYLUS,
// 中键的锁定与之等价(net.c:2300)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { jumbleKey, preferKeys } from './util/keys'
import { act, cross } from './util/pad'
import type { Read } from './util/params'
import { CAP, float, int, range, steps, without } from './util/params'

const LOOPS: Prefer = {
  kind: 'flag',
  label: 'Highlight loops involving unlocked squares',
  glyph: 'loopWarn',
}

// 上游 net.c:322-378:1×1 不行;wrap 且 unique 时宽或高都不能是 2。
const noTwo = (r: Read) => r.flag('Walls wrap around') && r.flag('Ensure unique solution')

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
  types: {
    menu: verbatim,
    params: [
      int('Width', (r) => (noTwo(r) ? without(range(1, CAP), 2) : range(1, CAP))),
      int('Height', (r) => {
        const list = range(r.int('Width') === 1 ? 2 : 1, CAP)
        return noTwo(r) ? without(list, 2) : list
      }),
      float('Barrier probability', 2, () => steps(0, 1, 0.01, 2)),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
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
