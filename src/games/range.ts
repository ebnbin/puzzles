// Range:涂黑限视野。上游 range.c。涂黑、打点三态三对不同词,全从标签解出来;
// 线索格上一起灰(两词俱空)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { act, cross } from './util/pad'
// 游戏本身就叫 range,区间词汇改名进来。
import { CAP, int, range as between, without } from './util/params'

const WORDS = ['Fill', 'Dot', 'Empty']

const range: Game = {
  id: 'range',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [1], paper: true },
  pages: samePages('range'),
  types: {
    menu: verbatim,
    params: [
      int('Width', () => between(1, CAP)),
      // 宽 + 高 ≤ 128(range.c:923,格数类型是 signed char);2×2 以内的四种生成不了。
      int('Height', (r) => {
        const w = r.int('Width')
        const list = between(1, Math.min(CAP, 128 - w))
        return w <= 2 ? without(list, 1, 2) : list
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'fill',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'black', word: 'fillSquare' },
        words: WORDS,
        does: 'Fill',
        instead: 'Empty',
      }),
      act({
        id: 'dot',
        slot: 6,
        key: ' ',
        idle: { glyph: 'dotSquare', word: 'dotSquare' },
        words: WORDS,
        does: 'Dot',
        instead: 'Empty',
      }),
    ],
  },
  observe: still,
}

export default range
