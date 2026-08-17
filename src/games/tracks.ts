// Tracks:铺轨连站。上游 tracks.c。铺轨、打叉是上游的绝对键;对方记号上一按
// 替换,但替换保证不了落得下(边的出口可能已占满)——act 的 replaces 机制发完
// 会重读标签,落不下就 undo 撤回,代价是那次撤回会点亮重做键。它的 Clear 两个
// 键都报、含义不同(清轨/清叉),does 会擦错东西,只能用 faces。h 提示在
// #if 0 里,死代码,别照着加。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['Track', 'X', 'Clear']

const tracks: Game = {
  id: 'tracks',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('tracks'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'track',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'track', word: 'track' },
        words: WORDS,
        faces: {
          Track: { glyph: 'track', word: 'track' },
          Clear: { glyph: 'track', word: 'clearSquare', on: true },
        },
        replaces: 'Clear',
      }),
      act({
        id: 'cross',
        slot: 6,
        key: ' ',
        idle: { glyph: 'crossSquare', word: 'noTrack' },
        words: WORDS,
        faces: {
          X: { glyph: 'crossSquare', word: 'noTrack' },
          Clear: { glyph: 'crossSquare', word: 'clearSquare', on: true },
        },
        replaces: 'Clear',
      }),
    ],
  },
  observe: still,
}

export default tracks
