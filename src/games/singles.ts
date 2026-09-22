// Singles:涂黑去重。上游 singles.c。涂黑、画圈全从标签解出来,一个字节不记;
// 圈 ↔ 黑一按到位:对方词在场时先按对方语义顶掉再落自己(twice),撤销要两次。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { act, cross } from './util/pad'

// 点棋盘外沿翻这条偏好(singles.c:1561-1562):volatile,重读挂在手势上。
const BLACK_NUMS: Prefer<'singles'> = { kind: 'flag', kw: 'show-black-nums', glyph: 'numberBlack' }

// validate_params singles.c:264-274:宽高上游放到 62(singles.c:267),这里封 61:n2c 只写得出 0..61
// (singles.c:323-331),62 的盘 new_game 解不回来。
const SINGLES_MAX = 10 + 26 + 26 - 1
const custom: Custom<'singles'> = {
  fields: [
    { kind: 'int', key: 'w', word: 'width', min: 2, max: SINGLES_MAX, role: 'width' },
    { kind: 'int', key: 'h', word: 'height', min: 2, max: SINGLES_MAX, role: 'height' },
    difficulty(['easy', 'tricky']),
  ],
  rules: [],
}

const singles: Game<'singles'> = {
  id: 'singles',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [3, 4, 5, 6], paper: true },
  pages: samePages('singles'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: true },
  keypad: (deal) => preferKeys(deal, [BLACK_NUMS]),
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'black',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'black', word: 'blackSquare' },
        does: 'Black',
        instead: 'Restore',
        twice: true,
      }),
      act({
        id: 'circle',
        slot: 6,
        key: ' ',
        idle: { glyph: 'circleSquare', word: 'circle' },
        does: 'Circle',
        instead: 'Remove',
        twice: true,
      }),
    ],
  },
  observe: still,
}

export default singles
