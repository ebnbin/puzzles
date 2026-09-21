// Blackbox:光线反推小球。上游 blackbox.c。Enter 一个键四张脸(发射/猜球/
// 取消/检查)。角上的「检查」有一格亮着按不动:上游标签比行为宽一格
// (current_key_label 在角上无条件报 Check,干活的分支查 CAN_REVEAL)——
// 修它要么读状态栏散文、要么自己数球,撞上的代价只是白按一下,不修。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { AREA_MAX, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

const WORDS = ['Fire', 'Ball', 'Clear', 'Check', 'Lock', 'Unlock']

// validate_params blackbox.c:191-208,不看 full:宽高 2..255(自家封 100);球数 ≥ 1,下限
// 不超过上限,下限少于格数(201-206)。球数一格文本装的是 "a-b" 区间,画成两个 slider;
// 上限上游没有上界,也没查它和格数的关系,量程取 10000。
const custom: Custom = {
  fields: [
    width(2),
    height(2),
    {
      kind: 'span',
      keys: ['bmin', 'bmax'],
      label: 'No. of balls',
      words: ['ballsMin', 'ballsMax'],
      min: 1,
      max: AREA_MAX,
    },
  ],
  rules: [
    rule('blackbox.c:203', ['bmin', 'bmax'], (v) => v.bmin > v.bmax),
    rule('blackbox.c:205', ['bmin', 'w', 'h'], (v) => v.bmin >= v.w * v.h),
  ],
}

const blackbox: Game = {
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
        words: WORDS,
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
        words: WORDS,
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
