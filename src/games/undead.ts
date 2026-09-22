// Undead:镜子与三种怪物。上游 undead.c。
// request_keys 报 G/V/Z/⌫(undead.c:1334);键面按偏好在图片和字母之间切换,
// 而 'a' 键就能改这个偏好——所以偏好是 volatile 的,按键后要重读。
import type { Game, Key } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { keepPencil, samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { PENCIL_HIGHLIGHT, clearKey, marksKey, preference, preferKeys, tap } from './util/keys'
import { optionAt } from './util/upstream'
import { act, cross } from './util/pad'

const MONSTERS: Prefer<'undead'> = { kind: 'cycle', kw: 'monsters', glyphs: ['asPicture', 'asLetter'] }

const COUNTS: Prefer<'undead'> = {
  kind: 'cycle',
  kw: 'count-style',
  glyphs: ['countTotal', 'countLeft', 'countBoth'],
}

const FACES = [
  { letter: 'G', image: 'ghost' },
  { letter: 'V', image: 'vampire' },
  { letter: 'Z', image: 'zombie' },
] as const

// validate_params undead.c:214-221:宽高各 ≥ 3,宽不超过 54 整除高(面积最多 54)。生成
// 是路径铺不出来就重来的概率重试。
const custom: Custom<'undead'> = {
  fields: [width(3), height(3), difficulty(['easy', 'normal', 'tricky'])],
  rules: [rule('undead.c:218', ['w', 'h'], (v) => v.w > Math.floor(54 / v.h))],
}

const undead: Game<'undead'> = {
  id: 'undead',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { strokes: [0, 2] },
  pages: samePages('undead'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: true, defaults: keepPencil },
  keypad: (deal) => {
    const { prefs } = deal
    const letters =
      preference('undead', prefs, 'monsters') === optionAt('undead', 'monsters', 'letters')
    return [
      ...FACES.map(
        ({ letter, image }): Key<null> => ({
          group: 'entry',
          face: letters ? { art: { text: letter } } : { art: { image } },
          button: letter.charCodeAt(0),
          press: tap(letter),
        }),
      ),
      clearKey(),
      marksKey(),
      ...preferKeys(deal, [PENCIL_HIGHLIGHT, MONSTERS, COUNTS]),
    ]
  },
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'pencil', slot: 4, key: 'Enter', idle: { glyph: 'pencil', word: 'pencil' } }),
    ],
  },
  observe: still,
}

export default undead
