// Same Game:整片消除同色块。上游 samegame.c。
// current_key_label 不查可见性标志,光标由宿主镜像。「取消选中」不是选中键的
// 工作(那个键的工作是「选中/消除脚下」),另开第二层;第二层 = 光标站在已
// 选块上,镜像光标睡着时永不开。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross, layerByWordsAwake } from './util/pad'

const WORDS = ['Select', 'Remove', 'Unselect']

// validate_params samegame.c:289-317,不看 full:宽高 ≥ 1;颜色最多 9(296);确保有解时
// 颜色 ≥ 3 且面积 > 1(300-303),不要求时颜色 ≥ 2 且面积至少是颜色数的两倍(305-310,
// 每种颜色得凑够两格)。INT_MAX 那条(293)在 100 以内碰不到。有解生成器是概率重试:
// 起手 2 或 3 格同色,之后往列里插两格团,面积奇偶和起手数一致,任何尺寸都填得满。
const custom: Custom = {
  fields: [
    width(1),
    height(1),
    { kind: 'int', key: 'colours', label: 'No. of colours', word: 'coloursNo', min: 2, max: 9, role: 'count' },
    { kind: 'pick', key: 'score', label: 'Scoring system', word: 'scoring', options: ['scoreN1', 'scoreN2'] },
    { kind: 'flag', key: 'soluble', label: 'Ensure solubility', word: 'soluble' },
  ],
  rules: [
    rule('samegame.c:300', ['colours', 'soluble'], (v) => !!v.soluble && v.colours < 3),
    rule('samegame.c:302', ['w', 'h', 'soluble'], (v) => !!v.soluble && v.w * v.h <= 1),
    rule('samegame.c:309', ['colours', 'w', 'h', 'soluble'], (v) => !v.soluble && v.w * v.h < v.colours * 2),
  ],
}

const samegame: Game = {
  id: 'samegame',
  upstream: {
    labels: 'live',
    cursor: {
      kind: 'mirrored',
      wakes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
    },
  },
  touch: { hold: 'right' },
  dark: { relief: [[12, 13]] },
  pages: samePages('samegame'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    layer: layerByWordsAwake(WORDS, ['Remove']),
    keys: [
      ...cross(),
      act({
        id: 'select',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'select', word: 'select' },
        words: WORDS,
        faces: {
          Select: { glyph: 'select', word: 'select' },
          Remove: { glyph: 'done', word: 'remove', on: true },
        },
      }),
      act({
        id: 'unselect',
        slot: 6,
        key: ' ',
        layer: 2,
        idle: { glyph: 'cancel', word: 'unselect' },
        words: WORDS,
        does: 'Unselect',
      }),
    ],
  },
  observe: still,
}

export default samegame
