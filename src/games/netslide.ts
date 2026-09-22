// Netslide:整行整列滑动的 Net。上游 netslide.c。两个确认键不分工(netslide.c:1115 只有右键反向),
// 只给一个键;光标在边框上时四个方向键只有两个活,标签整圈同一个词,没有依据置灰,不修。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, shuffles, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params netslide.c:311-324,不看 full:宽高各 ≥ 2,概率 0..1(%g 显示,0.05 步进往返
// 无损),打乱步数 ≥ 0(0 = 默认打乱量,netslide.c:575)。没有唯一解开关,也就没有 net 那条
// 「回绕时不能是 2」。
const custom: Custom<'netslide'> = {
  fields: [
    width(2, 'width'),
    height(2, 'height'),
    { kind: 'flag', key: 'wrapping', word: 'wrap' },
    {
      kind: 'float',
      key: 'barrier_probability',
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

const netslide: Game<'netslide'> = {
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
