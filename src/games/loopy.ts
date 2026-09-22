// Loopy:围出单一闭环。上游 loopy.c。完全不接受键盘,源码原话是 "I think it's
// only possible to play this game with mouse clicks, sorry"(loopy.c:3074);
// current_key_label 注册 NULL。中键「未知」是快捷方式:点一下已画的线就是它。
import type { Game } from './game'
import { still } from './game'
import type { Custom, Word } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'

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

// validate_params loopy.c:699-721:每种网格各有最小尺寸(GRIDLIST loopy.c:276-294 的两个
// 数):两维都不小于前一个,至少一维不小于后一个;grid.c 里各网格自己的校验全是防溢出,
// 100 以内碰不到。难度是等到低一档解法解不动为止的概率重试。选项序同 GRIDLIST。
const GRIDS = [
  ['squares', 3, 3], ['triangular', 3, 3], ['honeycomb', 3, 3], ['snubSquare', 3, 3],
  ['cairo', 3, 4], ['greatHexagonal', 3, 3], ['octagonal', 3, 3], ['kites', 3, 3],
  ['floret', 1, 2], ['dodecagonal', 2, 2], ['greatDodecagonal', 2, 2],
  ['penroseP2', 3, 3], ['penroseP3', 3, 3], ['greatGreatDodecagonal', 2, 2],
  ['kagome', 3, 3], ['compassDodecagonal', 2, 2], ['hats', 6, 6], ['spectres', 6, 6],
] as const
// 选项数要对上上游 choices 数,类型层面得是元组:从 GRIDS 逐位取词(映射的源必须是裸
// 类型参数,TS 才保留元组形态)。
const heads = <T extends readonly (readonly [Word, number, number])[]>(rows: T) =>
  rows.map((r) => r[0]) as {
    readonly [I in keyof T]: T[I] extends readonly [infer W, ...unknown[]] ? W : never
  }
const GRID_WORDS = heads(GRIDS)
const custom: Custom<'loopy'> = {
  fields: [
    width(1),
    height(1),
    { kind: 'pick', key: 'type', word: 'gridType', options: GRID_WORDS },
    difficulty(['easy', 'normal', 'tricky', 'hard']),
  ],
  rules: [
    rule('loopy.c:704', ['w', 'type'], (v) => v.w < GRIDS[v.type][1]),
    rule('loopy.c:704', ['h', 'type'], (v) => v.h < GRIDS[v.type][1]),
    rule('loopy.c:707', ['w', 'h', 'type'], (v) => v.w < GRIDS[v.type][2] && v.h < GRIDS[v.type][2]),
  ],
}

const loopy: Game<'loopy'> = {
  id: 'loopy',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('loopy'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ prefs }) => preferKeys(prefs, [FAINT, FOLLOW]),
  arrows: null,
  observe: still,
}

export default loopy
