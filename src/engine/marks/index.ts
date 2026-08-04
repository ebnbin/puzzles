/**
 * The marks a square can still take, worked out on this side.
 *
 * Five puzzles in the collection keep pencil marks, and upstream gives them one
 * key for it: `M`, which fills every square with every mark, for people who
 * play by starting from all of them and crossing out. Here they get three, and
 * `M` is not among them.
 *
 *   fillMarks    the crossing out. Each empty square keeps only what nothing on
 *                the board has ruled out — not what its row, column, block or
 *                diagonal have already spent, and not what its own clues
 *                forbid: a cage that cannot add up, a sign that cannot point
 *                that way, a row that cannot be seen from there, a monster
 *                whose last copy is already on the board.
 *
 *   placeSingles a square whose marks have come down to one, filled in with it.
 *
 *   clearMarks   every mark taken off, so the first can start over.
 *
 * The first two point opposite ways and are kept that way: one reads the values
 * and writes marks, the other reads the marks and writes values. Neither feeds
 * itself, so neither loops; pressed alternately they feed each other, and walk
 * a board as far as naked singles go — which is measured, and short, under
 * placeSingles.
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
 * All five have a far better solver than this inside them, and not one can be
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
import { readUndead } from './undead'
import { readUnequal } from './unequal'
import type { Field } from './save'
import { done, extend, fields, find, replay } from './save'

export { pending } from './save'

/** Keyed by what the save calls the game, which is `thegame.name` in the C. */
const READERS: Record<string, (lines: Field[]) => Board | null> = {
  Solo: readSolo,
  Keen: readKeen,
  Towers: readTowers,
  Unequal: readUnequal,
  Undead: readUndead,
}

/**
 * What each square could still hold.
 *
 * The groups first: every digit already placed in a group is gone from every
 * other square of it. Then whatever the puzzle's own clues say on top of that.
 * A square already filled in holds nothing — marks under a digit are not a
 * state the back end will keep.
 */
function candidates(board: Board, values: number[]): Set<number>[] {
  const sets = values.map((value) => (value ? new Set<number>() : new Set(board.values)))

  for (const group of board.groups) {
    const taken = new Set<number>()
    for (const square of group) if (values[square]) taken.add(values[square])
    for (const square of group)
      if (!values[square]) for (const v of taken) sets[square].delete(v)
  }

  board.narrow?.(sets, values)
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
  // The description as well, because a restart replays from one and has to be
  // checked against the deal this board was read out of.
  const desc = find(lines, 'DESC')
  if (desc === undefined) return null
  const position = replay(kept, board, desc)
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

  const should = candidates(board, position.values)
  const bare = position.marks.every((set) => set.size === 0)

  const wanted: string[] = []
  for (let square = 0; square < board.squares; square++) {
    if (position.values[square]) continue
    const has = position.marks[square]
    // A toggle apiece, and only where the two disagree — which is both the
    // least that can be sent and the only way to say it, since marks turn over
    // rather than being set.
    for (const value of board.values) {
      const want = bare ? should[square].has(value) : has.has(value) && should[square].has(value)
      if (want !== has.has(value)) wanted.push(board.moves.toggle(square, value))
    }
  }

  return extend(lines, kept, wanted, board.moves.chain)
}

/**
 * Every square whose marks have come down to one, filled in with it.
 *
 * ---------------------------------------------------------------------------
 * THIS ONE READS THE MARKS AND WRITES THE VALUES
 * ---------------------------------------------------------------------------
 *
 * Which is the opposite way round from `fillMarks`, and the two are kept that
 * way on purpose. `fillMarks` looks only at the values on the board and writes
 * only marks; this looks only at the marks and writes only values. Neither can
 * feed itself, so neither loops: press either twice and the second press finds
 * nothing to do.
 *
 * Pressing them alternately *does* feed one into the other, and will walk a
 * board out — as far as it goes, which is not far, and is worth being exact
 * about because the obvious guess is wrong.
 *
 * The pair does naked singles: a square down to one candidate, filled in. That
 * is strictly weaker than any tier upstream names. Its easiest, Solo's
 * `DIFF_BLOCK` — "Trivial" — is the *hidden* single: a number that fits only
 * one square of its block. The manual bundles the two, saying that at Trivial
 * and Basic "there will be a square you can fill in with a single number at all
 * times", but which of the two ways you know it is exactly the line drawn
 * above: a hidden single is a claim about where a number can go, and `fillMarks`
 * never makes one.
 *
 * Measured over five deals of every preset of all five games, the pair finishes
 * every 2x2 Trivial Solo and every Easy Undead, and about two thirds of 3x3
 * Trivial Solo and 4x4 Easy Towers. Past that it falls away fast — a few per
 * cent of the empty squares on anything Advanced or harder, nothing at all on
 * Killer. It is an aid for the bookkeeping, not a solver wearing two buttons.
 *
 * ---------------------------------------------------------------------------
 * AND IT IS THE ONE THAT CAN BE WRONG
 * ---------------------------------------------------------------------------
 *
 * `fillMarks` cannot put a wrong mark on the board: every value it crosses off
 * is one the board itself has ruled out. This is different. One mark left does
 * not mean "this is the answer" — it means one mark is left. A reader who has
 * rubbed marks out by hand can leave a square with one wrong mark in it, and
 * `fillMarks` will not put the others back, because rubbing them out was a
 * decision. So this writes what the square says, and what the square says is
 * the reader's own.
 *
 * Checking it against the constraints first would be the obvious guard and is
 * exactly what must not happen: that is `fillMarks`'s job, and doing it here
 * would make the two keys read each other, which is the loop this shape exists
 * to avoid.
 */
export function placeSingles(save: string): string | null {
  const state = readBoard(save)
  if (!state) return null
  const { lines, board, kept, position } = state

  const wanted: string[] = []
  for (let square = 0; square < board.squares; square++) {
    if (position.values[square]) continue
    const marks = position.marks[square]
    if (marks.size !== 1) continue
    wanted.push(board.moves.set(square, [...marks][0]))
  }

  return extend(lines, kept, wanted, board.moves.chain)
}

/**
 * Every mark on the board taken off, or null if there were none.
 *
 * One move per square rather than one per mark: every one of these games has a
 * move that puts something in a square and clears its marks on the way past,
 * and aiming it at a square that is already empty leaves only the clearing.
 *
 * Squares with something in them are left alone, and must be: the same move on
 * one of those would rub that out too.
 */
export function clearMarks(save: string): string | null {
  const state = readBoard(save)
  if (!state) return null
  const { lines, board, kept, position } = state

  const wanted: string[] = []
  for (let square = 0; square < board.squares; square++) {
    if (position.values[square] || position.marks[square].size === 0) continue
    wanted.push(board.moves.wipe(square))
  }

  return extend(lines, kept, wanted, board.moves.chain)
}
