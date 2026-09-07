// Fifteen:滑块归位。上游 fifteen.c。
// 没有键盘光标(方向键直接推块),current_key_label 注册 NULL。
// H 提示只有键盘入口(fifteen.c:776)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { cross } from './util/pad'
import { CAP, int, range } from './util/params'

const fifteen: Game = {
  id: 'fifteen',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('fifteen'),
  types: {
    menu: verbatim,
    params: [int('Width', () => range(2, CAP)), int('Height', () => range(2, CAP))],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
  arrows: { keys: cross() },
  observe: still,
}

export default fifteen
