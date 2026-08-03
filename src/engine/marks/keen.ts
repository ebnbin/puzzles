import { blockCells, dividerBlocks, latinGroups, leadingNumber } from './desc'
import type { Field } from './save'
import { find } from './save'
import type { Board } from './board'
import { gridMoves } from './board'
import { cageDigits } from './cage'
import type { CageOp } from './cage'

/**
 * Keen: a Latin square whose only clues are the arithmetic on its cages.
 *
 * Nothing is given, so like a Killer board the rows and columns have nothing
 * to say until the reader has played something. The cages are the board.
 *
 * The description is the cage shapes and then one clue per cage. The shapes
 * are the same walk along the dividing lines Solo uses for a jigsaw, with two
 * differences worth knowing before copying: a letter may carry a repeat count
 * — `a3` for three of them, which Solo never needs because its blocks are all
 * one size — and the letter that spells a run without ending it is `y` here
 * where Solo makes it `z`. See desc.ts.
 *
 * The clues come in the order of each cage's lowest square, which is what
 * `dsf_minimal` picks out and what dividerBlocks numbers by. Each is an
 * operation and a total: `a` add, `m` multiply, `s` subtract, `d` divide — or
 * `n`, which carries no total and says the cage has no clue at all.
 * Subtraction and division are two squares by construction.
 */

const OPS: Record<string, CageOp> = { a: 'a', m: 'm', s: 's', d: 'd' }

export function readKeen(lines: Field[]): Board | null {
  const size = leadingNumber(find(lines, 'CPARAMS') ?? find(lines, 'PARAMS'))
  if (!size) return null
  const area = size * size

  const desc = find(lines, 'DESC') ?? ''
  const comma = desc.indexOf(',')
  if (comma < 0) return null
  const block = dividerBlocks(desc.slice(0, comma), size, { open: 25, repeats: true })
  if (!block) return null

  const cells = blockCells(block)
  // Every square in exactly one cage, and no cage empty. A cage may be any
  // size here — unlike Solo's blocks there is nothing else to hold it to.
  if (cells.length === 0 || cells.some((c) => !c || c.length === 0)) return null

  const cages: { cells: number[]; value: number; op: CageOp }[] = []
  let at = comma + 1
  const text = desc
  for (const group of cells) {
    const kind = text[at]
    at += 1
    if (kind === 'n') {
      continue
    }
    const op = OPS[kind]
    if (!op) return null
    const number = /^\d+/.exec(text.slice(at))
    if (!number) return null
    at += number[0].length
    if ((op === 's' || op === 'd') && group.length !== 2) return null
    cages.push({ cells: group, value: Number(number[0]), op })
  }
  // The clues have to run out exactly with the cages: one over or one under
  // means the shapes were misread, and every clue after that belongs to the
  // wrong squares.
  if (at !== text.length) return null

  return {
    squares: area,
    values: Array.from({ length: size }, (_, i) => i + 1),
    clues: new Array<number>(area).fill(0),
    groups: latinGroups(size),
    moves: gridMoves(size),
    narrow: (candidates, values) => {
      for (const { cells: group, value: total, op } of cages) {
        // Keen lets a digit repeat inside a cage as long as the Latin square
        // does — two squares of one cage in different rows and columns may
        // match, which Killer forbids outright.
        const allowed = cageDigits(group, total, op, size, candidates, values, false)
        if (!allowed) continue
        group.forEach((cell, i) => {
          if (values[cell]) return
          for (const n of [...candidates[cell]])
            if (!allowed[i].has(n)) candidates[cell].delete(n)
        })
      }
    },
  }
}
