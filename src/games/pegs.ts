// Pegs:单人跳棋。上游 pegs.c。Enter 选中一颗(给方向键上膛,跳跃是下一次
// 方向键),上了膛换成叉。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params pegs.c:190-229,full 下宽高都 ≥ 4(192);十字只支持八对尺寸(206-217):宽高都在
// {5,7,9} 里且不是 5×5,拆成三条;八边形只有 7×7(225-227),拆成宽、高两条;随机形状任意。
const CROSS = 0
const OCTAGON = 1
const CROSS_SIDES = [5, 7, 9]
const custom: Custom<'pegs'> = {
  fields: [
    width(4),
    height(4),
    { kind: 'pick', key: 'type', word: 'boardType', options: ['cross', 'octagon', 'random'] },
  ],
  rules: [
    rule('pegs.c:207', ['w', 'type'], (v) => v.type === CROSS && !CROSS_SIDES.includes(v.w)),
    rule('pegs.c:207', ['h', 'type'], (v) => v.type === CROSS && !CROSS_SIDES.includes(v.h)),
    rule('pegs.c:207', ['w', 'h', 'type'], (v) => v.type === CROSS && v.w === 5 && v.h === 5),
    rule('pegs.c:226', ['w', 'type'], (v) => v.type === OCTAGON && v.w !== 7),
    rule('pegs.c:226', ['h', 'type'], (v) => v.type === OCTAGON && v.h !== 7),
  ],
}

const pegs: Game<'pegs'> = {
  id: 'pegs',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[1, 2]] },
  pages: samePages('pegs'),
  types: { menu: verbatim, custom },
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
