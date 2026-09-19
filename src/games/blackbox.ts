// Blackbox:光线反推小球。上游 blackbox.c。Enter 一个键四张脸(发射/猜球/
// 取消/检查)。角上的「检查」有一格亮着按不动:上游标签比行为宽一格
// (current_key_label 在角上无条件报 Check,干活的分支查 CAN_REVEAL)——
// 修它要么读状态栏散文、要么自己数球,撞上的代价只是白按一下,不修。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import type { Read } from './util/params'
import { CAP, int, range, span } from './util/params'

const WORDS = ['Fire', 'Ball', 'Clear', 'Check', 'Lock', 'Unlock']

const cells = (r: Read) => r.int('Width') * r.int('Height')

const blackbox: Game = {
  id: 'blackbox',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[5, 6]] },
  pages: samePages('blackbox'),
  types: {
    menu: verbatim,
    params: [
      int('Width', () => range(2, CAP)),
      int('Height', () => range(2, CAP)),
      // 上游只查下限 < 格数(blackbox.c:205);上限它没查,放球时超过格数会死循环,
      // 这里按同一条封顶。
      span(
        'No. of balls',
        (r) => range(1, cells(r) - 1),
        (r, lo) => range(lo, cells(r) - 1),
      ),
    ],
  },
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
