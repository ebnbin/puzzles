// Netslide:整行整列滑动的 Net。上游 netslide.c。
// 两个确认键不分工(netslide.c:1115 只有右键反向),只给一个键;光标在边框
// 上时四个方向键只有两个活,看起来像 bug——上游键盘本来就这样,标签整圈报
// 同一个词,分不出光标在哪条边,没有依据置灰。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { CAP, float, int, range, steps } from './util/params'

const netslide: Game = {
  id: 'netslide',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('netslide'),
  types: {
    menu: verbatim,
    params: [
      int('Width', () => range(2, CAP)),
      int('Height', () => range(2, CAP)),
      float('Barrier probability', 2, () => steps(0, 1, 0.01, 2)),
      // 打乱步数封到 100,同 Sixteen / Twiddle:0(默认值和全部九条预设)才是打乱,
      // N > 0 是「数得出来、能倒着走回去」那一档。上游只要求非负(netslide.c:321)。
      int('Number of shuffling moves', () => range(0, 100)),
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
