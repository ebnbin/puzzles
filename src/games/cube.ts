// Cube:滚动多面体收集蓝格。上游 cube.c。
// new_ui 返回 NULL(cube.c:1032):没有光标、没有标签,方向键直接就是走子。
// 滚不过去的方向要置灰,而引擎不报——把上游的网格几何在这一侧重写一遍,
// 从存档推出当前落点和它的邻格。模型漂了的表现是「能按的键被灰掉」,错灰和
// 该灰长得一模一样,读者报不上来:升级 vendor/sgtpuzzles 后必须跑
// scripts/check-cube.mjs。
import type { DialogControl } from '../engine/types'
import type { ArrowKey, Field, Game, Span } from './game'
import { samePages, verbatim } from './util/declare'
import { done, fields, find } from './util/save'
import type { Way } from './util/pad'
import { DIRS, arrowFace, walk } from './util/pad'
import { numberAt, pickAt } from './util/fields'

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

// 这个界必须盖住 slider 到得了的**整个**范围,见下面的 CAP:出了界 rolls 返回
// null、四个方向键全亮,置灰功能静默消失。两处不共用常量——这里还要挡住存档和
// game ID 那条路喂进来的乱码尺寸,那条路不受 slider 管。改动任一处都要重跑
// scripts/check-cube.mjs。
export function parseParams(text: string): Params | null {
  const m = /^([tcoi])(\d+)x(\d+)$/.exec(text.trim())
  if (!m) return null
  const [d1, d2] = [Number(m[2]), Number(m[3])]
  if (d1 < 0 || d2 < 0 || d1 > 50 || d2 > 50) return null
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

// ---------------------------------------------------------------- 自定义参数

// game_configure 的下标(cube.c:489)。选的多面体决定另外两格的界,三格连动。
const SOLID = 0
const D1 = 1
const D2 = 2

// choices 的顺序就是 solids[] 的顺序(cube.c:151),也是 solid 枚举的值。
const TETRAHEDRON = 0
const CUBE = 1
const OCTAHEDRON = 2
const ICOSAHEDRON = 3

// 两个数字的含义随多面体变:Cube 走方格网,其余三个走三角网,连面积公式都不是
// 同一个(cube.c:471 grid_area 里有推导)。
const area = (solid: number, d1: number, d2: number) =>
  solid === CUBE ? d1 * d2 : d1 * d1 + d2 * d2 + 4 * d1 * d2

// nfaces + 1:摆得下多面体,还要剩一格空地站(cube.c:597)。
const FLOOR: Record<number, number> = {
  [TETRAHEDRON]: 5,
  [CUBE]: 7,
  [OCTAHEDRON]: 9,
  [ICOSAHEDRON]: 21,
}

// validate_params(cube.c:541)的等价闭式。上游那条「每一类都放得下蓝面」要先枚举
// 全部格子、按 tetra_class 或 flip 分类再逐类计数,不是公式;但把 cube.c 的判定逐行
// 复刻成 JS 比对后发现,面积够却被分类拒掉的格子**总共只有三个孤立点**,于是直接钉住
// (61×61×4 = 14884 格上与这条闭式全等)。改了上游几何就要重跑那次比对。
const legal = (solid: number, d1: number, d2: number): boolean => {
  if (!(solid in FLOOR) || d1 < 0 || d2 < 0) return false
  if (solid === CUBE) {
    if (d1 < 2 || d2 < 2) return false // 两边都必须大于一(cube.c:553)
  } else if (d1 === 0 && d2 === 0) return false // 至少一边大于零(cube.c:558)
  if (area(solid, d1, d2) < FLOOR[solid]) return false
  const [lo, hi] = d1 < d2 ? [d1, d2] : [d2, d1]
  if (solid === TETRAHEDRON) return !(lo === 1 && hi === 1)
  return !(solid === OCTAHEDRON && lo === 0 && hi === 3)
}

// 上界上游不管(只有 INT_MAX 溢出保护),由这里定,两种网格不同档。
// 方格网 50,与 Net 同档(桌面 1440×900 上每格 15.3 px)。
// 三角网 32:同一坐标系里两种格子都是边长 1(cube.c:334 方格四角 x±0.5,cube.c:257
// 三角底边 1、高 √3/2),而边长 1 的等边三角形只有同边长正方形的 √3/4 ≈ 0.433。
// 32×32 = 6144 个三角、总面积 2660,和方格 50×50 的 2500 同一量级;真按 50 放,
// 三角是 15000 个、面积 6495,是方格盘的 2.6 倍,画出来每格只剩 7 px。
// parseParams 的界要盖住这里最大的那一档。
const cap = (solid: number) => (solid === CUBE ? 50 : 32)

// 另一维给定时,这一维的合法区间。合法集在单个维度上是一条**向上的射线**(面积对
// 每一维单调,三个例外都是孤立点),所以从 0 往上找到第一个合法值就是下界。
// 找不到 = 另一维自己越界了(存档或 game ID 带来的):这一维就不设下界、别乱动,
// 交给 settle 的下一轮——另一维会先被拽回来,回头这一维就有解了。抓到 max 上去
// 反而会把用户没碰过的那一维顶到头。
const span =
  (mine: number, other: number) =>
  (controls: readonly DialogControl[]): Span => {
    const solid = pickAt(controls, SOLID)
    const rest = numberAt(controls, other)
    const held = Number.isFinite(rest) ? Math.max(0, Math.round(rest)) : 0
    const max = cap(solid)
    const at = (d: number) => (mine === D1 ? legal(solid, d, held) : legal(solid, held, d))
    let min = 0
    while (min <= max && !at(min)) min++
    return { min: min <= max ? min : 0, max }
  }

const paramFields: readonly Field[] = [
  { at: D1, label: 'Width / top', span: span(D1, D2) },
  { at: D2, label: 'Height / bottom', span: span(D2, D1) },
]

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

const cube: Game<Facts> = {
  id: 'cube',
  upstream: { labels: 'none', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('cube'),
  types: { menu: verbatim },
  fields: paramFields,
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
