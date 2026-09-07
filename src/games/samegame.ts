// Same Game:整片消除同色块。上游 samegame.c。
// current_key_label 不查可见性标志,光标由宿主镜像。「取消选中」不是选中键的
// 工作(那个键的工作是「选中/消除脚下」),另开第二层;第二层 = 光标站在已
// 选块上,镜像光标睡着时永不开。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross, layerByWordsAwake } from './util/pad'
import type { Read } from './util/params'
import { CAP, int, range } from './util/params'

const WORDS = ['Select', 'Remove', 'Unselect']

const soluble = (r: Read) => r.flag('Ensure solubility')

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
  types: {
    menu: verbatim,
    params: [
      int('Width', () => range(1, CAP)),
      // 保证可解要面积 ≥ 2;不保证时每种颜色至少两格,颜色至少 2 种(samegame.c:299-311)。
      int('Height', (r) => range(Math.ceil((soluble(r) ? 2 : 4) / r.int('Width')), CAP)),
      int('No. of colours', (r) =>
        soluble(r)
          ? range(3, 9)
          : range(2, Math.min(9, Math.floor((r.int('Width') * r.int('Height')) / 2))),
      ),
    ],
  },
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
