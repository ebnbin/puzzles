// Pegs:单人跳棋。上游 pegs.c。Enter 选中一颗(给方向键上膛,跳跃是下一次
// 方向键),上了膛换成叉。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { CAP, int, range } from './util/params'

const WORDS = ['Select', 'Cancel']

// 上游 pegs.c:206-228:十字板只有 {5,7,9}² 去掉 5×5 这八种,八角板只有 7×7。
const CROSS = [5, 7, 9]

const pegs: Game = {
  id: 'pegs',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[1, 2]] },
  pages: samePages('pegs'),
  types: {
    menu: verbatim,
    params: [
      int('Width', (r) => {
        const type = r.pick('Board type')
        return type === 0 ? CROSS : type === 1 ? [7] : range(4, CAP)
      }),
      int('Height', (r) => {
        const type = r.pick('Board type')
        if (type === 0) return r.int('Width') === 5 ? [7, 9] : CROSS
        return type === 1 ? [7] : range(4, CAP)
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'jump',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'jump', word: 'jump' },
        words: WORDS,
        faces: {
          Select: { glyph: 'jump', word: 'jump' },
          Cancel: { glyph: 'cancel', word: 'unjump', on: true },
        },
      }),
    ],
  },
  observe: still,
}

export default pegs
