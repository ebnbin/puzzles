/**
 * Which digits a cage can still hold, given what it has to add up to.
 *
 * Shared by Keen, whose whole board is cages, and by Solo's Killer boards,
 * whose grid of clues is empty so that the cages are all there is. The two
 * differ only in which operations occur and whether a digit may repeat inside
 * a cage: Killer says it may not, Keen lets it as long as the Latin square
 * does — two squares of one cage in different rows and columns may match.
 *
 * The answer is exact rather than approximate: every assignment that satisfies
 * the clue is enumerated, and a digit survives in a square if it appears in one
 * of them. That is more than the local rule needs to be — the cheap version
 * would be bounds arithmetic — but a cage is small and the exact answer is the
 * one a reader would work out by hand, which is the standard the rest of this
 * holds to.
 *
 * Enumerated with a cap. A Killer cage may be as large as the grid, and nine
 * digits over ten squares is more than anything here should spend, so past the
 * cap it gives up and says so. Giving up leaves the candidates as they were,
 * which is the safe direction: too many marks is untidy, too few is wrong.
 */

/** Nodes before it stops. Reached only by cages far larger than any deal. */
const LIMIT = 200_000

export type CageOp = 'a' | 'm' | 's' | 'd'

/**
 * The digits each square of the cage can take, or null to leave it alone.
 *
 * Null means either that the cage was too big to enumerate or that nothing
 * satisfies it — and the second is not this function's business to complain
 * about. A cage with no solution means the reader has put something wrong on
 * the board, and the marks around it are worked out against the board as it
 * stands; refusing to touch them is exactly right.
 */
export function cageDigits(
  cells: number[],
  value: number,
  op: CageOp,
  size: number,
  candidates: Set<number>[],
  digits: number[],
  /** Killer's rule: no digit twice in a cage, whatever the rows say. */
  distinct: boolean,
): Set<number>[] | null {
  const count = cells.length
  const options = cells.map((cell) =>
    digits[cell] ? [digits[cell]] : [...candidates[cell]].sort((a, b) => a - b),
  )
  if (options.some((list) => list.length === 0)) return null

  const seen = cells.map(() => new Set<number>())

  /*
   * Subtraction and division are two squares by construction — upstream
   * refuses them anywhere else — and are stated without an order, so both ways
   * round count. Enumerated directly rather than through the walk below, which
   * has nowhere to carry "either of these minus the other".
   */
  if (op === 's' || op === 'd') {
    if (count !== 2) return null
    let any = false
    for (const a of options[0]) {
      for (const b of options[1]) {
        if (clash(cells, size, distinct, 0, 1, a, b)) continue
        const fits =
          op === 's' ? Math.abs(a - b) === value : a === b * value || b === a * value
        if (!fits) continue
        seen[0].add(a)
        seen[1].add(b)
        any = true
      }
    }
    return any ? seen : null
  }

  const chosen = new Array<number>(count)
  let visited = 0
  let stopped = false
  let any = false

  const walk = (at: number, acc: number) => {
    if (stopped) return
    if (++visited > LIMIT) {
      stopped = true
      return
    }
    if (at === count) {
      if (acc !== value) return
      for (let i = 0; i < count; i++) seen[i].add(chosen[i])
      any = true
      return
    }
    for (const n of options[at]) {
      let bad = false
      for (let j = 0; j < at && !bad; j++)
        if (chosen[j] === n) bad = clash(cells, size, distinct, at, j, n, n)
      if (bad) continue

      const next = op === 'a' ? acc + n : acc * n
      if (op === 'a') {
        // Sorted ascending, so once the rest cannot be squeezed under the
        // total there is nothing further along this list to try either.
        if (next + (count - at - 1) > value) break
      } else if (value % next !== 0) {
        continue
      }
      chosen[at] = n
      walk(at + 1, next)
      if (stopped) return
    }
  }
  walk(0, op === 'a' ? 0 : 1)

  return stopped || !any ? null : seen
}

/**
 * Whether two squares of a cage may not hold the same digit.
 *
 * Always when the cage forbids repeats; otherwise only when the Latin square
 * already forbids it, which is to say when they share a row or a column.
 */
function clash(
  cells: number[],
  size: number,
  distinct: boolean,
  i: number,
  j: number,
  a: number,
  b: number,
): boolean {
  if (a !== b) return false
  if (distinct) return true
  const one = cells[i]
  const two = cells[j]
  return one % size === two % size || Math.floor(one / size) === Math.floor(two / size)
}
