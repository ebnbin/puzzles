import { latinGroups, leadingNumber, runLengthGrid } from './desc'
import type { Field } from './save'
import { find } from './save'
import type { Board } from './board'
import { gridMoves } from './board'

function line(index: number, size: number): { start: number; step: number } {
  if (index < size) return { start: index, step: size }
  if (index < 2 * size)
    return { start: (size - 1) * size + (index - size), step: -size }
  if (index < 3 * size) return { start: size * (index - 2 * size), step: 1 }
  return { start: size * (index - 3 * size) + (size - 1), step: -1 }
}

export function readTowers(lines: Field[]): Board | null {
  const size = leadingNumber(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS'))
  if (!size) return null
  const area = size * size

  const desc = find(lines, 'DESC') ?? ''
  const comma = desc.indexOf(',')
  const head = comma < 0 ? desc : desc.slice(0, comma)
  const parts = head.split('/')
  if (parts.length !== 4 * size) return null

  const clues = parts.map((text) => {
    if (text === '') return 0
    if (!/^\d+$/.test(text)) return -1
    const n = Number(text)
    return n >= 1 && n <= size ? n : -1
  })
  if (clues.some((n) => n < 0)) return null

  let grid = new Array<number>(area).fill(0)
  if (comma >= 0) {
    const described = runLengthGrid(desc.slice(comma + 1), area)
    if (!described || described.rest !== '') return null
    grid = described.grid
  }

  return {
    squares: area,
    values: Array.from({ length: size }, (_, i) => i + 1),
    each: size,
    clues: grid,
    groups: latinGroups(size),
    moves: gridMoves(size, /^D-?\d+,-?\d+$/),
    narrow: (candidates, values) => {
      for (let index = 0; index < clues.length; index++) {
        const clue = clues[index]
        if (!clue) continue
        const { start, step } = line(index, size)
        for (let i = 0; i < size; i++) {
          const cell = start + i * step
          if (values[cell]) continue
          const most = size - clue + 1 + i
          for (const n of [...candidates[cell]]) if (n > most) candidates[cell].delete(n)
        }
        if (clue === 1 && !values[start]) {
          for (const n of [...candidates[start]]) if (n !== size) candidates[start].delete(n)
        }
      }
    },
  }
}
