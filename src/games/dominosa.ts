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
import { int, range } from './util/params'

const WORDS = ['Place', 'Remove', 'Line']

// 每个难度的 n 上限(Trivial / Basic / Hard / Extreme / Ambiguous)。owner 定的,
// 明知代价:这几档的生成分别是十几秒到几分钟量级,实测在 docs/params.md。
const TOP = [25, 30, 15, 10, 50]

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
  types: {
    menu: verbatim,
    params: [
      // 棋盘是 (n+2)×(n+1) 格。上限随难度走:上游要求局面「恰好需要这个难度」——
      // 这个难度解不出来不行、更低的难度就能解出来也不行(2337-2345),没有次数上限。
      // 于是中间的 Basic 最便宜、两头都贵(Trivial 要「只用最傻的推理就能解完」,
      // Hard 以上要「基本推理做不出来」),而 Ambiguous 根本不跑求解器(2289),免费。
      int('Maximum number on dominoes', (r) => range(1, TOP[r.pick('Difficulty')] ?? 25)),
    ],
  },
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
