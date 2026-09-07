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
import { CAP, int, range } from './util/params'

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

export function parseParams(text: string): Params | null {
  const m = /^([tcoi])(\d+)x(\d+)$/.exec(text.trim())
  if (!m) return null
  const [d1, d2] = [Number(m[2]), Number(m[3])]
  if (d1 < 1 || d2 < 1 || d1 > 32 || d2 > 32) return null
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

// 上游 cube.c:541-602 的逐格分类计数(enum_grid_squares + count_grid_square_callback):
// 每一类格子都要放得下均分给它的蓝面,总面积还要多出一格给立体落脚。
// solid 下标:0 四面体、1 立方体、2 八面体、3 二十面体;order 4 = 方格,其余三角格。
function roomFor(solid: number, d1: number, d2: number): boolean {
  if (!(solid >= 0 && solid <= 3) || d1 < 0 || d2 < 0) return false
  const order = solid === 1 ? 4 : 3
  const faces = [4, 6, 8, 20][solid]
  const kinds = solid === 0 ? 4 : solid === 2 ? 2 : 1
  const count = [0, 0, 0, 0]
  if (order === 4) {
    if (d1 <= 1 || d2 <= 1) return false
    count[0] = d1 * d2
  } else {
    if (d1 <= 0 && d2 <= 0) return false
    let firstix = -1
    for (let row = 0; row < d1 + d2; row++) {
      const other = row < d2 ? 1 : -1
      const rowlen = row < d2 ? row + d1 : 2 * d2 + d1 - row
      for (let i = 0; i < rowlen; i++) {
        let ix = 2 * i - (rowlen - 1)
        if (firstix < 0) firstix = ix & 3
        ix -= firstix
        count[kinds === 4 ? ((row + (ix & 1)) & 2) ^ (ix & 3) : kinds === 2 ? 1 : 0]++
      }
      for (let i = 0; i < rowlen + other; i++) {
        let ix = 2 * i - (rowlen + other - 1)
        if (firstix < 0) firstix = (ix - 1) & 3
        ix -= firstix
        count[kinds === 4 ? ((row + (ix & 1)) & 2) ^ (ix & 3) : 0]++
      }
    }
  }
  for (let k = 0; k < kinds; k++) if (count[k] < Math.floor(faces / kinds)) return false
  const area = order === 4 ? d1 * d2 : d1 * d1 + d2 * d2 + 4 * d1 * d2
  return area >= faces + 1
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
      // 宽的表取「高放到最大时放得下」:面积与各类计数都随高单调不减。
      int('Width / top', (r) =>
        range(0, CAP).filter((d1) => roomFor(r.pick('Type of solid'), d1, CAP)),
      ),
      int('Height / bottom', (r) =>
        range(0, CAP).filter((d2) => roomFor(r.pick('Type of solid'), r.int('Width / top'), d2)),
      ),
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
