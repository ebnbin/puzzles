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
 *   placeSingles a square the marks have come down to one answer for, filled in
 *                with it — either because the square has one mark left, or
 *                because a value has one square left in its row, column, block
 *                or diagonal.
 *
 *   clearMarks   every mark taken off, so the first can start over.
 *
 * The first two point opposite ways and are kept that way: one reads the values
 * and writes marks, the other reads the marks and writes values. Neither feeds
 * itself, so neither loops; pressed alternately they feed each other, and walk
 * a board as far as singles go — which is measured, under placeSingles.
 *
 * `M` is gone because the first of these is what `M` does when there is nothing
 * to rule out. It is not a smaller offer than upstream's; it is the same offer
 * with the tedium removed, and a keypad carrying both would be carrying one key
 * twice.
 *
 * fillMarks stops in one place, and it is still the important line. It never
 * asks where a digit could go *elsewhere*: what it writes is only what the
 * board has already said, square by square, which is bookkeeping, and
 * bookkeeping is what a machine is for. That has not changed and is worth not
 * changing — it is why a mark this key writes can be trusted without checking.
 *
 * placeSingles crosses that line, on purpose and on its own. Asking which
 * square of a row can still take the 4 is a deduction, and it is upstream's own
 * easiest tier; the reasoning for doing it there and not here is under
 * placeSingles. The short of it: the two keys can afford different answers
 * because they are trusted differently. A wrong mark can be rubbed out. A wrong
 * digit is a wrong digit.
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
 * "The board" is the marks a reader can see and reach, which is why the test
 * below passes over the squares that hold something. In Undead a monster does
 * not take the marks under it away — only `E` does, and `E` empties the square
 * as it goes — so a square with a monster on it can be carrying marks that are
 * not drawn, cannot be rubbed out, and are gone the moment the monster is. They
 * are real state and the model keeps them, but they cannot be what decides
 * whether this key fills or subtracts: counting them meant that placing one
 * monster, clearing the marks and pressing fill did nothing at all, on the
 * evidence of marks the reader had no way to see or to remove. The four grid
 * games cannot reach it — their `R` clears on the way past, so a square with a
 * digit in it never has any.
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
  const bare = position.marks.every(
    (set, square) => position.values[square] !== 0 || set.size === 0,
  )

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
 * Every square the marks have come down to one answer for, filled in with it.
 *
 * Two ways a square can come down to one, and they are the two halves of what
 * "a single" means:
 *
 *   naked   the square's own marks are one value. Nothing else fits here.
 *
 *   hidden  a value that appears in the marks of exactly one square of a group
 *           — a row, a column, a Solo block, a diagonal. Nothing else can hold
 *           it, so this is where it goes, however many other marks the square
 *           is carrying.
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
 * The hidden single is why this reads the marks rather than working the
 * candidates out again. Recomputing them here is the obvious thing and is
 * exactly what must not happen: it is `fillMarks`'s job, and doing it here
 * would give this key everything it needs to run on its own, pressed over and
 * over, which is the loop this shape exists to avoid.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE LINE MOVED, AND WHERE IT DID NOT
 * ---------------------------------------------------------------------------
 *
 * The hidden single is a deduction. It says where a value can go, which is the
 * question the rest of this file is careful never to ask — and it is upstream's
 * own easiest tier, Solo's `DIFF_BLOCK`, the one called "Trivial": a number
 * that fits only one square of its block.
 *
 * So the line moved, deliberately, and only here. `fillMarks` still does not
 * make a positional claim: the marks it writes are still only what the board
 * has already said, and a reader who never presses this key sees exactly the
 * bookkeeping they saw before. What moved is what the *other* key is willing to
 * conclude from marks that are already on the board.
 *
 * ---------------------------------------------------------------------------
 * THREE THINGS THE HIDDEN SINGLE NEEDS TO BE SOUND
 * ---------------------------------------------------------------------------
 *
 * A group is a set of squares that must all differ, and every one of them here
 * is exactly as long as there are values — a row, a column, a block, a diagonal
 * — so each value takes exactly one square in it. That is the premise, and it
 * is what a Killer cage does not satisfy: a cage holds no digit twice, but a
 * three-square cage does not hold all nine, so "only one square left for the 4"
 * concludes nothing there. Cages stay in `narrow`, where they were.
 *
 * 1. VALUES ALREADY PLACED IN THE GROUP ARE NOT CANDIDATES. The engine clears a
 *    square's marks when a value goes in it, and nothing else's — so the marks
 *    elsewhere in that group still show the value that has just been spent.
 *    Counting those would place a 1 in the row's last 1-marked square when the
 *    row already has its 1, and the board would gain a clash this key invented.
 *
 * 2. A GROUP WITH AN UNMARKED EMPTY SQUARE IS SKIPPED. A square with no marks
 *    reads as one that can hold nothing, and that manufactures hidden singles
 *    out of nowhere: rub every mark off one square by hand and the value it
 *    could have held now appears to have only one home. There is no way to tell
 *    "the reader cleared this" from "the board ruled everything out", so neither
 *    is trusted, and the group is left alone. It is the bargain the rest of this
 *    module strikes when it cannot read something.
 *
 * 3. ONE PRESS RUNS TO A STANDSTILL. Filling a square takes it out of its
 *    groups' counts, which can bring the next value down to one home, and so on.
 *    Stopping after one sweep would leave a key that keeps working every time it
 *    is pressed — the opposite of the promise the pair makes. So it repeats
 *    until nothing more is found, and the position it stops at is the one the
 *    next press reads: the model tracks only what the engine will do (set the
 *    value, clear that square's marks) so that the two agree afterwards.
 *
 * ---------------------------------------------------------------------------
 * HOW FAR THE PAIR GETS NOW
 * ---------------------------------------------------------------------------
 *
 * Far enough to be worth saying exactly, because the hidden single is what
 * upstream's two easiest tiers are made of and it shows.
 *
 * Five deals of every preset of all five games, alternating the two keys to a
 * standstill and counting the boards that came out finished. Before the hidden
 * single, 35 of 265; after, 119.
 *
 *   Solo    Trivial and Basic go from nothing to every board — 3x3 Trivial 0/5
 *           to 5/5, 3x3 Basic 0/5 to 5/5, and the same for Basic X, both Jigsaw
 *           Basics, 3x4 and 4x4. That is the manual's own promise kept: at
 *           Trivial and Basic "there will be a square you can fill in with a
 *           single number at all times", and both ways of knowing it are here
 *           now. Intermediate and up still stop — 3x3 Intermediate walks 32% of
 *           the empty squares and finishes none — because those want a claim
 *           about a *set* of squares, which is the next line along and is not
 *           crossed.
 *   Keen    every Easy and Normal preset, 5/5. Hard and above, single figures.
 *   Towers  and Unequal move a long way without arriving: Towers 5 Easy 27% to
 *           46%, Unequal 6 Easy 1/5 to 4/5. Their own Easy tier is more than
 *           singles — Towers' is the visibility deduction — so finishing it was
 *           never on offer.
 *   Undead  unchanged, and not by luck: it has no groups. Nothing there must
 *           differ from anything else, so there is no group to be the last home
 *           in, and this key does naked singles for it exactly as before.
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
 * decision. So this writes what the marks say, and the marks are the reader's
 * own.
 *
 * The hidden single widens that. A naked single can only be wrong in the square
 * whose marks are wrong; a hidden single reads every square of a group and
 * writes to one of them, so a mark rubbed out over here can put a digit in the
 * wrong square over there. Guard 2 covers the case that reaches furthest — a
 * square with nothing left on it — but a square with the *wrong* marks on it is
 * still the reader's, and so is what this concludes from them.
 *
 * On a board that already contradicts itself two values can both come down to
 * the same square. The first one found takes it, by group order and then by
 * value; the second finds the square filled and stops. Which of them wins is
 * arbitrary, and the board was already wrong before either arrived.
 */
export function placeSingles(save: string): string | null {
  const state = readBoard(save)
  if (!state) return null
  const { lines, board, kept, position } = state

  // Ours to write on, so that a fill can be seen by the fills after it within
  // this one press. Only what the engine itself will do to the board, so that
  // the position this stops at is the position the next press reads.
  const values = [...position.values]
  const marks = position.marks.map((set) => new Set(set))
  const placed = new Map<number, number>()

  const put = (square: number, value: number) => {
    values[square] = value
    marks[square].clear()
    placed.set(square, value)
  }

  for (;;) {
    let moved = false

    for (let square = 0; square < board.squares; square++) {
      if (values[square] || marks[square].size !== 1) continue
      put(square, [...marks[square]][0])
      moved = true
    }

    for (const group of board.groups) {
      // The premise: as many squares as there are values, so each takes one.
      if (group.length !== board.values.length) continue
      // Guard 2. An empty square with nothing on it could hold anything, and
      // reads here as if it could hold nothing.
      if (group.some((square) => !values[square] && marks[square].size === 0)) continue
      const spent = new Set(group.map((square) => values[square]).filter(Boolean))
      for (const value of board.values) {
        // Guard 1.
        if (spent.has(value)) continue
        const homes = group.filter((square) => !values[square] && marks[square].has(value))
        if (homes.length !== 1) continue
        put(homes[0], value)
        moved = true
      }
    }

    // Guard 3.
    if (!moved) break
  }

  const wanted = [...placed].map(([square, value]) => board.moves.set(square, value))
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

/**
 * How many of each value are still to be placed, keyed by the value.
 *
 * The only thing here that reads the board without writing to it: it is what
 * the small number in the corner of each digit key is counting. Nothing about
 * it changes the game — the reader could count the squares themselves, and on
 * a nearly-finished board they do, which is the tedium this takes off them.
 *
 * A number can go negative, and is left that way rather than floored: the same
 * digit twice in a row is a mistake the boards themselves draw in red and go on
 * counting, and this counts it too. What to do about a negative is the
 * keypad's to decide, not this.
 *
 * Marks are not counted. A pencilled 9 is not a 9 on the board, which is the
 * whole distinction the other three keys are built around.
 *
 * Null for a board whose reading was refused, and for one whose values do not
 * come in a fixed number apiece — see `each`.
 */
export function remaining(save: string): Map<number, number> | null {
  const state = readBoard(save)
  if (!state) return null
  const { board, position } = state
  if (board.each === undefined) return null

  const left = new Map(board.values.map((value) => [value, board.each as number]))
  for (const value of position.values)
    if (value) left.set(value, (left.get(value) ?? 0) - 1)
  return left
}
