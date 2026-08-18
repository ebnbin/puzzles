// Loopy:围出单一闭环。上游 loopy.c。完全不接受键盘,源码原话是 "I think it's
// only possible to play this game with mouse clicks, sorry"(loopy.c:3070);
// current_key_label 注册 NULL。中键「未知」是快捷方式:点一下已画的线就是它。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'

const FAINT: Prefer = {
  kind: 'flag',
  label: 'Draw excluded grid lines faintly',
  glyph: 'faintLine',
}

const loopy: Game = {
  id: 'loopy',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('loopy'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ prefs }) => preferKeys(prefs, [FAINT]),
  arrows: null,
  observe: still,
}

export default loopy
