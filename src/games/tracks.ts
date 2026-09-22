// Tracks:铺轨连站。上游 tracks.c。铺轨、打叉是上游的绝对键;对方记号上一按替换,但替换保证不了
// 落得下(边的出口可能已占满),replaces 发完重读标签、落不下就 undo。它的 Clear 两个键都报、含义
// 不同(清轨/清叉),does 会擦错东西,只能用 faces。h 提示在 #if 0 里,死代码,别照着加。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params tracks.c:196-207:宽高各 ≥ 4。
const custom: Custom<'tracks'> = {
  fields: [
    width(4),
    height(4),
    difficulty(['easy', 'tricky', 'hard']),
    { kind: 'flag', key: 'single_ones', word: 'noOnes' },
  ],
  rules: [],
}

const tracks: Game<'tracks'> = {
  id: 'tracks',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('tracks'),
  types: { menu: verbatim, custom },
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
