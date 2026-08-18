// Dominosa:骨牌铺满。上游 dominosa.c。
// current_key_label 不查可见性,光标由宿主镜像(只有方向键唤醒);半格网格,
// 只有「正好一个坐标是奇数」的落点两个键才活。数字键只高亮不落子,文案换一套
// 说法,是 assist。
import type { Game, Key } from './game'
import { still } from './game'
import { fill } from '../i18n/fill'
import { samePages, verbatim } from './util/declare'
import { charButton, leadingNumber, tap } from './util/keys'
import { act, cross } from './util/pad'

const WORDS = ['Place', 'Remove', 'Line']

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
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ params }) => {
    const n = leadingNumber(params)
    if (n === null) return null
    return Array.from({ length: n + 1 }, (_, i): Key<null> => {
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
