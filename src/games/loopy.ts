// Loopy:围出单一闭环。上游 loopy.c。完全不接受键盘,源码原话是 "I think it's
// only possible to play this game with mouse clicks, sorry"(loopy.c:3070);
// current_key_label 注册 NULL。中键「未知」是快捷方式:点一下已画的线就是它。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { CAP, int, range } from './util/params'

const FAINT: Prefer = {
  kind: 'flag',
  label: 'Draw excluded grid lines faintly',
  glyph: 'faintLine',
}

const FOLLOW: Prefer = {
  kind: 'cycle',
  answers: ['No', 'Based on grid only', 'Based on grid and game state'],
  glyphs: ['followOff', 'followGrid', 'followSmart'],
}

// 每种网格的最小尺寸 [两边都至少, 至少一边至少],按 GRIDLIST 顺序(loopy.c:281-300)。
// 两种 Penrose 网格在上游放行的最小尺寸附近生成要么几十秒不出结果、要么在 wasm 里
// 除零 / dsf 断言死掉(docs/params.md 第四节有逐格图),两边各抬到 4 / 5 才稳。
const PENROSE: Readonly<Record<number, number>> = { 11: 4, 12: 5 }
const LIMITS: readonly (readonly [number, number])[] = [
  [3, 3], [3, 3], [3, 3], [3, 3], [3, 4], [3, 3], [3, 3], [3, 3], [1, 2],
  [2, 2], [2, 2], [3, 3], [3, 3], [2, 2], [3, 3], [2, 2], [6, 6], [6, 6],
]

const loopy: Game = {
  id: 'loopy',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('loopy'),
  types: {
    menu: verbatim,
    params: [
      int('Width', (r) => {
        const type = r.pick('Grid type')
        return range(PENROSE[type] ?? LIMITS[type]?.[0] ?? NaN, CAP)
      }),
      int('Height', (r) => {
        const type = r.pick('Grid type')
        const [amin, omin] = LIMITS[type] ?? [NaN, NaN]
        return range(PENROSE[type] ?? (r.int('Width') >= omin ? amin : omin), CAP)
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ prefs }) => preferKeys(prefs, [FAINT, FOLLOW]),
  arrows: null,
  observe: still,
}

export default loopy
