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

const WORDS = ['Black', 'Circle', 'Restore', 'Remove']

// 点在棋盘外沿(BORDER 那一圈)就翻这条偏好(singles.c:1561-1562)——全 app 唯一一个
// 被指针翻的偏好,所以 volatile,而且重读得挂在手势上,不能只挂按键。
const BLACK_NUMS: Prefer<'singles'> = { kind: 'flag', kw: 'show-black-nums', glyph: 'numberBlack' }

// validate_params singles.c:264-274:宽高上游放到 62(singles.c:267),这里封 61——数字从
// 1 起到 max(w,h),而 n2c 只写得出 0..61(singles.c:323-331),62 会写成 '[',new_game
// 解不回来(singles.c:356、1450),每个种子都撞上。宽或高不足 4 的 Tricky 上游自己降成
// Easy(singles.c:1331),是降级不是失败;其余是 goto 重来的概率重试。
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
