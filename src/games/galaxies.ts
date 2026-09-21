// Galaxies:点对称星系分割。上游 galaxies.c。Enter 七个词一个键(它的标签
// 不看是哪个键,第二个键会是复制)。提示键走一步显然推理,料在发牌时定死,
// 第一按之后棋盘不再动。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { act, cross } from './util/pad'

const WORDS = ['New arrow', 'Move arrow', 'Place', 'Remove', 'Cancel', 'Edge', 'Clear']

// validate_params galaxies.c:328-341:宽高各 ≥ 3;INT_MAX 那条在 100 以内碰不到。生成是
// 难度不符就 goto 重来的重试(galaxies.c:1500-1516),只有 3×3 配 Unreasonable 永远不符:
// solver_state 只在「唯一解且普通推理卡住」时才报 Unreasonable(2473-2553),3×3 的每种
// 圆点布局要么普通推理推完要么多解,没有一种卡住;3×4 起实测都能生成。
const UNREASONABLE = 1
const custom: Custom = {
  fields: [width(3), height(3), difficulty(['normal', 'unreasonable'])],
  rules: [rule('galaxies.c:1504', ['w', 'h', 'diff'], (v) => v.diff === UNREASONABLE && v.w === 3 && v.h === 3)],
}

const galaxies: Game = {
  id: 'galaxies',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('galaxies'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'edge',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'edge', word: 'drawEdge' },
        words: WORDS,
        faces: {
          Edge: { glyph: 'edge', word: 'drawEdge' },
          Clear: { glyph: 'noEdge', word: 'clearEdge', on: true },
          'New arrow': { glyph: 'galaxyArrow', word: 'newArrow' },
          'Move arrow': { glyph: 'galaxyArrow', word: 'moveArrow' },
          Place: { glyph: 'done', word: 'dropArrow', on: true },
          Remove: { glyph: 'cancel', word: 'removeArrow', on: true },
          Cancel: { glyph: 'cancel', word: 'cancelArrow', on: true },
        },
      }),
    ],
  },
  observe: still,
}

export default galaxies
