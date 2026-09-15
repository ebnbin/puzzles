// Pattern:数字提示的填格画。上游 pattern.c。格子三态,Enter/Space 正反循环
// (pattern.c:1433);Ctrl/Shift/两者+方向键沿路刷黑/白/灰(pattern.c:1408)。
// 三个颜色键把两个循环键翻成位置钉死的颜色(按结果命名),它们是全 app 唯一的
// 幂等例外(lit):刷到一半按钮不许在拇指底下熄灭。「刷」是粘滞模式:亮着时
// 方向键带上当前笔刷的修饰键,一路涂过去。
import type { ArrowKey, Board, Game, Mods, Slot, View } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Way } from './util/pad'
import { PAINT, act, arrowFace, labelsSilent, walk } from './util/pad'
import { int } from './util/params'

const WORDS = ['Black', 'White', 'Grey']

const BRUSHES: { id: string; mods: Mods }[] = [
  { id: 'black', mods: { ctrl: true } },
  { id: 'white', mods: { shift: true } },
  { id: 'grey', mods: { shift: true, ctrl: true } },
]

const painting = (view: View<null>) =>
  view.lit.has('sweep') && !labelsSilent(view.labels)

// 选中的笔刷:亮着的那支;谁都没亮时是第一支(黑)。
const brushOf = (view: View<null>) =>
  BRUSHES.find(({ id }) => view.lit.has(`brush-${id}`)) ?? BRUSHES[0]

const pick = (board: Board<null>, id: string) => {
  for (const brush of BRUSHES) board.latch(`brush-${brush.id}`, brush.id === id)
}

const stroke = (dir: Way, slot: Slot): ArrowKey<null> => ({
  id: dir,
  slot,
  moves: true,
  face: (view) =>
    painting(view)
      ? { art: { glyph: PAINT[dir] }, says: view.words.arrows.paint[dir] }
      : arrowFace(view, dir),
  press: (board) => {
    const view = board.view()
    walk(board, dir, painting(view) ? brushOf(view).mods : undefined)
  },
})

const brushKey = (
  id: string,
  slot: Slot,
  glyph: 'black' | 'white' | 'grey',
  does: string,
) =>
  act<null>({
    id,
    slot,
    key: does === 'White' ? ' ' : 'Enter',
    idle: { glyph, word: glyph },
    words: WORDS,
    does,
    lit: true,
    aside: (board) => pick(board, id),
    ring: (view) => painting(view) && brushOf(view).id === id,
    held: (view) => painting(view) && brushOf(view).id === id,
  })

// 宽高只给 5 的倍数 5..45,4:1 互推。上游只查 > 0 和面积 ≥ 2,但生成是拒绝采样、两头都是悬崖:
// 面积大时「只靠单行单列推理就能唯一确定」的通过率随面积指数衰减(每多约 115 格减半),
// 45×45 均值 3.8 秒、最坏 10 秒,50×50 要一分半;短边小时「不许整行纯色」几乎必然触发
// (3×30 跑不出来)。数据见 docs/params.md。
const SIDES = [5, 10, 15, 20, 25, 30, 35, 40, 45]
// 宽高互推:两根滑块的档位都是全表,动了一根另一根若出了 4:1 就被推到最近的合法档;对方在
// 表外(Game ID 带进来的)时给全表,好把它拉回来。
const fits = (a: number, b: number) => a <= 4 * b && b <= 4 * a
const beside = (other: number) => {
  const list = SIDES.filter((s) => fits(s, other))
  return list.length ? list : SIDES
}

const pattern: Game = {
  id: 'pattern',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [1, 2, 4, 5] },
  pages: samePages('pattern'),
  types: {
    menu: verbatim,
    params: [
      int('Width', () => SIDES, { within: (r) => beside(r.int('Height')) }),
      int('Height', () => SIDES, { within: (r) => beside(r.int('Width')) }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      stroke('left', 1), stroke('down', 2), stroke('right', 3), stroke('up', 5),
      {
        id: 'sweep',
        slot: 4,
        face: (view) => {
          const said = view.words.cursor.sweep
          const on = painting(view)
          return {
            art: { glyph: 'sweep' },
            says: said,
            tip: true,
            on,
            held: on,
            dead: labelsSilent(view.labels),
          }
        },
        press: (board) => board.latch('sweep', !board.view().lit.has('sweep')),
      },
      brushKey('black', 7, 'black', 'Black'),
      brushKey('white', 8, 'white', 'White'),
      brushKey('grey', 9, 'grey', 'Grey'),
    ],
  },
  observe: still,
}

export default pattern
