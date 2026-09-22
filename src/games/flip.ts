// Flip:翻转一片做全亮。上游 flip.c。current_key_label 报一个常量词、不查可见性,光标由宿主镜像。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params flip.c:191-198,不看 full:宽高 > 0。
const custom: Custom<'flip'> = {
  fields: [
    width(1),
    height(1),
    { kind: 'pick', key: 'matrix_type', word: 'shape', options: ['crosses', 'random'] },
  ],
  rules: [],
}

const flip: Game<'flip'> = {
  id: 'flip',
  upstream: {
    labels: 'live',
    cursor: {
      kind: 'mirrored',
      wakes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
    },
  },
  touch: { hold: 'right' },
  dark: { keep: [1, 2, 3, 4] },
  pages: samePages('flip'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'flip', slot: 4, key: 'Enter', idle: { glyph: 'flip', word: 'flip' } }),
    ],
  },
  observe: still,
}

export default flip
