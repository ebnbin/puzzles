// Pearl:黑白珠上画环。上游 pearl.c。两层各两个键:闲着「起笔 · 打叉」(叉是一次性上膛),画着
// 「停笔 · 放弃」。起笔后一格没走时勾是灰的:标签说不出「走没走过格」,存档不带,自己记一位。
// 6 号格两个租客轮流住。Ctrl 画线不给(拖拽到得了)。
import type { Game, View } from './game'
import { keyOf, plain } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { hintKey, preferKeys } from './util/keys'
import { act, arm, cross, layerByWords, wordOf } from './util/pad'

type Facts = { walked: boolean }

const UNTRODDEN = '\0untrodden'

const LOOK: Prefer<'pearl'> = { kind: 'cycle', kw: 'appearance', glyphs: ['masyuStyle', 'loopyStyle'] }

// validate_params pearl.c:286-297:宽高各 ≥ 5;Tricky 要宽加高至少 11。
const TRICKY = 1
const custom: Custom<'pearl'> = {
  fields: [
    width(5),
    height(5),
    difficulty(['easy', 'tricky'], 'difficulty'),
    { kind: 'flag', key: 'nosolve', word: 'allowUnsoluble' },
  ],
  rules: [rule('pearl.c:294', ['w', 'h', 'difficulty'], (v) => v.difficulty >= TRICKY && v.w + v.h < 11)],
}

const pearl: Game<'pearl', Facts> = {
  id: 'pearl',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [3, 4], frame: { 3: 4 } },
  pages: samePages('pearl'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: (deal) => [hintKey(), ...preferKeys(deal, [LOOK])],
  arrows: {
    layer: layerByWords(['Stop']),
    keys: [
      ...cross<Facts>(),
      act({
        id: 'loop',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'drawLine', word: 'startLoop' },
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
