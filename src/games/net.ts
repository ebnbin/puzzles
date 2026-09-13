// Net:旋转管道拼出连通网络。上游 net.c。
// current_key_label 不查自己的可见性标志(net.c:2124 只看锁定),所以光标可见性
// 由宿主镜像;能唤醒光标的键抄自 interpret_move 键盘那半边(方向、确认、ASDF)。
// 触摸长按借中键:上游触摸右键(MOD_STYLUS)是锁定,而这个前端发不出 MOD_STYLUS,
// 中键的锁定与之等价(net.c:2300)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import type { Read } from './util/params'
import { jumbleKey, preferKeys } from './util/keys'
import { act, cross } from './util/pad'
import { float, int } from './util/params'

// 可选值全部列出,不是规则:奇数边电源才在正中(上游十条预设全是奇数);上限 49 是
// 可读性定的(笔记本上 15 px 一格),生成本身对尺寸是线性的。3 起:1×1 上游不收,
// 环绕 + 唯一解时 2 不收(net.c:324、376),都在表外。
const SIDES = [
  3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49,
]
const BARRIERS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]

// 长边不超过短边的两倍。
const fits = (a: number, b: number) => a <= 2 * b && b <= 2 * a
const beside = (other: number) => {
  const list = SIDES.filter((s) => fits(s, other))
  return list.length ? list : SIDES
}

// 墙数 = (int)(概率 × 候选边数),候选边是解上没走线的边:不环绕 (w−1)(h−1),环绕 wh+1
// (net.c:1512-1534)。上游是 float 乘法,这里也按 float 算,否则 0.7 × 10 会差一堵。
const walls = (p: number, r: Read) => {
  const w = r.int('Width')
  const h = r.int('Height')
  const candidates = r.flag('Walls wrap around') ? w * h + 1 : (w - 1) * (h - 1)
  return Math.trunc(Math.fround(Math.fround(p) * candidates))
}

const LOOPS: Prefer = {
  kind: 'flag',
  label: 'Highlight loops involving unlocked squares',
  glyph: 'loopWarn',
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
  types: {
    menu: verbatim,
    params: [
      // 宽高互锁:每根滑块只列和对方当前值搭得上的档,谁都不会自己动;对方的值在表外
      // (Game ID 带进来的)时给全表,好把它拉回来。落定先宽后高,一趟必落在合法组合上。
      int('Width', (r) => beside(r.int('Height'))),
      int('Height', (r) => beside(r.int('Width'))),
      float('Barrier probability', 1, () => [...BARRIERS], {
        show: (p) => `${Math.round(p * 100)}%`,
        note: (p, r) => `${walls(p, r)} walls`,
      }),
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
