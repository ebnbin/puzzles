// Cube:滚动多面体收集蓝格。上游 cube.c。
// new_ui 返回 NULL(cube.c:1032):没有光标、没有标签,方向键直接就是走子。
// 滚不过去的方向要置灰,而引擎不报——把上游的网格几何在这一侧重写一遍,
// 从存档推出当前落点和它的邻格。模型漂了的表现是「能按的键被灰掉」,错灰和
// 该灰长得一模一样,读者报不上来:升级 vendor/sgtpuzzles 后必须跑
// scripts/check-cube.mjs。
import type { ArrowKey, Game } from './game'
import { samePages, verbatim } from './util/declare'
import { done, fields, find } from './util/save'
import type { Way } from './util/pad'
import { DIRS, arrowFace, walk } from './util/pad'
import { int } from './util/params'

// ARROWS 的顺序就是上游 directions 数组的编号(LEFT=0, RIGHT=1, UP=2, DOWN=3);
// MOVES 的字母和每个 Square.dirs 的下标都按同一套编号,不可为可读性重排——
// rolls() 末行用下标当方向过滤,重排后灰键落到错误方向而 build 全绿。
const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const
const LEFT = 0
const RIGHT = 1
const UP = 2
const DOWN = 3

const MOVES: Record<string, number> = { L: LEFT, R: RIGHT, U: UP, D: DOWN }

type Square = { pts: [number, number][]; dirs: (readonly [number, number] | undefined)[] }

type Params = { solid: string; d1: number; d2: number }

// 走位模型的定义域:方格 ≤ 100、三角 ≤ 50 才建网格,再大就不建、方向键全亮。菜单给得
// 出的盘(方格单边 ≤ 16、三角 ≤ 14)都在里面:面板给得出来的每一局都得建得出来。
const SQUARE_CAP = 100
const TRI_CAP = 50
// 上游 choices 的下标:0 四面体、1 立方体、2 八面体、3 二十面体;只有立方体是方格网。
const capOf = (solid: number) => (solid === 1 ? SQUARE_CAP : TRI_CAP)

export function parseParams(text: string): Params | null {
  const m = /^([tcoi])(\d+)x(\d+)$/.exec(text.trim())
  if (!m) return null
  const [d1, d2] = [Number(m[2]), Number(m[3])]
  // 存档里的字母序就是 choices 的下标:上游 encode_params 写的是 "tcoi"[solid]。
  const cap = capOf('tcoi'.indexOf(m[1]))
  if (d1 > cap || d2 > cap) return null
  return { solid: m[1], d1, d2 }
}

// 输出顺序必须逐格等于上游 enum_grid_squares 的回调顺序(cube.c:325-467):
// 数组下标就是 DESC 里的起始格号和走子所指的格号;三角网格每行先下三角、后上
// 三角,即上游两个循环的先后。改遍历顺序 = 模型与引擎的格号静默错位。
function squares({ solid, d1, d2 }: Params): Square[] {
  const out: Square[] = []
  if (solid === 'c') {
    for (let y = 0; y < d2; y++)
      for (let x = 0; x < d1; x++)
        out.push({
          pts: [[2 * x - 1, 2 * y - 1], [2 * x - 1, 2 * y + 1],
                [2 * x + 1, 2 * y + 1], [2 * x + 1, 2 * y - 1]],
          dirs: [[0, 1], [2, 3], [0, 3], [1, 2]],
        })
    return out
  }
  for (let row = 0; row < d1 + d2; row++) {
    const other = row < d2 ? 1 : -1
    const rowlen = row < d2 ? row + d1 : 2 * d2 + d1 - row
    for (let i = 0; i < rowlen; i++) {
      const ix = 2 * i - (rowlen - 1)
      out.push({
        pts: [[ix - 1, row], [ix, row + 1], [ix + 1, row]],
        dirs: [[0, 1], [1, 2], [0, 2], undefined],
      })
    }
    for (let i = 0; i < rowlen + other; i++) {
      const ix = 2 * i - (rowlen + other - 1)
      out.push({
        pts: [[ix + 1, row + 1], [ix, row], [ix - 1, row + 1]],
        dirs: [[1, 2], [0, 1], undefined, [0, 2]],
      })
    }
  }
  return out
}

type Grid = { sqs: Square[]; across: Map<string, number[]> }

const edge = (sq: Square, pair: readonly [number, number]) =>
  [sq.pts[pair[0]], sq.pts[pair[1]]]
    .map((p) => p.join(','))
    .sort()
    .join(' ')

function build(params: Params): Grid {
  const sqs = squares(params)
  const across = new Map<string, number[]>()
  sqs.forEach((sq, i) =>
    sq.dirs.forEach((pair) => {
      if (!pair) return
      const key = edge(sq, pair)
      const at = across.get(key)
      if (at) at.push(i)
      else across.set(key, [i])
    }),
  )
  return { sqs, across }
}

export function neighbour({ sqs, across }: Grid, from: number, dir: number): number {
  const pair = sqs[from]?.dirs[dir]
  if (!pair) return -1
  const both = across.get(edge(sqs[from], pair))
  return both?.find((i) => i !== from) ?? -1
}

let cached: { key: string; grid: Grid } | null = null

export function gridFor(text: string): Grid | null {
  if (cached?.key === text) return cached.grid
  const params = parseParams(text)
  if (!params) return null
  cached = { key: text, grid: build(params) }
  return cached.grid
}

const startOf = (desc: string) => {
  const at = desc.indexOf(',')
  if (at < 0) return -1
  const n = Number(desc.slice(at + 1))
  return Number.isInteger(n) && n >= 0 ? n : -1
}

export function rolls(save: string): Set<string> | null {
  const lines = fields(save)
  if (!lines) return null
  const grid = gridFor(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS') ?? '')
  if (!grid) return null

  const desc = find(lines, 'DESC')
  const played = done(lines)
  if (desc === undefined || !played) return null

  let at = startOf(desc)
  if (at < 0 || at >= grid.sqs.length) return null
  for (const move of played) {
    if (move.key === 'RESTART') {
      at = startOf(move.value)
      if (at < 0 || at >= grid.sqs.length) return null
      continue
    }
    if (move.key !== 'MOVE') return null
    const dir = MOVES[move.value]
    if (dir === undefined) return null
    const next = neighbour(grid, at, dir)
    if (next < 0) return null
    at = next
  }

  return new Set(ARROWS.filter((_, dir) => neighbour(grid, at, dir) >= 0))
}

type Facts = { rolls: Set<string> | null }

// 置灰的分界:棋盘自己会说的(顶到边界),我们不说;棋盘盖住了的(三角朝向被
// 多面体压住),我们说。模型读不懂时 rolls 为 null,四个键全亮——错亮好过错灰。
const roll = (dir: Way, slot: 1 | 2 | 3 | 5): ArrowKey<Facts> => ({
  id: dir,
  slot,
  moves: true,
  face: (view) => ({
    ...arrowFace(view, dir),
    dead:
      !!view.facts.rolls &&
      !view.facts.rolls.has(
        typeof DIRS[dir].stroke === 'string' ? (DIRS[dir].stroke as string) : '',
      ),
  }),
  press: (board) => walk(board, dir),
})

type Pair = readonly [number, number]

// 四种立体各一张成对表:上游放得下、面积 ≤ 预设的 4 倍、方格另限单边 ≤ 16 的全部宽高组合;
// 只写 宽 ≤ 高 的一半、按面积排序,镜像在 pairsOf 里补。表是拿上游 validate_params 逐对
// 裁定出来的,不是规则算的(docs/params.md);改表要过 scripts/check-params.mjs。
const TETRA: Pair[] = [
  [0, 3], [1, 2], [0, 4], [1, 3], [2, 2], [0, 5], [1, 4], [0, 6],
  [2, 3], [1, 5], [0, 7], [2, 4],
]
const SQUARE: Pair[] = [
  [2, 4], [3, 3], [2, 5], [2, 6], [3, 4], [2, 7], [3, 5], [2, 8],
  [4, 4], [2, 9], [3, 6], [2, 10], [4, 5], [3, 7], [2, 11], [2, 12],
  [3, 8], [4, 6], [5, 5], [2, 13], [3, 9], [2, 14], [4, 7], [2, 15],
  [3, 10], [5, 6], [2, 16], [4, 8], [3, 11], [5, 7], [3, 12], [4, 9],
  [6, 6], [3, 13], [4, 10], [5, 8], [3, 14], [6, 7], [4, 11], [3, 15],
  [5, 9], [3, 16], [4, 12], [6, 8], [7, 7], [5, 10], [4, 13], [6, 9],
  [5, 11], [4, 14], [7, 8], [4, 15], [5, 12], [6, 10], [7, 9], [4, 16],
  [8, 8],
]
const OCTA: Pair[] = [
  [1, 2], [0, 4], [1, 3], [2, 2], [0, 5], [1, 4], [0, 6], [2, 3],
  [1, 5], [0, 7], [2, 4], [3, 3], [1, 6], [0, 8], [2, 5], [3, 4],
  [1, 7], [0, 9], [2, 6], [3, 5], [4, 4],
]
const ICOSA: Pair[] = [
  [1, 3], [2, 2], [0, 5], [1, 4], [0, 6], [2, 3], [1, 5], [0, 7],
  [2, 4], [3, 3], [1, 6], [0, 8], [2, 5], [3, 4], [1, 7], [0, 9],
  [2, 6], [3, 5], [4, 4], [1, 8], [0, 10], [2, 7], [3, 6], [1, 9],
  [0, 11], [4, 5], [2, 8], [1, 10], [3, 7], [0, 12], [4, 6], [5, 5],
  [2, 9], [1, 11], [0, 13], [3, 8], [4, 7], [5, 6], [2, 10], [1, 12],
  [0, 14], [3, 9], [4, 8], [2, 11], [5, 7], [6, 6],
]
// 下标就是上游 choices 的下标:0 四面体、1 立方体、2 八面体、3 二十面体。
const TABLES = [TETRA, SQUARE, OCTA, ICOSA]

const pairsOf = (solid: number): Pair[] =>
  (TABLES[solid] ?? []).flatMap(([a, b]): Pair[] => (a === b ? [[a, b]] : [[a, b], [b, a]]))
const ascending = (list: number[]) => [...new Set(list)].sort((x, y) => x - y)
// 一根滑块的档位:表里出现过的值;宽高对称,两根同一张。
const stops = (solid: number) => ascending(pairsOf(solid).map(([a]) => a))
// 和对方当前值配得上的档;对方在表外(Game ID 带进来的)时给全表,好把它拉回来。
const beside = (solid: number, other: number) => {
  const list = pairsOf(solid).filter(([, b]) => b === other).map(([a]) => a)
  return list.length ? ascending(list) : stops(solid)
}

const cube: Game<Facts> = {
  id: 'cube',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('cube'),
  types: {
    menu: verbatim,
    params: [
      // 宽高互推:两根滑块的档位都是该立体的全表;动了一根,另一根若和它配不成表内组合
      // 就被推到配得上的最近一档。没有主动方时(Game ID、换立体)先按高夹宽、再按新宽
      // 夹高,一趟落在表内组合上。
      int('Width / top', (r) => stops(r.pick('Type of solid')), {
        within: (r) => beside(r.pick('Type of solid'), r.int('Height / bottom')),
      }),
      int('Height / bottom', (r) => stops(r.pick('Type of solid')), {
        within: (r) => beside(r.pick('Type of solid'), r.int('Width / top')),
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [roll('left', 1), roll('down', 2), roll('right', 3), roll('up', 5)],
  },
  observe: {
    init: { rolls: null },
    saves: true,
    next: (facts, saw) => ('moved' in saw ? { rolls: rolls(saw.moved) } : facts),
  },
}

export default cube
