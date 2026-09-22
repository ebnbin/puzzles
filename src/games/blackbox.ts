// Blackbox:光线反推小球。上游 blackbox.c。Enter 一个键四张脸(发射/猜球/取消/检查)。
// 角上的「检查」亮着按不动:current_key_label 在角上无条件报 Check,干活的分支查 CAN_REVEAL;不修。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { AREA_MAX, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params blackbox.c:191-208,不看 full;宽高的 255 上限被自家的 100 盖住。
const custom: Custom<'blackbox'> = {
  fields: [
    width(2),
    height(2),
    {
      kind: 'span',
      keys: ['minballs', 'maxballs'],
      words: ['ballsMin', 'ballsMax'],
      min: 1,
      max: AREA_MAX,
    },
  ],
  rules: [
    rule('blackbox.c:203', ['minballs', 'maxballs'], (v) => v.minballs > v.maxballs),
    rule('blackbox.c:205', ['minballs', 'w', 'h'], (v) => v.minballs >= v.w * v.h),
  ],
}

const blackbox: Game<'blackbox'> = {
  id: 'blackbox',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[5, 6]] },
  pages: samePages('blackbox'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'ball',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'ball', word: 'ball' },
        faces: {
          Fire: { glyph: 'laser', word: 'fire' },
          Ball: { glyph: 'ball', word: 'ball' },
          Clear: { glyph: 'ballOn', word: 'unball', on: true },
          Check: { glyph: 'done', word: 'check' },
        },
      }),
      act({
        id: 'lock',
        slot: 6,
        key: ' ',
        idle: { glyph: 'lock', word: 'lockCell' },
        faces: {
          Lock: { glyph: 'lock', word: 'lockCell' },
          Unlock: { glyph: 'unlock', word: 'unlockCell', on: true },
        },
      }),
    ],
  },
  observe: still,
}

export default blackbox
