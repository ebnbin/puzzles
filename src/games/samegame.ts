// Same Game:整片消除同色块。上游 samegame.c。current_key_label 不查可见性标志,光标由宿主镜像。
// 「取消选中」不是选中键的工作,另开第二层;第二层 = 光标站在已选块上,镜像光标睡着时永不开。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross, layerByWordsAwake } from './util/pad'

// validate_params samegame.c:289-317,不看 full:宽高 ≥ 1;颜色最多 9(296);确保有解时颜色 ≥ 3 且
// 面积 > 1(300-303),不要求时颜色 ≥ 2 且面积至少是颜色数的两倍(305-310)。
const custom: Custom<'samegame'> = {
  fields: [
    width(1),
    height(1),
    { kind: 'int', key: 'ncols', word: 'coloursNo', min: 2, max: 9, role: 'count' },
    { kind: 'pick', key: 'scoresub', word: 'scoring', options: ['scoreN1', 'scoreN2'] },
    { kind: 'flag', key: 'soluble', word: 'soluble' },
  ],
  rules: [
    rule('samegame.c:300', ['ncols', 'soluble'], (v) => !!v.soluble && v.ncols < 3),
    rule('samegame.c:302', ['w', 'h', 'soluble'], (v) => !!v.soluble && v.w * v.h <= 1),
    rule('samegame.c:309', ['ncols', 'w', 'h', 'soluble'], (v) => !v.soluble && v.w * v.h < v.ncols * 2),
  ],
}

const samegame: Game<'samegame'> = {
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
    layer: layerByWordsAwake(['Remove']),
    keys: [
      ...cross(),
      act({
        id: 'select',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'select', word: 'select' },
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
        does: 'Unselect',
      }),
    ],
  },
  observe: still,
}

export default samegame
