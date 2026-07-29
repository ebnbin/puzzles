import type { KeyLabel } from './types'

/**
 * Which keys a puzzle needs offered on a device without a keyboard.
 *
 * Two sorts. The ones that put something in a square — digits, monsters,
 * clear — are what upstream's request_keys() returns, and six of the forty
 * puzzles have one. The rest are keys a puzzle reads but never advertises:
 * they do something to the whole board, and every one of them was, until
 * now, unreachable without a keyboard. Both are listed here, tagged, and
 * shown apart.
 *
 * Upstream answers the first question itself, through request_keys(), but
 * that is not reachable from here: the web front end never had a keypad, so
 * emcc.c does not call it, and the midend pointer is static in that file. The
 * lists it would return are short and derived from one number, so they are
 * reconstructed here instead of reaching into the C.
 *
 * This does duplicate upstream. If a puzzle changes the keys it asks for, or
 * the way it encodes its parameters, nothing here will notice — so the game
 * ids are asserted against in the tests, and an unrecognised one falls back
 * to no keypad rather than to a wrong one.
 */

/** Anything past this and the game id was misread, not merely unusual. */
const MAX_SYMBOLS = 36

/**
 * `count` consecutive values, spelled the way the puzzles spell them: as
 * digits while they fit in one, then as letters from `a`.
 */
function digits(count: number, startAtZero = false): KeyLabel[] {
  const first = startAtZero ? 0 : 1
  return Array.from({ length: count }, (_, i) => {
    const value = first + i
    const button =
      value <= 9 ? '0'.charCodeAt(0) + value : 'a'.charCodeAt(0) + value - 10
    return { button, label: String.fromCharCode(button) }
  })
}

/** Backspace. The midend treats 8 and 127 alike; upstream labels it Clear. */
const CLEAR: KeyLabel = { button: 8, icon: 'clear' }

/*
 * The keys no puzzle asks for.
 *
 * M fills every empty square with every pencil mark, which is how a whole
 * school of solvers likes to start. H plays one deduction for you. J deals
 * the same network again, shuffled — its own source asks "should we have
 * some mouse control for this?" and the answer, here, is this key.
 */
const MARKS: KeyLabel = { button: 'M'.charCodeAt(0), icon: 'marks', aid: true }
const HINT: KeyLabel = { button: 'H'.charCodeAt(0), icon: 'hint', aid: true }
const JUMBLE: KeyLabel = { button: 'J'.charCodeAt(0), icon: 'jumble', aid: true }

/**
 * The parameter prefix of a game id — everything before the first colon. For
 * `3x3:a1b2...` that is `3x3`.
 */
function params(gameId: string): string {
  return gameId.split(':')[0]
}

/** The leading number of a parameter string, when it is a sane grid size. */
function size(p: string): number | null {
  const m = p.match(/^(\d+)/)
  if (!m) return null
  const n = +m[1]
  return n >= 1 && n <= MAX_SYMBOLS ? n : null
}

const RULES: Record<string, (p: string) => KeyLabel[] | null> = {
  // Digits 1..c*r: a 3x3 sudoku wants 1-9, a 4x4 wants 1-9 and a-g.
  //
  // Following solo.c's decode_params, because the encoding has a turn in it.
  // The leading number is both dimensions unless an `x` supplies the second,
  // and a jigsaw — `9j`, or `3x3j` — collapses the blocks into a single row,
  // so its grid is c*r wide with r of 1. Flags after a `d` are difficulty
  // letters and say nothing about the size.
  solo(p) {
    const m = p.match(/^(\d+)(?:x(\d+))?(.*)$/)
    if (!m) return null
    let c = +m[1]
    let r = m[2] === undefined ? c : +m[2]
    if (m[3].split('d')[0].includes('j')) {
      if (m[2] !== undefined) c *= r
      r = 1
    }
    const cr = c * r
    if (cr < 1 || cr > MAX_SYMBOLS) return null
    return [...digits(cr), CLEAR, MARKS]
  },
  // Digits 1..w.
  keen(p) {
    const w = size(p)
    return w ? [...digits(w), CLEAR, MARKS] : null
  },
  towers(p) {
    const w = size(p)
    return w ? [...digits(w), CLEAR, MARKS] : null
  },
  // Digits 1..order, except that past 9 the puzzle counts from 0 so the
  // labels stay one character wide.
  unequal(p) {
    const order = size(p)
    if (!order) return null
    return [...digits(order, order > 9), CLEAR, MARKS, HINT]
  },
  // Always 1-9, whatever the grid.
  filling: () => [...digits(9), CLEAR],
  undead: () => [
    { button: 'G'.charCodeAt(0), icon: 'ghost' },
    { button: 'V'.charCodeAt(0), icon: 'vampire' },
    { button: 'Z'.charCodeAt(0), icon: 'zombie' },
    CLEAR,
    MARKS,
  ],

  // Nothing to put in a square — only the key that was out of reach.
  net: () => [JUMBLE],
  fifteen: () => [HINT],
  bridges: () => [HINT],
  range: () => [HINT],
  pearl: () => [HINT],
  guess: () => [HINT],
  // 0..n lights up every domino carrying that number, two at a time. The
  // parameter is the highest face, so a default board wants 0-6.
  dominosa(p) {
    const n = size(p)
    if (n === null) return null
    return digits(n + 1, true).map((key) => ({ ...key, aid: true }))
  },
}

export function keysFor(name: string, gameId: string): KeyLabel[] {
  const rule = RULES[name]
  if (!rule) return []
  const keys = rule(params(gameId))
  // A misread game id would put a keypad of the wrong length on screen, which
  // is worse than none: better to show nothing than to offer a digit the
  // puzzle will not take, or to leave one out that it needs.
  if (!keys || keys.length < 1 || keys.length > MAX_SYMBOLS + 3) return []
  return keys
}
