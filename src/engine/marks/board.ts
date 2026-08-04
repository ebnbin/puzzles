/**
 * What a board with pencil marks comes down to, once its description has been
 * read — and, separately, how to talk to it.
 *
 * Those are two different things, and keeping them apart is what lets Undead in
 * beside the other four. The first four are a square grid of digits addressed
 * by x and y; Undead is a flat run of the squares that are not mirrors, holding
 * one of three monsters, addressed by how far along that run they are. Nothing
 * about a row, a cage or a sight line cares which of those it is, so `Board`
 * counts squares and numbers values and says no more; `MoveLanguage` is where
 * the spelling lives.
 */

/** One thing a move does. A move string may carry several — see `read`. */
export type Step =
  /**
   * A value put in a square, or 0 for emptied.
   *
   * Whether the marks under it go with it is the game's own answer and not the
   * same one everywhere: the four grid games clear them on the way past, and
   * Undead does not — only its `E` clears, while `G`, `V` and `Z` leave what is
   * written under the monster they place. Invisible on screen, since a square
   * holding a monster draws no marks, but this has to model the state the
   * engine actually keeps rather than the one it shows.
   */
  | { kind: 'set'; square: number; value: number; clears: boolean }
  /** One mark turned on if it was off, off if it was on. */
  | { kind: 'toggle'; square: number; value: number }
  /** Every mark in every empty square, which is upstream's `M`. */
  | { kind: 'fill' }
  /** A move that touches neither the values nor the marks. */
  | { kind: 'ignore' }

/**
 * How a game spells the moves this side needs to read and to write.
 *
 * Reading has to cover every move the game can make, not only ours: a move
 * nobody here recognises means a board we would be guessing at, so `read`
 * returns null and the whole thing is refused.
 */
export type MoveLanguage = {
  /** What this move does, or null if it is not one we can follow. */
  read(text: string): Step[] | null
  /** Turn one mark over. */
  toggle(square: number, value: number): string
  /** Put a value in a square. */
  set(square: number, value: number): string
  /** Take every mark out of one square. */
  wipe(square: number): string
  /**
   * What joins two moves into one, where the game allows it — Undead's
   * `execute_move` loops until the string runs out, so a whole board's worth of
   * marks is one move and one step back out. The other four do one thing per
   * move string, and leave this unset.
   */
  chain?: string
}

export type Board = {
  /** How many squares there are. They are numbered 0 to this. */
  squares: number
  /** The values a square may hold, as the game itself numbers them. */
  values: number[]
  /**
   * How many squares a finished board gives to each value.
   *
   * One number for all of them, because these are Latin squares: every value
   * takes exactly one square in every row, so with as many rows as there are
   * values each is placed `values.length` times. That holds whatever else is
   * drawn on top — a Killer cage, a jigsaw block, a diagonal, an inequality
   * sign — since none of those makes the grid any less Latin.
   *
   * Absent where a finished board does not fix it the same way. Undead's three
   * monsters have three different totals, and it prints them above its own
   * board, so nothing here would be telling the reader anything new.
   */
  each?: number
  /** What was dealt: the value in each square, or 0 where it was left empty. */
  clues: number[]
  /**
   * Sets of squares that must all differ. Rows, columns, blocks, diagonals —
   * and nothing at all for Undead, whose squares are under no such rule.
   */
  groups: number[][]
  /**
   * What the puzzle's own clues forbid, applied to the squares those clues
   * name. Called after the groups have had their say, and free to use the
   * values already placed. Absent for a board whose clues are all in `groups`
   * to begin with — an ordinary Solo, where the blocks and the diagonals are
   * the whole of what it has to say.
   *
   * Neither this nor `groups` looks at where a value could go *elsewhere*: that
   * a value fits only one square of its row is a deduction, and deductions are
   * the reader's. What they do is copy out what the board already says.
   */
  narrow?: (candidates: Set<number>[], values: number[]) => void
  moves: MoveLanguage
}

/**
 * The language the four digit grids share.
 *
 * `R x,y,n` puts a digit in a square and clears its marks on the way past;
 * `P x,y,n` turns one mark over; `M` fills them all in. Solo, Keen, Towers and
 * Unequal all speak it, because three of them were written from the fourth.
 * Each has at most one move of its own besides — Towers crossing a clue off,
 * Unequal spending a sign — which is what `spare` is for.
 */
export function gridMoves(size: number, spare?: RegExp): MoveLanguage {
  const at = (square: number) => `${square % size},${Math.floor(square / size)}`
  return {
    read(text) {
      if (text === 'M') return [{ kind: 'fill' }]
      if (spare?.test(text)) return [{ kind: 'ignore' }]
      const parsed = /^([PR])(\d+),(\d+),(\d+)$/.exec(text)
      if (!parsed) return null
      const x = Number(parsed[2])
      const y = Number(parsed[3])
      const value = Number(parsed[4])
      if (x >= size || y >= size || value > size) return null
      const square = y * size + x
      return parsed[1] === 'P' && value > 0
        ? [{ kind: 'toggle', square, value }]
        : [{ kind: 'set', square, value, clears: true }]
    },
    toggle: (square, value) => `P${at(square)},${value}`,
    set: (square, value) => `R${at(square)},${value}`,
    wipe: (square) => `R${at(square)},0`,
  }
}
