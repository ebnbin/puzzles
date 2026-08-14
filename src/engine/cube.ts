import { done, fields, find } from './marks/save'

export const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const
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

function neighbour({ sqs, across }: Grid, from: number, dir: number): number {
  const pair = sqs[from]?.dirs[dir]
  if (!pair) return -1
  const both = across.get(edge(sqs[from], pair))
  return both?.find((i) => i !== from) ?? -1
}

let cached: { key: string; grid: Grid } | null = null

function gridFor(text: string): Grid | null {
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
