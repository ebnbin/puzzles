/**
 * A midend save file, read and written from this side.
 *
 * This file is the half of the job that knows nothing about any particular
 * puzzle: it splits a save into its lines, plays the moves forward to the
 * position the save describes, and writes a new save with more moves on the
 * end. What each move *means* is the game's own — see `MoveLanguage` — and what
 * the moves should be is ../marks's.
 *
 * The reason it goes through the file at all is that `midend_deserialise` hands
 * every `MOVE` line straight to `execute_move`, with `interpret_move` nowhere
 * in the path (midend.c). It is the only way to give the back end a move that
 * no gesture could have produced — the alternative being to steer `game_ui`'s
 * cursor and pencil flag from outside, one keypress at a time.
 */
import type { Board } from './board'

/** One line of a save file: eight characters of key, a length, and the value. */
export type Field = { key: string; value: string }

/** The lines that add a state, in the order they are replayed. */
const STATE_KEYS = new Set(['MOVE', 'SOLVE', 'RESTART'])

/**
 * Split a save file into its lines, or null if it is not one.
 *
 * Read by the length each line declares rather than by looking for newlines,
 * which is what the format asks for (midend.c's `wr`). Every value is printable
 * ASCII — the C asserts it on the way out — so a byte length is a character
 * length here, and no value can hold a newline to be confused by.
 */
export function fields(text: string): Field[] | null {
  const out: Field[] = []
  let at = 0
  while (at < text.length) {
    if (text[at + 8] !== ':') return null
    const key = text.slice(at, at + 8).trimEnd()
    at += 9
    const colon = text.indexOf(':', at)
    if (colon < 0) return null
    const length = Number(text.slice(at, colon))
    if (!Number.isInteger(length) || length < 0) return null
    at = colon + 1
    const value = text.slice(at, at + length)
    if (value.length !== length) return null
    at += length
    if (text[at] !== '\n') return null
    at += 1
    out.push({ key, value })
  }
  return out.length > 0 ? out : null
}

/** A line, written the way the C writes it. */
export const line = (key: string, value: string) =>
  `${key.padEnd(8)}:${value.length}:${value}\n`

export const find = (lines: Field[], key: string) =>
  lines.find((f) => f.key === key)?.value

/**
 * The moves that have actually been made.
 *
 * State one is the deal, so what has been played is the states before the
 * position — and the ones after it are what the reader has undone. Those are
 * dropped rather than kept, because making a move is what the midend does with
 * them too: `midend_purge_states` throws the redo list away the moment anything
 * new is played on top of it.
 */
export function done(lines: Field[]): Field[] | null {
  const statepos = Number(find(lines, 'STATEPOS'))
  if (!Number.isInteger(statepos) || statepos < 1) return null
  const played = lines.filter((f) => STATE_KEYS.has(f.key))
  const kept = played.slice(0, statepos - 1)
  return kept.length === statepos - 1 ? kept : null
}

/** Where a board stands: what is in each square, and the marks under it. */
export type Position = { values: number[]; marks: Set<number>[] }

/**
 * Play the moves forward from the deal.
 *
 * Marks are turned over rather than set, which is the whole reason this exists:
 * what to send cannot be worked out without knowing what is marked already, and
 * the save records the moves rather than the board.
 *
 * `RESTART` is a state like any other and is followed like one. It puts the
 * board back to what was dealt — `midend_restart_game` builds it with
 * `new_game` from the description, and carries that description as its own
 * move string — so here it is the clues again, with nothing written and nothing
 * marked. If the description it names is not the one this board was read from
 * then our clues do not describe the position, and that is refused rather than
 * guessed at.
 *
 * It was refused outright once, on the reasoning that a restarted board would
 * get its marks back on the next press. That was wrong, and wrong in the worst
 * direction: the state stays in the history, so every press after a restart was
 * refused, and the keys were dead for the rest of the deal. Restarting is a
 * thing readers do when the marks have got away from them, which is exactly
 * when they want these keys.
 *
 * `S` is still refused, and this is the one path that stays shut. It is the
 * solver's answer, and the five spell it five different ways — Solo separates
 * its digits with commas because a board can want sixteen of them, Keen and
 * Towers write one character each, Unequal writes one character each but counts
 * from zero above nine, Undead writes letters. Decoding all five buys one
 * position: a board that was solved and then had a square rubbed out again. The
 * keys go dead there too, for the rest of that deal — the same shape of fault
 * as the restart one, and left standing because reaching it means asking for
 * the answer and then unasking, where restarting means wanting to play.
 *
 * Anything else unrecognised is refused too: a move we cannot play is a board
 * we would be guessing at.
 */
export function replay(moves: Field[], board: Board, desc: string): Position | null {
  const values = [...board.clues]
  const marks = board.clues.map(() => new Set<number>())

  for (const move of moves) {
    if (move.key === 'RESTART') {
      if (move.value !== desc) return null
      for (let i = 0; i < values.length; i++) values[i] = board.clues[i]
      for (const set of marks) set.clear()
      continue
    }
    if (move.key === 'SOLVE' || move.value[0] === 'S') return null
    const steps = board.moves.read(move.value)
    if (!steps) return null
    for (const step of steps) {
      if (step.kind === 'ignore') continue
      if (step.kind === 'fill') {
        for (let i = 0; i < values.length; i++)
          if (!values[i]) for (const v of board.values) marks[i].add(v)
        continue
      }
      if (step.square < 0 || step.square >= board.squares) return null
      if (step.kind === 'toggle') {
        if (!marks[step.square].delete(step.value)) marks[step.square].add(step.value)
      } else {
        values[step.square] = step.value
        if (step.clears) marks[step.square].clear()
      }
    }
  }
  return { values, marks }
}

/**
 * The same save with more moves on the end, and the two counts to match.
 *
 * Everything the midend writes before the states is kept exactly as it was —
 * the description, the seed, the aux info its solver needs, whatever a later
 * version adds. Only the counts and the list itself are ours to rewrite.
 *
 * Where the game will take several of our moves in one string, they go in one
 * string: that is one state rather than one per mark, so a whole board's worth
 * of marks is a single step back out. Where it will not, each is its own state,
 * and forty marked squares are forty steps — a move string does one thing
 * there, and `M` is the only bulk operation those four have.
 */
/**
 * The same save with its last move left in the redo list, to be pressed home
 * with redo(). Null if there is no move to hold back.
 *
 * ---------------------------------------------------------------------------
 * WHY A MOVE HAS TO ARRIVE THIS WAY
 * ---------------------------------------------------------------------------
 *
 * Because a board finished through the save file does not flash otherwise, and
 * the flash is how these puzzles say you have won.
 *
 * The midend works out a flash in exactly one place: `midend_finish_move`,
 * which asks the game for `flash_length` over the two states either side of the
 * move just made. Every path that reaches it comes through
 * `midend_process_key` — a gesture, an undo, a redo. `midend_deserialise` is
 * not one of them: it rebuilds the state list, redraws, and returns. So the
 * door this whole module goes through is also the one door that arrives in
 * silence, and the last digit of a puzzle put in by a key would finish it
 * without a word.
 *
 * `midend_redo` is the way back in. It advances the position by one, sets
 * `dir` to +1, and falls into the same tail as a gesture, `midend_finish_move`
 * included. So the moves go in with the last one still undone, and redo() plays
 * it — which is a real move, made forwards, over the two states that straddle
 * the win.
 *
 * Nothing else about the board differs: measured, the save the back end writes
 * after the redo is byte for byte the save it writes when every move was
 * already played. This buys the flash and changes nothing else.
 */
export function pending(save: string): string | null {
  const lines = fields(save)
  if (!lines) return null
  const states = Number(find(lines, 'NSTATES'))
  if (!Number.isInteger(states) || states < 2) return null
  return lines
    .map((f) => (f.key === 'STATEPOS' ? line(f.key, String(states - 1)) : line(f.key, f.value)))
    .join('')
}

export function extend(
  lines: Field[],
  kept: Field[],
  added: string[],
  chain?: string,
): string | null {
  const head = lines.findIndex((f) => f.key === 'NSTATES')
  if (head < 0 || added.length === 0) return null
  const written = chain === undefined ? added : [added.join(chain)]
  const states = kept.length + written.length + 1
  return (
    lines.slice(0, head).map((f) => line(f.key, f.value)).join('') +
    line('NSTATES', String(states)) +
    line('STATEPOS', String(states)) +
    kept.map((f) => line(f.key, f.value)).join('') +
    written.map((m) => line('MOVE', m)).join('')
  )
}
