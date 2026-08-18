// Undead:镜子与三种怪物。上游 undead.c。
// request_keys 报 G/V/Z/⌫(undead.c:1334);键面按偏好在图片和字母之间切换,
// 而 'a' 键就能改这个偏好——所以偏好是 volatile 的,按键后要重读。
import type { Game, Key } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { clearKey, marksKey, pencilKey, preference, tap } from './util/keys'
import { act, cross } from './util/pad'

const PICTURES = ['Pictures', 'Letters']

const FACES = [
  { letter: 'G', image: 'ghost' },
  { letter: 'V', image: 'vampire' },
  { letter: 'Z', image: 'zombie' },
] as const

const undead: Game = {
  id: 'undead',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { strokes: [0, 2] },
  pages: samePages('undead'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: true },
  keypad: ({ prefs }) => {
    const letters = preference(prefs, PICTURES) === PICTURES.indexOf('Letters')
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
      ...pencilKey(prefs),
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
