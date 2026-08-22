// Fifteen:滑块归位。上游 fifteen.c。
// 没有键盘光标(方向键直接推块),current_key_label 注册 NULL。
// H 提示只有键盘入口(fifteen.c:776)。
import type { Field, Game, Span } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { cross } from './util/pad'

// game_configure 的下标(fifteen.c:114)。
const WIDTH = 0
const HEIGHT = 1

// 下界 2 是上游自己的(fifteen.c:149);2×2 只剩三块,平凡但成立。上游除了 w×h 不
// 溢出没有别的约束,所以这两条界互不相干,不像 cube 那样要读别的控件。
//
// 上界 50 是项目约定:**方格盘每边默认封 50**,要更小可以,要更大得有特殊理由。
// 这一档在桌面 1440×900 上每格 15 px 上下(fifteen 15.0、net 15.7、cube 方格 15.3),
// 是这个前端的清晰度地板——它没有平移缩放,画小了就等于玩不了。改这个数意味着改
// 约定,不是改一个游戏。
//
// 生成不是约束:perm_parity 是 O(n²),100×100 也只要 257 ms;那个 do-while 只在
// 洗出「已完成」时重来(2×2 是 1/12,再大是天文数字),不会空转。
const size = (): Span => ({ min: 2, max: 50 })

const fields: readonly Field[] = [
  { at: WIDTH, label: 'Width', span: size },
  { at: HEIGHT, label: 'Height', span: size },
]

const fifteen: Game = {
  id: 'fifteen',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('fifteen'),
  types: { menu: verbatim },
  fields,
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
  arrows: { keys: cross() },
  observe: still,
}

export default fifteen
