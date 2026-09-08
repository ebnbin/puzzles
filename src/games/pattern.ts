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
import { int, range } from './util/params'

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

// 宽高只给 5 的倍数 5..50。上游只查 > 0 和面积 ≥ 2,但生成是拒绝采样,两头都会塌:
// 短边小时「不许整行纯色」那条几乎必然触发(一行 3 格纯色的概率 0.60、4 格 0.42、
// 5 格 0.30),3×30 跑满 300 秒也出不来;面积大时「只靠单行单列推理就能唯一确定」
// 那条通不过,面积每多约 100 格耗时翻倍。上限 50 另有可读性一条(线索是文字,同
// Fifteen / Sixteen)。逐档实测见 docs/params.md。
const SIDES = range(1, 10).map((n) => n * 5)

const pattern: Game = {
  id: 'pattern',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [1, 2, 4, 5] },
  pages: samePages('pattern'),
  types: {
    menu: verbatim,
    params: [
      int('Width', () => SIDES),
      int('Height', () => SIDES),
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
