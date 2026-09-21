// Netslide:整行整列滑动的 Net。上游 netslide.c。
// 两个确认键不分工(netslide.c:1115 只有右键反向),只给一个键;光标在边框
// 上时四个方向键只有两个活,看起来像 bug——上游键盘本来就这样,标签整圈报
// 同一个词,分不出光标在哪条边,没有依据置灰。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, shuffles, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params netslide.c:311-324,不看 full:宽高各 ≥ 2,概率 0..1(%g 显示,0.05
// 步进往返无损),打乱步数 ≥ 0(0 = 默认打乱量 2(w−1)(h−1) 步,netslide.c:575)。没有唯一解开关,所以也没有
// net 那条「回绕时不能是 2」;打乱只避开正中的行列,2×N 也总有可走的一步。INT_MAX
// 那条(315)在 100 以内碰不到。
const custom: Custom = {
  fields: [
    width(2),
    height(2),
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
    shuffles(),
  ],
  rules: [],
}

const netslide: Game = {
  id: 'netslide',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('netslide'),
  types: { menu: verbatim, custom },
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
