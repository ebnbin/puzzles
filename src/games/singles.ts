// Singles:涂黑去重。上游 singles.c。涂黑、画圈全从标签解出来,一个字节不记;
// 圈 ↔ 黑一按到位:对方词在场时先按对方语义顶掉再落自己(twice),撤销要两次。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { act, cross } from './util/pad'

const WORDS = ['Black', 'Circle', 'Restore', 'Remove']

// 点在棋盘外沿(BORDER 那一圈)就翻这条偏好(singles.c:1560)——全 app 唯一一个
// 被指针翻的偏好,所以 volatile,而且重读得挂在手势上,不能只挂按键。
const BLACK_NUMS: Prefer = {
  kind: 'flag',
  label: 'Show numbers on black squares',
  glyph: 'numberBlack',
}

const singles: Game = {
  id: 'singles',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [3, 4, 5, 6], paper: true },
  pages: samePages('singles'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: true },
  keypad: ({ prefs }) => preferKeys(prefs, [BLACK_NUMS]),
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'black',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'black', word: 'blackSquare' },
        words: WORDS,
        does: 'Black',
        instead: 'Restore',
        twice: true,
      }),
      act({
        id: 'circle',
        slot: 6,
        key: ' ',
        idle: { glyph: 'circleSquare', word: 'circle' },
        words: WORDS,
        does: 'Circle',
        instead: 'Remove',
        twice: true,
      }),
    ],
  },
  observe: still,
}

export default singles
