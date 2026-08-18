// Untangle:拖顶点解开交叉。上游 untangle.c。
// 上游有键盘光标却不实现 current_key_label(注册 NULL),照字面读标签两个按钮
// 会整局灰着——它的 Enter 每条分支都做事,豁免是免费的:两个键恒可按(mute)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { act, cross } from './util/pad'

const SNAP: Prefer = { kind: 'flag', label: 'Snap points to a grid', glyph: 'snapGrid' }

const CROSSED: Prefer = {
  kind: 'flag',
  label: 'Show edges that cross another edge',
  glyph: 'crossedEdge',
}

const VERTICES: Prefer = {
  kind: 'cycle',
  answers: ['Circles', 'Numbers'],
  glyphs: ['vertex', 'vertexNumber'],
}

const untangle: Game = {
  id: 'untangle',
  upstream: { labels: 'none', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('untangle'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ prefs }) => preferKeys(prefs, [SNAP, CROSSED, VERTICES]),
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'drag', slot: 4, key: 'Enter', idle: { glyph: 'vertex', word: 'drag' }, mute: true }),
      act({ id: 'cycle', slot: 6, key: ' ', idle: { glyph: 'cycle', word: 'cycle' }, mute: true }),
    ],
  },
  observe: still,
}

export default untangle
