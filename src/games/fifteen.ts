// Fifteen:滑块归位。上游 fifteen.c。
// 没有键盘光标(方向键直接推块),current_key_label 注册 NULL。
// H 提示只有键盘入口(fifteen.c:776)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { cross } from './util/pad'
import { int } from './util/params'

const SIDES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
// 宽高互推:两根滑块的档位都是全表,动了一根另一根若配不上就被推到最近的合法档;对方在
// 表外(Game ID 带进来的)时给全表,好把它拉回来。
const fits = (a: number, b: number) => a <= 4 * b && b <= 4 * a && a * b >= 6
const beside = (other: number) => {
  const list = SIDES.filter((s) => fits(s, other))
  return list.length ? list : SIDES
}

const fifteen: Game = {
  id: 'fifteen',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('fifteen'),
  types: {
    menu: verbatim,
    // 可选值全部列出,不是规则。上游只要求宽高 ≥ 2;16 是设计定的上限:16×16 有 255 块,上游
    // 自带的提示解法一局近万步,再大没有新内容只有更长。配对:长边 ≤ 短边 4 倍,面积 ≥ 6
    // (2×2 三块只能绕圈转,没有可玩性)。
    params: [
      int('Width', () => SIDES, { within: (r) => beside(r.int('Height')) }),
      int('Height', () => SIDES, { within: (r) => beside(r.int('Width')) }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
  arrows: { keys: cross() },
  observe: still,
}

export default fifteen
