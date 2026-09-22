// Dominosa:骨牌铺满。上游 dominosa.c。
// current_key_label 不查可见性,光标由宿主镜像(只有方向键唤醒);半格网格,
// 只有「正好一个坐标是奇数」的落点两个键才活。数字键只高亮不落子,文案换一套
// 说法,是 assist;上游只认 0-9(dominosa.c:2868),n ≥ 10 也只发到 9。
import type { Game, Key } from './game'
import { still } from './game'
import { fill } from '../i18n/fill'
import type { Custom } from './util/custom'
import { difficulty } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { charButton, leadingNumber, tap } from './util/keys'
import { act, cross } from './util/pad'

const WORDS = ['Place', 'Remove', 'Line']

// validate_params dominosa.c:247-258:最大点数 ≥ 1,INT_MAX 那条在 100 以内碰不到。棋盘
// 是 (n+2)×(n+1),按棋盘规则封到 98。n 为 1、2 时上游把难度压到 Trivial / Basic
// (dominosa.c:2243-2247),是降级不是失败;其余是等到指定难度为止的概率重试。
const custom: Custom = {
  fields: [
    { kind: 'int', key: 'n', label: 'Maximum number on dominoes', word: 'dominoMax', min: 1, max: 98, role: 'dim' },
    difficulty(['trivial', 'basic', 'hard', 'extreme', 'ambiguous']),
  ],
  rules: [],
}

const dominosa: Game = {
  id: 'dominosa',
  upstream: {
    labels: 'live',
    cursor: {
      kind: 'mirrored',
      wakes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    },
  },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('dominosa'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ params }) => {
    const n = leadingNumber(params)
    if (n === null) return null
    return Array.from({ length: Math.min(n, 9) + 1 }, (_, i): Key<null> => {
      const button = charButton(i)
      const label = String.fromCharCode(button)
      return {
        group: 'assist',
        face: (view) => ({
          art: { text: label },
          says: fill(view.words.keys.highlight, { digit: label }),
        }),
        button,
        press: tap(label),
      }
    })
  },
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'domino',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'domino', word: 'domino' },
        words: WORDS,
        faces: {
          Place: { glyph: 'domino', word: 'domino' },
          Remove: { glyph: 'dominoOn', word: 'undomino', on: true },
        },
      }),
      act({
        id: 'line',
        slot: 6,
        key: ' ',
        idle: { glyph: 'line', word: 'line' },
        words: WORDS,
        faces: {
          Line: { glyph: 'line', word: 'line' },
          Remove: { glyph: 'lineOn', word: 'unline', on: true },
        },
      }),
    ],
  },
  observe: still,
}

export default dominosa
