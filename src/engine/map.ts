import { done, extend, fields, find, line, pending } from './marks/save'
import type { Drawn } from './renderer'
import type { PuzzleApi } from './types'

export const COLOURS = 4

export type Spot = { x: number; y: number }

export type Paint = { colour: number; pencil?: boolean }

export function mapSize(params: string) {
  const m = /^(\d+)x(\d+)n(\d+)/.exec(params)
  if (!m) return null
  const [w, h, n] = [+m[1], +m[2], +m[3]]
  return w > 0 && h > 0 && n > 0 && n <= w * h ? { w, h, n } : null
}

export function stepCursor(at: Spot, key: string, grid: { w: number; h: number }): Spot {
  const { x, y } = at
  switch (key) {
    case 'ArrowLeft': return { x: Math.max(x - 1, 0), y }
    case 'ArrowRight': return { x: Math.min(x + 1, grid.w - 1), y }
    case 'ArrowUp': return { x, y: Math.max(y - 1, 0) }
    case 'ArrowDown': return { x, y: Math.min(y + 1, grid.h - 1) }
    default: return at
  }
}

function clues(n: number, desc: string) {
  const list = desc.split(',')[1]
  if (list === undefined) return null
  const colour = new Array<number>(n).fill(-1)
  const given = new Array<boolean>(n).fill(false)
  let r = 0
  for (const ch of list) {
    if (ch >= '0' && ch < String.fromCharCode(48 + COLOURS)) {
      if (r >= n) return null
      colour[r] = +ch
      given[r] = true
      r++
    } else if (ch >= 'a' && ch <= 'z') r += ch.charCodeAt(0) - 96
    else return null
  }
  return r === n ? { colour, given } : null
}

function replay(moves: { key: string; value: string }[], start: ReturnType<typeof clues>, desc: string) {
  if (!start) return null
  const colour = [...start.colour]
  const pencil = new Array<number>(colour.length).fill(0)
  for (const move of moves) {
    if (move.key === 'RESTART') {
      if (move.value !== desc) return null
      for (let r = 0; r < colour.length; r++) { colour[r] = start.colour[r]; pencil[r] = 0 }
      continue
    }
    if (move.key === 'SOLVE') return null
    for (const step of move.value.split(';')) {
      const m = /^(p?)(C|[0-9]):(\d+)$/.exec(step)
      if (!m) return null
      const r = +m[3]
      const c = m[2] === 'C' ? -1 : +m[2]
      if (r >= colour.length || c >= COLOURS) return null
      if (m[1]) {
        if (c < 0) pencil[r] = 0
        else pencil[r] ^= 1 << c
      } else {
        colour[r] = c
        pencil[r] = 0
      }
    }
  }
  return { colour, pencil }
}

const wording = (paint: Paint, at: { colour: number; pencil: number }, r: number) => {
  if (paint.pencil) {
    if (at.colour >= 0 || paint.colour < 0) return null
    return `p${paint.colour}:${r}`
  }
  if (at.colour === paint.colour && (paint.colour >= 0 || at.pencil === 0)) return null
  return `${paint.colour < 0 ? 'C' : paint.colour}:${r}`
}

export function paintRegion(api: PuzzleApi, at: Spot, paint: Paint): void {
  const orig = api.saveGame()
  const lines = fields(orig)
  if (!lines) return
  const params = find(lines, 'PARAMS')
  const desc = find(lines, 'DESC')
  const kept = done(lines)
  if (params === undefined || desc === undefined || !kept) return
  const grid = mapSize(params)
  if (!grid) return
  const start = clues(grid.n, desc)
  const stood = replay(kept, start, desc)
  if (!start || !stood) return

  const key = (k: string) => api.key(0, k, '', 0, 0, 0)
  const walk = (to: Spot) => {
    key('ArrowLeft')
    for (let i = 0; i < to.x; i++) key('ArrowRight')
    for (let i = 0; i < to.y; i++) key('ArrowDown')
  }
  const restore = () => { api.loadGame(orig); walk(at) }

  let region: number | null = null
  const paint0 = Array.from({ length: grid.n }, (_, r) => `0:${r}`).join(';')
  api.loadGame(extend(lines, kept, [paint0]) ?? orig)
  walk(at)
  key('Enter')
  key('Enter')
  const played = done(fields(api.saveGame()) ?? [])
  if (played && played.length > kept.length + 1) {
    const m = /^C:(\d+)$/.exec(played[played.length - 1].value)
    if (m) region = +m[1]
  }
  if (region === null || region >= grid.n || start.given[region]) return restore()

  const move = wording(paint, { colour: stood.colour[region], pencil: stood.pencil[region] }, region)
  if (!move) return restore()
  const next = extend(lines, kept, [move])
  if (!next) return restore()
  const held = pending(next)
  api.loadGame(held ?? next)
  if (held) api.redo()
  walk(at)
}

const COL_BACKGROUND = 0

export type Clues = {
  w: number
  h: number
  top: Uint8Array
  bottom: Uint8Array
  apexRight: Uint8Array
}

export function readClues(
  api: PuzzleApi,
  renderer: { record(): void; stop(): Drawn[] },
  grid: { w: number; h: number },
): Clues | null {
  const save = api.saveGame()
  const lines = fields(save)
  if (!lines) return null
  const dealt = lines
    .map((f) => line(f.key, f.key === 'STATEPOS' ? '1' : f.value))
    .join('')

  renderer.record()
  let tape: Drawn[]
  try {
    api.loadGame(dealt)
  } finally {
    tape = renderer.stop()
    api.loadGame(save)
  }
  return readTape(tape, grid)
}

export function readTape(tape: Drawn[], grid: { w: number; h: number }): Clues | null {
  const { w, h } = grid
  const squares = new Map<number, Drawn & { kind: 'rect' }>()
  const sizes = new Map<number, number>()
  for (const d of tape)
    if (d.kind === 'rect' && d.w === d.h && d.w > 2)
      sizes.set(d.w, (sizes.get(d.w) ?? 0) + 1)
  let tile = 0
  for (const [size, count] of sizes) if (count >= w * h && (!tile || size < tile)) tile = size
  if (!tile) return null

  let ox = Infinity
  let oy = Infinity
  for (const d of tape)
    if (d.kind === 'rect' && d.w === tile && d.h === tile) {
      ox = Math.min(ox, d.x)
      oy = Math.min(oy, d.y)
    }
  const cell = (x: number, y: number) => {
    const cx = Math.round((x - ox) / tile)
    const cy = Math.round((y - oy) / tile)
    return cx >= 0 && cx < w && cy >= 0 && cy < h ? cy * w + cx : -1
  }

  for (const d of tape)
    if (d.kind === 'rect' && d.w === tile && d.h === tile) {
      const i = cell(d.x, d.y)
      if (i >= 0) squares.set(i, d)
    }
  if (squares.size !== w * h) return null

  const top = new Uint8Array(w * h)
  const bottom = new Uint8Array(w * h)
  const apexRight = new Uint8Array(w * h)
  for (const [i, d] of squares) {
    const clue = d.colour !== COL_BACKGROUND ? 1 : 0
    top[i] = clue
    bottom[i] = clue
  }
  for (const d of tape) {
    if (d.kind !== 'poly' || d.points.length !== 6) continue
    const xs = [d.points[0], d.points[2], d.points[4]]
    const ys = [d.points[1], d.points[3], d.points[5]]
    const i = cell(
      (Math.min(...xs) + Math.max(...xs)) / 2 - tile / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2 - tile / 2,
    )
    if (i < 0) continue
    bottom[i] = d.colour !== COL_BACKGROUND ? 1 : 0
    apexRight[i] = d.points[2] > (Math.min(...xs) + Math.max(...xs)) / 2 ? 1 : 0
  }
  return { w, h, top, bottom, apexRight }
}

export function clueAt(clues: Clues, at: Spot, dir: string): boolean {
  const i = at.y * clues.w + at.x
  if (i < 0 || i >= clues.top.length) return false
  const quadrant =
    dir === 'ArrowUp' ? 'TE' :
    dir === 'ArrowDown' ? 'BE' :
    dir === 'ArrowLeft' ? 'LE' :
    dir === 'ArrowRight' ? 'RE' : 'BE'
  const withTop =
    quadrant === 'TE' ? true :
    quadrant === 'BE' ? false :
    quadrant === 'LE' ? clues.apexRight[i] === 1 : clues.apexRight[i] === 0
  return (withTop ? clues.top[i] : clues.bottom[i]) === 1
}
