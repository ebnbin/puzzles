import { blockCells, dividerBlocks, latinGroups, runLengthGrid } from './desc'
import type { Field } from './save'
import { find } from './save'
import type { Board } from './board'
import { gridMoves } from './board'
import { cageDigits } from './cage'

function params(
  text: string,
): { c: number; r: number; xtype: boolean; killer: boolean } | null {
  const first = /^(\d+)/.exec(text)
  if (!first) return null
  let c = Number(first[1])
  let r = c
  let seenR = false
  let at = first[1].length

  if (text[at] === 'x') {
    const second = /^(\d+)/.exec(text.slice(at + 1))
    if (!second) return null
    r = Number(second[1])
    seenR = true
    at += 1 + second[1].length
  }

  let xtype = false
  let killer = false
  while (at < text.length) {
    const ch = text[at]
    if (ch === 'j') {
      at += 1
      if (seenR) c *= r
      r = 1
    } else if (ch === 'x') {
      at += 1
      xtype = true
    } else if (ch === 'k') {
      at += 1
      killer = true
    } else if (ch === 'r' || ch === 'm' || ch === 'a') {
      at += 1
      if (ch === 'm' && text[at] === 'd') at += 1
      while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    } else if (ch === 'd') {
      at += 1
      if (!'tbiaeu'.includes(text[at])) return null
      at += 1
    } else {
      return null
    }
  }

  const cr = c * r
  if (!Number.isInteger(cr) || cr < 1 || cr > 36) return null
  return { c, r, xtype, killer }
}

function blocksAreSound(block: number[], size: number): boolean {
  const counts = new Array<number>(size).fill(0)
  for (const b of block) {
    if (!Number.isInteger(b) || b < 0 || b >= size) return false
    counts[b] += 1
  }
  return counts.every((n) => n === size)
}

export function readSolo(lines: Field[]): Board | null {
  const parsed = params(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS') ?? '')
  if (!parsed) return null
  const { c, r, xtype, killer } = parsed
  const size = c * r
  const area = size * size

  const described = runLengthGrid(find(lines, 'PRIVDESC') ?? find(lines, 'DESC') ?? '', area)
  if (!described) return null

  let rest = described.rest
  let block: number[] | null
  if (r === 1) {
    if (rest[0] !== ',') return null
    const section = rest.slice(1).split(',')[0]
    block = dividerBlocks(section, size, { open: 26, repeats: false })
    rest = rest.slice(1 + section.length)
  } else {
    block = Array.from({ length: area }, (_, i) => {
      const x = i % size
      const y = (i - x) / size
      return Math.floor(y / c) * c + Math.floor(x / r)
    })
  }
  if (!block || !blocksAreSound(block, size)) return null

  const groups = latinGroups(size)
  for (const cells of blockCells(block)) groups.push(cells)
  if (xtype) {
    groups.push(Array.from({ length: size }, (_, i) => i * size + i))
    groups.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)))
  }

  const board: Board = {
    squares: area,
    values: Array.from({ length: size }, (_, i) => i + 1),
    each: size,
    clues: described.grid,
    groups,
    moves: gridMoves(size),
  }

  if (!killer) return board

  if (rest[0] !== ',') return null
  const cageSection = rest.slice(1).split(',')[0]
  const cage = dividerBlocks(cageSection, size, { open: 26, repeats: false })
  if (!cage) return null
  rest = rest.slice(1 + cageSection.length)
  if (rest[0] !== ',') return null
  const totals = runLengthGrid(rest.slice(1), area)
  if (!totals || totals.rest !== '') return null

  const cages = blockCells(cage).map((cells) => ({
    cells,
    total: cells.map((i) => totals.grid[i]).find((n) => n > 0) ?? 0,
  }))

  board.narrow = (candidates, values) => {
    for (const { cells, total } of cages) {
      if (!total) continue
      const allowed = cageDigits(cells, total, 'a', size, candidates, values, true)
      if (!allowed) continue
      cells.forEach((cell, i) => {
        if (values[cell]) return
        for (const n of [...candidates[cell]]) if (!allowed[i].has(n)) candidates[cell].delete(n)
      })
    }
  }
  return board
}
