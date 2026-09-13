// Fifteen:滑块归位。上游 fifteen.c。
// 没有键盘光标(方向键直接推块),current_key_label 注册 NULL。
// H 提示只有键盘入口(fifteen.c:776)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { cross } from './util/pad'
import { int, range } from './util/params'

const fifteen: Game = {
  id: 'fifteen',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('fifteen'),
  types: {
    menu: verbatim,
    // 上限 50:格子里要写编号,字号是格边的 1/3(fifteen.c:946),50×50 在 2560×1440
    // 上是每格 25 px、字号 8 px,四位数刚好读得出来,再大就认不出了。
    params: [int('Width', () => range(2, 50)), int('Height', () => range(2, 50))],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
  arrows: { keys: cross() },
  observe: still,
}

export default fifteen
