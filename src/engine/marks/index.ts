/**
 * The marks a square can still take, worked out on this side.
 *
 * Four puzzles in the collection keep pencil marks and offer one key for them:
 * upstream's `M`, which fills every square with every digit, for people who
 * play by starting from all of them and crossing out. This does the crossing
 * out: each empty square keeps only the digits nothing on the board has ruled
 * out — not the ones its row, column, block or diagonal have already spent, and
 * not the ones its own clues forbid, a cage that cannot add up, a sign that
 * cannot point that way, a row that cannot be seen from there.
 *
 * It stops there, and that is the important line. It never asks where a digit
 * could go *elsewhere*: that a digit fits only one square of its row is a
 * deduction, and deductions are the reader's — Unequal already has a key that
 * makes one for you, and it is not this one. What this does is copy out what
 * the board has already said, which is bookkeeping, and bookkeeping is what a
 * machine is for.
 *
 * It was two keys for a while, the second adding the clues to the first. The
 * split read well and did not survive being measured. On fifteen of Solo's
 * sixteen presets the two were not merely alike but the same code — the
 * diagonals of an X board and the blocks of a jigsaw are groups, so only a
 * Killer board has anything the groups do not already cover — and pressing the
 * second after the first did nothing at all, which reads as a broken key. Where
 * they did differ most, on Keen and on Killer, the weaker of the two did
 * nothing on a fresh deal, because those boards say everything they have
 * through their clues. So the choice was offered exactly where one of its
 * answers was empty, and withheld everywhere it would have meant something.
 *
 * ---------------------------------------------------------------------------
 * WHY THE ARITHMETIC IS HERE AND NOT IN THE C
 * ---------------------------------------------------------------------------
 *
 * All four have a far better solver than this inside them, and not one can be
 * asked a question. The only exit any of them offers is `solve_game`, which
 * runs to the end and hands back the whole answer. There is no call that means
 * "what is still possible here", so the elimination is written again rather
 * than forwarded.
 *
 * How the moves get back in is save.ts's business, and why is worth reading
 * there: the save file is the one door a move can go through without the back
 * end having interpreted a gesture into it.
 *
 * ---------------------------------------------------------------------------
 * WHEN IT REFUSES
 * ---------------------------------------------------------------------------
 *
 * A misread board is worse than no key: it would rub out marks the reader put
 * there and call digits impossible that are not. So every step returns null
 * rather than guessing — an unknown parameter, a description that does not
 * parse, blocks that come out the wrong shape, a move nobody here recognises —
 * and the caller shows nothing. It is the bargain keys.ts already strikes when
 * it cannot read a game id.
 *
 * Marks are worked out against the board as it stands, mistakes included: a
 * digit in the wrong square is still a digit in that row. Correcting it and
 * pressing again clears up after it, which is the same answer the boards
 * themselves give when they draw a clashing digit red and go on counting it.
 */
import type { Board } from './board'
import { readKeen } from './keen'
import { readSolo } from './solo'
import { readTowers } from './towers'
import { readUnequal } from './unequal'
import type { Field } from './save'
import { done, extend, fields, find, replay } from './save'

/** Keyed by what the save calls the game, which is `thegame.name` in the C. */
const READERS: Record<string, (lines: Field[]) => Board | null> = {
  Solo: readSolo,
  Keen: readKeen,
  Towers: readTowers,
  Unequal: readUnequal,
}

/**
 * What each square could still hold.
 *
 * The groups first: every digit already placed in a group is gone from every
 * other square of it. Then whatever the puzzle's own clues say on top of that.
 * A square already filled in holds nothing — marks under a digit are not a
 * state the back end will keep.
 */
function candidates(board: Board, digits: number[]): Set<number>[] {
  const sets = digits.map((digit) => {
    const set = new Set<number>()
    if (!digit) for (let n = 1; n <= board.size; n++) set.add(n)
    return set
  })

  for (const group of board.groups) {
    const taken = new Set<number>()
    for (const cell of group) if (digits[cell]) taken.add(digits[cell])
    for (const cell of group)
      if (!digits[cell]) for (const n of taken) sets[cell].delete(n)
  }

  board.narrow?.(sets, digits)
  return sets
}

/**
 * A save with every empty square marked with exactly what it can still take,
 * or null if this board could not be read with enough confidence to touch it.
 *
 * Null also when there is nothing to do — every square already says what it can
 * be — so that a second press is not a no-op that still costs a reload and a
 * state on the undo stack.
 */
export function fillMarks(save: string): string | null {
  const lines = fields(save)
  if (!lines) return null

  const read = READERS[find(lines, 'GAME') ?? '']
  if (!read) return null
  const board = read(lines)
  if (!board) return null

  const kept = done(lines)
  if (!kept) return null
  const position = replay(kept, board.clues, board.size, board.passthrough)
  if (!position) return null

  const should = candidates(board, position.digits)
  const wanted: string[] = []
  for (let cell = 0; cell < board.clues.length; cell++) {
    if (position.digits[cell]) continue
    const x = cell % board.size
    const y = (cell - x) / board.size
    // A toggle apiece, and only where the two disagree — which is both the
    // least that can be sent and the only way to say it, since `P` toggles.
    for (let n = 1; n <= board.size; n++)
      if (should[cell].has(n) !== position.marks[cell].has(n)) wanted.push(`P${x},${y},${n}`)
  }
  if (wanted.length === 0) return null

  return extend(lines, kept, wanted)
}
