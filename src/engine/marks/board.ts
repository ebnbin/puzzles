/**
 * What one of these four boards comes down to, once its description has been
 * read: how big it is, what was dealt, which squares may not repeat each other,
 * and what its own clues forbid on top of that.
 *
 * The split between the last two is the split between the two keys. `groups`
 * is what the squares already filled in rule out — the same rule everywhere,
 * and the only one that needs no knowledge of the puzzle beyond its shape.
 * `narrow` is what the puzzle's own clues rule out: a cage that cannot add up,
 * a sign that cannot point that way, a row that cannot be seen from there.
 *
 * Both stop at the same place. Neither looks at where a digit could go
 * *elsewhere* — that a digit fits only one square of its row is a deduction,
 * and deductions are the reader's. What these do is copy out what the board
 * already says.
 */
export type Board = {
  /** The side of the grid. Digits run 1 to this. */
  size: number
  /** What was dealt, in reading order; 0 for a square left empty. */
  clues: number[]
  /** Sets of squares that must all differ: rows, columns, blocks, diagonals. */
  groups: number[][]
  /**
   * What the puzzle's own clues forbid, applied to the squares those clues
   * name. Called after the groups have had their say, and free to use the
   * digits already placed. Absent for a board whose clues are all in `groups`
   * to begin with.
   */
  narrow?: (candidates: Set<number>[], digits: number[]) => void
  /**
   * Moves this game makes that change neither the digits nor the marks —
   * Towers crossing a clue off, Unequal spending a sign. They have to be
   * recognised to be skipped, because an unrecognised move means a board we
   * would be guessing at.
   */
  passthrough: RegExp
}
