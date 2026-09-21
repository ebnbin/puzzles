// Pegs:单人跳棋。上游 pegs.c。Enter 选中一颗(给方向键上膛,跳跃是下一次
// 方向键),上了膛换成叉。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['Select', 'Cancel']

// validate_params pegs.c:190-227,full 下宽高都 ≥ 4(192);十字只支持上游列出的八对
// 尺寸(206-216),八边形只有 7×7(222-224),随机形状任意。INT_MAX 那条(196)在 100
// 以内碰不到。随机棋盘是反向走子长出来的,长不到四条边就重来(pegs_generate),4×4 起
// 都够得着,只是概率重试。
const CROSS = 0
const OCTAGON = 1
const CROSSES = [[9, 5], [5, 9], [9, 9], [7, 5], [5, 7], [9, 7], [7, 9], [7, 7]]
const custom: Custom = {
  fields: [
    width(4),
    height(4),
    { kind: 'pick', key: 'type', label: 'Board type', word: 'boardType', options: ['cross', 'octagon', 'random'] },
  ],
  rules: [
    rule('pegs.c:206', ['w', 'h', 'type'], (v) =>
      v.type === CROSS && !CROSSES.some(([w, h]) => v.w === w && v.h === h)),
    rule('pegs.c:222', ['w', 'h', 'type'], (v) => v.type === OCTAGON && (v.w !== 7 || v.h !== 7)),
  ],
}

const pegs: Game = {
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
