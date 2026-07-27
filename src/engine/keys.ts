import type { KeyLabel } from './types'

/**
 * Which keys a puzzle needs offered on a device without a keyboard.
 *
 * Upstream answers this itself, through the back end's request_keys(), but
 * that is not reachable from here: the web front end never had a keypad, so
 * emcc.c does not call it, and the midend pointer is static in that file. The
 * lists it would return are short and derived from one number, so they are
 * reconstructed here instead of reaching into the C.
 *
 * Only six of the forty puzzles want keys at all. Two of them are fixed; the
 * other four are the digits 1..N, and N is in the game id, which the puzzle
 * hands us for its permalink every time the game or the preset changes.
 *
 * This does duplicate upstream. If a puzzle changes the keys it asks for, or
 * the way it encodes its parameters, nothing here will notice — so the game
 * ids are asserted against in the tests, and an unrecognised one falls back
 * to no keypad rather than to a wrong one.
 */

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
const CLEAR: KeyLabel = { button: 8, label: 'Clear' }

/**
 * The parameter prefix of a game id — everything before the first colon. For
 * `3x3:a1b2...` that is `3x3`.
 */
function params(gameId: string): string {
  return gameId.split(':')[0]
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
    return [...digits(c * r), CLEAR]
  },
  // Digits 1..w.
  keen(p) {
    const m = p.match(/^(\d+)/)
    return m ? [...digits(+m[1]), CLEAR] : null
  },
  towers(p) {
    const m = p.match(/^(\d+)/)
    return m ? [...digits(+m[1]), CLEAR] : null
  },
  // Digits 1..order, except that past 9 the puzzle counts from 0 so the
  // labels stay one character wide.
  unequal(p) {
    const m = p.match(/^(\d+)/)
    if (!m) return null
    const order = +m[1]
    return [...digits(order, order > 9), CLEAR]
  },
  // Always 1-9, whatever the grid.
  filling: () => [...digits(9), CLEAR],
  undead: () => [
    { button: 'G'.charCodeAt(0), label: 'Ghost' },
    { button: 'V'.charCodeAt(0), label: 'Vampire' },
    { button: 'Z'.charCodeAt(0), label: 'Zombie' },
    CLEAR,
  ],
}

export function keysFor(name: string, gameId: string): KeyLabel[] {
  const rule = RULES[name]
  if (!rule) return []
  const keys = rule(params(gameId))
  // A misread game id would put a keypad of the wrong length on screen, which
  // is worse than none: better to show nothing than to offer a digit the
  // puzzle will not take, or to leave one out that it needs.
  if (!keys || keys.length < 2 || keys.length > 37) return []
  return keys
}
