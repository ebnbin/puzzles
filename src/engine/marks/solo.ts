import { blockCells, dividerBlocks, latinGroups, runLengthGrid } from './desc'
import type { Field } from './save'
import { find } from './save'
import type { Board } from './board'
import { cageDigits } from './cage'

/**
 * Solo: rows, columns and blocks, plus the diagonals of an X board and the
 * cages of a Killer one.
 *
 * The blocks are the interesting part of the description. A rectangular board
 * does not write them down at all — they are `(y/c)*c + (x/r)`, which is `r`
 * wide and `c` tall, so a 2x3 board has blocks three across and two down. A
 * jigsaw board has no formula and spells its blocks out; a Killer board spells
 * out a second set of blocks for its cages, and then a grid holding each cage's
 * total in one of its squares.
 */

/**
 * The parameters, read the way solo.c's `decode_params` reads them.
 *
 * Two turns in it. The leading number is both dimensions unless an `x` supplies
 * the second; and a `j` collapses the blocks into one row of `c*r`, which is
 * how a jigsaw board says its blocks are not rectangles and live in the
 * description instead. `x` after the size is the diagonals, `k` is Killer.
 *
 * Where the C eats an unknown character and carries on, this refuses. A
 * parameter string with something in it we have never seen is a board whose
 * rules we cannot claim to know.
 */
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
      // Symmetry, which says nothing about how the board is played.
      at += 1
      if (ch === 'm' && text[at] === 'd') at += 1
      while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    } else if (ch === 'd') {
      // Difficulty, likewise: it shaped the deal and is spent.
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

/** Every block holds exactly `size` squares, and there are exactly `size`. */
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

  // The initial state is built from PRIVDESC where there is one, which is what
  // the midend does; Solo has never written one, and this costs a line.
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
    size,
    clues: described.grid,
    groups,
    // Solo has no move of its own beyond the three every one of these speaks.
    passthrough: /^$/,
  }

  if (!killer) return board

  /*
   * The cages, which is the whole of what a Killer board says: its grid of
   * clues is empty, so without these there is nothing at all to eliminate from
   * and the key does exactly what upstream's `M` does.
   *
   * Two more sections of description — the cage shapes, then a grid carrying
   * each cage's total in one of its squares and nothing in the others
   * (solo.c reads it back the same way, scanning a cage for the non-zero).
   */
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

  board.narrow = (candidates, digits) => {
    for (const { cells, total } of cages) {
      if (!total) continue
      // A cage's squares are all in one block often enough, but never
      // guaranteed to share a row or column — so what may not repeat inside it
      // is only what the groups already say. Killer's own rule is that a cage
      // holds no digit twice, which solo.c's solver uses and which is stated
      // here rather than derived.
      const allowed = cageDigits(cells, total, 'a', size, candidates, digits, true)
      if (!allowed) continue
      cells.forEach((cell, i) => {
        if (digits[cell]) return
        for (const n of [...candidates[cell]]) if (!allowed[i].has(n)) candidates[cell].delete(n)
      })
    }
  }
  return board
}
