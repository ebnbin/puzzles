import type { Spot } from './map'
import { fields, find } from './marks/save'

export type Square = 'T' | 'N' | 'B'

export function tentsGrid(params: string): { w: number; h: number } | null {
  const m = /^(\d+)x(\d+)/.exec(params)
  if (!m) return null
  const w = +m[1]
  const h = +m[2]
  return w > 0 && h > 0 ? { w, h } : null
}

const PLACE = /^([TNB])(\d+),(\d+)$/

function written(save: string): Map<string, Square> | null {
  const lines = fields(save)
  if (!lines) return null
  const at = Number(find(lines, 'STATEPOS'))
  if (!Number.isInteger(at) || at < 1) return null
  const grid = new Map<string, Square>()
  let played = 0
  for (const f of lines) {
    if (f.key !== 'MOVE' && f.key !== 'SOLVE' && f.key !== 'RESTART') continue
    if (++played >= at) break
    if (f.key === 'RESTART') {
      grid.clear()
      continue
    }
    const parts = f.value.split(';')
    if (f.key === 'SOLVE') {
      if (parts[0] !== 'S') return null
      grid.clear()
      parts.shift()
    }
    for (const part of parts) {
      const m = PLACE.exec(part)
      if (!m) return null
      grid.set(`${m[2]},${m[3]}`, m[1] as Square)
    }
  }
  return grid
}

export function squareAt(save: string, at: Spot): Square | null {
  const grid = written(save)
  return grid && (grid.get(`${at.x},${at.y}`) ?? 'B')
}
