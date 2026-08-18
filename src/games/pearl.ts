// Pearl:黑白珠上画环。上游 pearl.c。两层各两个键:闲着「起笔 · 打叉」
// (叉是一次性上膛),画着「停笔 · 放弃」。起笔后一格没走时勾是灰的:标签说
// 不出「走没走过格」,存档不带,自己记一位——错的那个角(贴边起笔按朝外)
// 代价是勾亮着按下去等于旁边的叉。6 号格两个租客轮流住,一次只有一个的
// face 活着。Ctrl 画线不给:拖拽到得了,按压更少。
import type { Game, View } from './game'
import { keyOf, plain } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { hintKey, preferKeys } from './util/keys'
import { act, arm, cross, layerByWords, wordOf } from './util/pad'

type Facts = { walked: boolean }

const WORDS = ['Start', 'Stop', 'Cancel']

const UNTRODDEN = '\0untrodden'

const LOOK: Prefer = {
  kind: 'cycle',
  answers: ['Traditional', 'Loopy-style'],
  glyphs: ['masyuStyle', 'loopyStyle'],
}

const pearl: Game<Facts> = {
  id: 'pearl',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [3, 4], frame: { 3: 4 } },
  pages: samePages('pearl'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ prefs }) => [hintKey(), ...preferKeys<Facts>(prefs, [LOOK])],
  arrows: {
    layer: layerByWords(WORDS, ['Stop']),
    keys: [
      ...cross<Facts>(),
      act({
        id: 'loop',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'drawLine', word: 'startLoop' },
        words: WORDS,
        word: (view: View<Facts>) => {
          const own = wordOf('Enter', view.labels)
          return own === 'Stop' && !view.facts.walked ? UNTRODDEN : own
        },
        faces: {
          Start: { glyph: 'drawLine', word: 'startLoop' },
          Stop: { glyph: 'done', word: 'endLoop', on: true },
          [UNTRODDEN]: { glyph: 'done', word: 'endLoop', on: true, idle: true },
        },
      }),
      arm({
        id: 'cross',
        slot: 6,
        layer: 1,
        glyph: 'crossNext',
        word: 'crossNext',
        mods: { shift: true },
      }),
      act({
        id: 'cancel',
        slot: 6,
        key: ' ',
        layer: 2,
        idle: { glyph: 'cancel', word: 'cancelLoop' },
        words: WORDS,
        faces: { Cancel: { glyph: 'cancel', word: 'cancelLoop', on: true } },
      }),
    ],
  },
  observe: {
    init: { walked: false },
    next: (facts, saw) => {
      if ('sent' in saw && plain(saw.sent)) {
        const key = keyOf(saw.sent)
        if (key === 'Enter' || key === ' ') return { walked: false }
        if (key.startsWith('Arrow')) return { walked: true }
      }
      return facts
    },
  },
}

export default pearl
