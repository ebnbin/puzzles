/**
 * The marks a square can still take, worked out on this side.
 *
 * Four puzzles in the collection keep pencil marks, and upstream gives them one
 * key for it: `M`, which fills every square with every digit, for people who
 * play by starting from all of them and crossing out. Here they get two, and
 * `M` is not among them.
 *
 *   fillMarks    the crossing out. Each empty square keeps only the digits
 *                nothing on the board has ruled out — not the ones its row,
 *                column, block or diagonal have already spent, and not the ones
 *                its own clues forbid: a cage that cannot add up, a sign that
 *                cannot point that way, a row that cannot be seen from there.
 *
 *   clearMarks   every mark taken off, so the first can start over.
 *
 * `M` is gone because the first of these is what `M` does when there is nothing
 * to rule out. It is not a smaller offer than upstream's; it is the same offer
 * with the tedium removed, and a keypad carrying both would be carrying one key
 * twice.
 *
 * fillMarks stops in one place, and it is the important line. It never asks
 * where a digit could go *elsewhere*: that a digit fits only one square of its
 * row is a deduction, and deductions are the reader's — Unequal already has a
 * key that makes one for you, and it is not this one. What this does is copy
 * out what the board has already said, which is bookkeeping, and bookkeeping is
 * what a machine is for.
 *
 * It was briefly two keys of its own, the second adding the clues to the first.
 * The split read well and did not survive being measured. On fifteen of Solo's
 * sixteen presets the two were not merely alike but the same code — the
 * diagonals of an X board and the blocks of a jigsaw are groups, so only a
 * Killer board has anything the groups do not already cover — and pressing the
 * second after the first did nothing at all, which reads as a broken key.
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

/** The board as this side needs it: what it is, and where it stands. */
function readBoard(save: string) {
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
  return { lines, board, kept, position }
}

/**
 * Every empty square marked with what it can still take, or null if this board
 * could not be read with enough confidence to touch it.
 *
 * ---------------------------------------------------------------------------
 * IT ADDS ONLY ONCE, AND ONLY FROM NOTHING
 * ---------------------------------------------------------------------------
 *
 * With a mark anywhere on the board, this only ever takes marks away: each
 * square keeps what it already had, less whatever has since become impossible.
 * It puts nothing back. A mark rubbed out by hand stays rubbed out, because
 * rubbing it out was a decision, and a key that undid the reader's decisions
 * every time it was pressed would be a key nobody could use halfway through.
 *
 * Only when the board carries no marks at all does it fill any in. That is the
 * whole board and not each square: one square emptied by hand is still a
 * decision, and the way to say "start these again" is to empty them all, which
 * is what the key beside this one is for.
 *
 * What it being the whole board buys is that a square can be left empty and
 * stay that way. A square whose marks have all become impossible — usually
 * because a digit somewhere else is wrong — empties, and the next press leaves
 * it empty, because the rest of the board still carries marks and the rest of
 * the board is what decides. That emptiness is the board telling the reader
 * something true, and refilling it would be this key arguing with a mistake
 * instead of showing it. Were the test per square it would refill on the very
 * next press, and the two presses would take turns.
 *
 * There is one case where two presses still differ from one, and it is the
 * shape of the rule rather than an oversight: if the mark that dies is the
 * *last* one on the board, the board is bare afterwards, so the press after
 * that fills. Reaching it takes a board whose every mark was impossible, which
 * in practice means one square marked by hand and nothing else. Pressing twice
 * there gives a fresh set of marks, which is what pressing twice on a bare
 * board gives, so it is at least the same answer to the same question.
 *
 * From nothing, with nothing to rule out, this fills every square with every
 * digit — which is exactly upstream's `M`, and why these puzzles no longer show
 * a separate key for it.
 */
export function fillMarks(save: string): string | null {
  const state = readBoard(save)
  if (!state) return null
  const { lines, board, kept, position } = state

  const should = candidates(board, position.digits)
  const bare = position.marks.every((set) => set.size === 0)

  const wanted: string[] = []
  for (let cell = 0; cell < board.clues.length; cell++) {
    if (position.digits[cell]) continue
    const has = position.marks[cell]
    const x = cell % board.size
    const y = (cell - x) / board.size
    // A toggle apiece, and only where the two disagree — which is both the
    // least that can be sent and the only way to say it, since `P` toggles.
    for (let n = 1; n <= board.size; n++) {
      const want = bare ? should[cell].has(n) : has.has(n) && should[cell].has(n)
      if (want !== has.has(n)) wanted.push(`P${x},${y},${n}`)
    }
  }
  if (wanted.length === 0) return null

  return extend(lines, kept, wanted)
}

/**
 * Every mark on the board taken off, or null if there were none.
 *
 * One move per square rather than one per mark: `R x,y,0` puts a digit in a
 * square and clears its marks on the way past, and putting 0 in a square that
 * is already empty leaves only the clearing. All four spell it the same way.
 *
 * Squares with a digit in them are left alone, and must be: the same move on
 * one of those would rub the digit out.
 */
export function clearMarks(save: string): string | null {
  const state = readBoard(save)
  if (!state) return null
  const { lines, board, kept, position } = state

  const wanted: string[] = []
  for (let cell = 0; cell < board.clues.length; cell++) {
    if (position.digits[cell] || position.marks[cell].size === 0) continue
    const x = cell % board.size
    const y = (cell - x) / board.size
    wanted.push(`R${x},${y},0`)
  }
  if (wanted.length === 0) return null

  return extend(lines, kept, wanted)
}
