// Net:旋转管道拼出连通网络。上游 net.c。
// current_key_label 不查自己的可见性标志(net.c:2124 只看锁定),所以光标可见性
// 由宿主镜像;能唤醒光标的键抄自 interpret_move 键盘那半边(方向、确认、ASDF)。
// 触摸长按借中键:上游触摸右键(MOD_STYLUS)是锁定,而这个前端发不出 MOD_STYLUS,
// 中键的锁定与之等价(net.c:2300)。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { jumbleKey, preferKeys } from './util/keys'
import { act, cross } from './util/pad'

const LOOPS: Prefer = {
  kind: 'flag',
  label: 'Highlight loops involving unlocked squares',
  glyph: 'loopWarn',
}

// 自定义参数:validate_params net.c:320-382。宽高 ≥ 1(322);概率 0..1(328-331),
// 上游用 %g 显示,0.05 步进往返无损;INT_MAX 那条(326)在 100 以内碰不到。
const custom: Custom = {
  fields: [
    width(1),
    height(1),
    { kind: 'flag', key: 'wrap', label: 'Walls wrap around', word: 'wrap' },
    {
      kind: 'float',
      key: 'barrier',
      label: 'Barrier probability',
      word: 'barrier',
      min: 0,
      max: 1,
      step: 0.05,
      digits: 2,
    },
    { kind: 'flag', key: 'unique', label: 'Ensure unique solution', word: 'unique' },
  ],
  rules: [
    rule('net.c:324', ['w', 'h'], (v) => v.w <= 1 && v.h <= 1),
    // 回绕且要唯一解时宽或高不能恰好是 2(证明在 net.c:333-375);1 可以。
    rule('net.c:376', ['w', 'wrap', 'unique'], (v) => !!v.unique && !!v.wrap && v.w === 2),
    rule('net.c:376', ['h', 'wrap', 'unique'], (v) => !!v.unique && !!v.wrap && v.h === 2),
  ],
}

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
  types: { menu: verbatim, custom },
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
