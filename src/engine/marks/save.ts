/**
 * A midend save file, read and written from this side.
 *
 * The four puzzles that keep pencil marks — Solo, Keen, Towers, Unequal —
 * speak the same move language, because three of them were written from the
 * fourth. `R x,y,n` puts a digit in a square and clears its marks; `P x,y,n`
 * *toggles* one mark; `M` fills every mark in every empty square; `S` is the
 * solver's answer. Each has one or two moves of its own that touch neither the
 * digits nor the marks — Towers crosses a clue off with `D`, Unequal spends an
 * inequality sign with `F` — and those are carried along untouched.
 *
 * This file is the half of the job that knows nothing about any of them: it
 * splits a save into its lines, plays the moves forward to the position the
 * save describes, and writes a new save with more moves on the end. What the
 * moves should be is ../marks's business, and which squares constrain which is
 * each game's own.
 *
 * The reason it goes through the file at all is that `midend_deserialise`
 * hands every `MOVE` line straight to `execute_move`, with `interpret_move`
 * nowhere in the path (midend.c). It is the only way to give the back end a
 * move that no gesture could have produced — the alternative being to steer
 * `game_ui`'s cursor and pencil flag from outside, one keypress at a time.
 */

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
 * them too: `midend_purge_states` throws the redo list away the moment
 * anything new is played on top of it.
 */
export function done(lines: Field[]): Field[] | null {
  const statepos = Number(find(lines, 'STATEPOS'))
  if (!Number.isInteger(statepos) || statepos < 1) return null
  const played = lines.filter((f) => STATE_KEYS.has(f.key))
  const kept = played.slice(0, statepos - 1)
  return kept.length === statepos - 1 ? kept : null
}

/** Where a board stands: the digits in the squares, and the marks under them. */
export type Position = { digits: number[]; marks: Set<number>[] }

/**
 * Play the moves forward from the deal.
 *
 * `P` is a toggle, which is the whole reason this exists: what to send cannot
 * be worked out without knowing what is marked already, and the save records
 * the moves rather than the board.
 *
 * Two kinds of move are refused rather than followed.
 *
 * `RESTART` re-deals from a description, and re-deriving the clues from it is
 * work with nothing to buy: a restarted game gets its marks on the next press
 * instead.
 *
 * `S` is the solver's answer, and the four spell it four different ways — Solo
 * separates its digits with commas because a board can want sixteen of them,
 * Keen and Towers write one character each, Unequal writes one character each
 * but counts from zero above nine. Decoding all four would buy one position:
 * the board that has been solved and then had a square rubbed out again. A
 * solved board has no empty square to mark, so every other path through a
 * solve already ends in nothing to do.
 *
 * Anything else unrecognised is refused too: a move we cannot play is a board
 * we would be guessing at.
 */
export function replay(
  moves: Field[],
  clues: number[],
  size: number,
  /** Moves this game makes that change neither the digits nor the marks. */
  passthrough: RegExp,
): Position | null {
  const digits = [...clues]
  const marks = Array.from({ length: clues.length }, () => new Set<number>())

  for (const move of moves) {
    if (move.key === 'RESTART') return null
    const text = move.value
    if (text === 'M') {
      for (let i = 0; i < digits.length; i++)
        if (!digits[i]) for (let n = 1; n <= size; n++) marks[i].add(n)
      continue
    }
    if (move.key === 'SOLVE' || text[0] === 'S') return null
    if (passthrough.test(text)) continue
    const parsed = /^([PR])(\d+),(\d+),(\d+)$/.exec(text)
    if (!parsed) return null
    const [, kind, sx, sy, sn] = parsed
    const x = Number(sx)
    const y = Number(sy)
    const n = Number(sn)
    if (x >= size || y >= size || n > size) return null
    const cell = y * size + x
    if (kind === 'P' && n > 0) {
      if (!marks[cell].delete(n)) marks[cell].add(n)
    } else {
      digits[cell] = n
      marks[cell].clear()
    }
  }
  return { digits, marks }
}

/**
 * The same save with more moves on the end, and the two counts to match.
 *
 * Everything the midend writes before the states is kept exactly as it was —
 * the description, the seed, the aux info its solver needs, whatever a later
 * version adds. Only the counts and the list itself are ours to rewrite.
 */
export function extend(lines: Field[], kept: Field[], added: string[]): string | null {
  const head = lines.findIndex((f) => f.key === 'NSTATES')
  if (head < 0) return null
  const states = kept.length + added.length + 1
  return (
    lines.slice(0, head).map((f) => line(f.key, f.value)).join('') +
    line('NSTATES', String(states)) +
    line('STATEPOS', String(states)) +
    kept.map((f) => line(f.key, f.value)).join('') +
    added.map((m) => line('MOVE', m)).join('')
  )
}
