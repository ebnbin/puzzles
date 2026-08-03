import { latinGroups, leadingNumber, runLengthGrid } from './desc'
import type { Field } from './save'
import { find } from './save'
import type { Board } from './board'
import { gridMoves } from './board'

/**
 * Towers: a Latin square of building heights, seen from outside.
 *
 * The whole of a fresh Towers board is around its edge — the grid is empty,
 * so the rows and columns have nothing to rule out and the clue rule is not an
 * extra here, it is the only thing there is.
 *
 * A clue counts the towers visible looking down its line: a tower is visible if
 * nothing before it is taller. From that, two facts about a single square, and
 * neither needs to look at any other line:
 *
 *   - the square `i` places in from a clue of `k` can be at most
 *     `size - k + 1 + i`. Because k towers must be seen, and each of the k-1
 *     seen after this one has to be taller than it, and they have to fit;
 *   - a clue of `size` sees everything, so the line is 1, 2, 3, … in order and
 *     each square is pinned. That falls out of the bound above at i = 0 and is
 *     stated by it for the rest.
 *
 * A clue of 1 pins the near square to the tallest, which is the bound read the
 * other way and is the one case it does not give: the bound at k=1 is `size`,
 * which rules nothing out. So it is added.
 *
 * The description is the clues, `/` separated, in the order towers.c's
 * STARTSTEP macro reads them — the columns downwards, the columns upwards, the
 * rows rightwards, the rows leftwards — optionally followed by a grid. The
 * deals this collection makes carry no grid, but a typed game id may.
 */

/** Where a clue's line starts and how it steps, from towers.c's STARTSTEP. */
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
    clues: grid,
    groups: latinGroups(size),
    /*
     * Crossing a clue off as dealt with. It marks the clue, not the grid.
     *
     * The minus sign is not decoration: a clue is addressed by where it sits,
     * which is outside the grid — `-1` above or to the left of it, `w` below or
     * to the right (towers.c's `is_clue`). Without it, crossing off a clue on
     * the top or left edge is a move this cannot read, and a move it cannot
     * read makes it refuse the whole board — so the keypad would go quiet, for
     * good, with nothing said.
     */
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
        // Seeing exactly one means the nearest is the tallest, which the bound
        // above cannot say: at k = 1 it allows everything.
        if (clue === 1 && !values[start]) {
          for (const n of [...candidates[start]]) if (n !== size) candidates[start].delete(n)
        }
      }
    },
  }
}
