// Galaxies:点对称星系分割。上游 galaxies.c。Enter 七个词一个键(它的标签
// 不看是哪个键,第二个键会是复制)。提示键走一步显然推理,料在发牌时定死,
// 第一按之后棋盘不再动。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { act, cross } from './util/pad'

// validate_params galaxies.c:328-345:宽高各 ≥ 3;INT_MAX 那条在 100 以内碰不到。生成是
// 难度不符就 goto 重来的概率重试(galaxies.c:1500-1516)。
const custom: Custom<'galaxies'> = {
  fields: [width(3), height(3), difficulty(['normal', 'unreasonable'])],
  rules: [],
}

const galaxies: Game<'galaxies'> = {
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
