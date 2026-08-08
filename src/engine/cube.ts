/**
 * Which way Cube's solid can roll from where it stands, worked out on this side.
 *
 * The only puzzle in the collection whose arrows are the whole game, and the
 * only one where an arrow that does nothing does not say so. Everywhere else a
 * dead arrow is a cursor visibly against a wall — the cursor is drawn, the edge
 * is drawn, and pressing into it is self-evidently nothing. Here the solid is
 * drawn over the square it is standing on, larger than the square, and it is
 * that square's shape that decides whether up or down exists at all. The reader
 * is asked to infer it from the tiling around a piece that covers the tiling.
 *
 * So this is the one place worth modelling upstream's geometry to grey a key,
 * and the line that keeps it from spreading is that sentence and not "an arrow
 * that would do nothing": Netslide and Sixteen have dead arrows on their border
 * ring too, and those stay lit, because there the cursor is on screen saying
 * where it is. What the board shows, we do not need to say.
 *
 * Two separate refusals have to be modelled, and missing either would leave a
 * key lit that does nothing:
 *
 *   - The square's own shape. `sq.directions[DOWN] = 0` on a down-pointing
 *     triangle and `[UP] = 0` on an up-pointing one (cube.c:404, 447), so on
 *     the three triangular solids exactly one of up and down is always dead.
 *     This is the invisible one.
 *   - The edge of the grid. `find_move_dest` walks every square looking for one
 *     that shares the two points of that direction, and returns -1 when there
 *     is none (cube.c:1099). This catches left and right as well.
 *
 * Nothing is kept here: the position is read out of the save file every time,
 * which makes this a derivation rather than a copy — see the note on mirrors in
 * ./keys. Undo, redo, restart and a restored game therefore need no handling of
 * their own; they change the save, and the next read sees it.
 *
 * Verified against the running engine on every square of every preset — 107
 * squares, four directions each, no disagreement. The harness drives the solid
 * over the whole grid depth-first and takes the truth from the back end itself:
 * save, send the arrow, save again, and a save that did not change is a move it
 * refused. Re-run it after any upstream bump; a model that has drifted greys a
 * key that works, which is the one failure nobody can see or report.
 */
import { done, fields, find } from './marks/save'

/** The four, in the order upstream's `directions` array numbers them. */
export const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const
const LEFT = 0
const RIGHT = 1
const UP = 2
const DOWN = 3

/** What `execute_move` reads: one letter per direction (cube.c:1239). */
const MOVES: Record<string, number> = { L: LEFT, R: RIGHT, U: UP, D: DOWN }

/**
 * A square of the grid: its corners, and which pair of them each direction
 * rolls over. A direction the shape forbids is simply absent.
 *
 * Corners are integers, not the floats upstream uses, and that is exact rather
 * than approximate: every x it writes is a half-integer and every y a multiple
 * of sqrt(3)/2, so doubling x and counting y in rows loses nothing. It also
 * retires `find_move_dest`'s `dist < 0.1F` — with integers, shared corners are
 * equal rather than near.
 */
type Square = { pts: [number, number][]; dirs: (readonly [number, number] | undefined)[] }

type Params = { solid: string; d1: number; d2: number }

/** `encode_params` (cube.c:316): the solid's letter, then the two dimensions. */
export function parseParams(text: string): Params | null {
  const m = /^([tcoi])(\d+)x(\d+)$/.exec(text.trim())
  if (!m) return null
  const [d1, d2] = [Number(m[2]), Number(m[3])]
  // The config box refuses these too. A grid we would spend real time
  // enumerating is a grid nobody typed on purpose.
  if (d1 < 1 || d2 < 1 || d1 > 32 || d2 > 32) return null
  return { solid: m[1], d1, d2 }
}

/**
 * Every square, in the order `enum_grid_squares` emits them — which is the
 * index everything else here counts in, because the callback that receives them
 * appends (cube.c:325-467).
 */
function squares({ solid, d1, d2 }: Params): Square[] {
  const out: Square[] = []
  if (solid === 'c') {
    for (let y = 0; y < d2; y++)
      for (let x = 0; x < d1; x++)
        out.push({
          pts: [[2 * x - 1, 2 * y - 1], [2 * x - 1, 2 * y + 1],
                [2 * x + 1, 2 * y + 1], [2 * x + 1, 2 * y - 1]],
          // A square has no diagonals and no forbidden side.
          dirs: [[0, 1], [2, 3], [0, 3], [1, 2]],
        })
    return out
  }
  for (let row = 0; row < d1 + d2; row++) {
    const other = row < d2 ? 1 : -1
    const rowlen = row < d2 ? row + d1 : 2 * d2 + d1 - row
    // The down-pointing ones first, then the up-pointing, which is the order
    // the two loops in the C run in.
    for (let i = 0; i < rowlen; i++) {
      const ix = 2 * i - (rowlen - 1)
      out.push({
        pts: [[ix - 1, row], [ix, row + 1], [ix + 1, row]],
        dirs: [[0, 1], [1, 2], [0, 2], undefined],   // flat side up: no down
      })
    }
    for (let i = 0; i < rowlen + other; i++) {
      const ix = 2 * i - (rowlen + other - 1)
      out.push({
        pts: [[ix + 1, row + 1], [ix, row], [ix - 1, row + 1]],
        dirs: [[1, 2], [0, 1], undefined, [0, 2]],   // flat side down: no up
      })
    }
  }
  return out
}

/**
 * `find_move_dest` (cube.c:1054), as a table.
 *
 * Upstream asks the question by scanning every square for one that shares the
 * two corners, which is fine once per keypress in C and would be a scan per
 * direction per move here. An edge belongs to at most two squares, so filing
 * the squares under their edges answers the same question by lookup.
 */
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

/** Where a roll in this direction lands, or -1 for a direction that is refused. */
function neighbour({ sqs, across }: Grid, from: number, dir: number): number {
  const pair = sqs[from]?.dirs[dir]
  if (!pair) return -1                              // the shape forbids it
  const both = across.get(edge(sqs[from], pair))
  return both?.find((i) => i !== from) ?? -1        // or the grid ends here
}

/**
 * One grid per set of parameters, because a deal does not change the shape.
 *
 * Held rather than rebuilt because this is read after every single move, and
 * a deal only ever has one shape — a new game with the same parameters wants
 * the same table. One entry, since one puzzle is mounted at a time.
 */
let cached: { key: string; grid: Grid } | null = null

function gridFor(text: string): Grid | null {
  if (cached?.key === text) return cached.grid
  const params = parseParams(text)
  if (!params) return null
  cached = { key: text, grid: build(params) }
  return cached.grid
}

/** The starting square, which the description carries after its comma. */
const startOf = (desc: string) => {
  const at = desc.indexOf(',')
  if (at < 0) return -1
  const n = Number(desc.slice(at + 1))
  return Number.isInteger(n) && n >= 0 ? n : -1
}

/**
 * Which arrows would move the solid, or null for a board we cannot read.
 *
 * Null is the answer that changes nothing: the caller leaves all four live,
 * which is how every other puzzle's arrows behave and how this one behaved
 * before. Guessing here would grey a key that works.
 */
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
    // A restart is a state like any other and carries the description it went
    // back to, so it is followed by reading that description rather than by
    // remembering this one. Cube has no solver, so there is no third kind.
    if (move.key === 'RESTART') {
      at = startOf(move.value)
      if (at < 0 || at >= grid.sqs.length) return null
      continue
    }
    if (move.key !== 'MOVE') return null
    const dir = MOVES[move.value]
    if (dir === undefined) return null
    const next = neighbour(grid, at, dir)
    // A move in the list is one the back end accepted, so a model that says it
    // was impossible is a model that has drifted. Refuse the board rather than
    // grey a key on the strength of it.
    if (next < 0) return null
    at = next
  }

  return new Set(ARROWS.filter((_, dir) => neighbour(grid, at, dir) >= 0))
}
