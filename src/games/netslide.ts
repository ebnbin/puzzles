// Netslide:整行整列滑动的 Net。上游 netslide.c。
// 两个确认键不分工(netslide.c:1115 只有右键反向),只给一个键;光标在边框
// 上时四个方向键只有两个活,看起来像 bug——上游键盘本来就这样,标签整圈报
// 同一个词,分不出光标在哪条边,没有依据置灰。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { float, gate, int } from './util/params'

const SIDES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const BARRIERS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
const MOVES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
]
// 宽高互推:两根滑块的档位都是全表,动了一根另一根若配不上就被推到最近的合法档;对方在
// 表外(Game ID 带进来的)时给全表,好把它拉回来。
const fits = (a: number, b: number) => a <= 4 * b && b <= 4 * a && a * b >= 6
const beside = (other: number) => {
  const list = SIDES.filter((s) => fits(s, other))
  return list.length ? list : SIDES
}

const netslide: Game = {
  id: 'netslide',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('netslide'),
  types: {
    menu: verbatim,
    params: [
      // 可选值全部列出,不是规则。宽高同 Sixteen(同一套滑动):上游只要求 ≥ 2,16 是设计定的上限;
      // 配对:长边 ≤ 短边 4 倍,面积 ≥ 6。
      int('Width', () => SIDES, { within: (r) => beside(r.int('Height')) }),
      int('Height', () => SIDES, { within: (r) => beside(r.int('Width')) }),
      float('Barrier probability', 1, () => BARRIERS, {
        show: (p) => `${Math.round(p * 100)}%`,
      }),
      // 打乱步数上限 = 能滑的行列数 (w−1)+(h−1):中心那一行一列钉死(netslide.c:1097),原则同
      // Sixteen 的 w+h。0 与非 0 用「限定打乱步数」这扇门切换,打开时写 1。
      int('Number of shuffling moves', (r) =>
        MOVES.filter((n) => n <= r.int('Width') + r.int('Height') - 2),
      ),
      gate('Number of shuffling moves', { off: 0, on: 1, word: 'limitShuffle' }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'slide', slot: 4, key: 'Enter', idle: { glyph: 'primary', word: 'slide' } }),
    ],
  },
  observe: still,
}

export default netslide
