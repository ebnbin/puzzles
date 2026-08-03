import type { DialogControl, KeyLabel } from './types'

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

/**
 * And the one key here that no puzzle reads, because it is not the puzzle's.
 *
 * `M` fills every square with every mark; this fills each with only the ones
 * its row, column and block have not already spent. The back end has no button
 * for that — solo.c's solver cannot be asked what is still possible, only told
 * to finish — so the key carries an action instead of a button and is answered
 * on this side. See engine/solo.ts.
 */
const POSSIBLE: KeyLabel = { button: 0, action: 'possible', icon: 'possible', aid: true }
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

/**
 * Which of a preference's answers is selected, or null if the box on offer
 * does not hold that preference at all.
 *
 * There is nothing to name it by. Every preference has a keyword upstream —
 * undead.c calls this one `monsters` — but emcc.c passes only the name and the
 * list of answers across the boundary, so the keyword never reaches this side.
 * Of the two that do arrive, the answers are the better thing to match on:
 * they are what is acted on below, so a preference renamed upstream would
 * still be read correctly, and one that gained or reordered an answer — the
 * change that would put the wrong face on a key — would be missed rather than
 * quietly misread.
 */
function preference(
  prefs: readonly DialogControl[],
  answers: readonly string[],
): number | null {
  for (const control of prefs)
    if (
      control.kind === 'choices' &&
      control.choices.length === answers.length &&
      control.choices.every((answer, i) => answer === answers[i])
    )
      return control.value
  return null
}

/** undead.c's "Monster representation", by its two answers. */
const MONSTERS = ['Pictures', 'Letters']

/** The three monsters, in the board's two ways of drawing them. */
const UNDEAD = [
  { letter: 'G', icon: 'ghost' },
  { letter: 'V', icon: 'vampire' },
  { letter: 'Z', icon: 'zombie' },
] as const

const RULES: Record<
  string,
  (p: string, prefs: readonly DialogControl[]) => KeyLabel[] | null
> = {
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
    return [...digits(cr), CLEAR, MARKS, POSSIBLE]
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
  /*
   * The three monsters, wearing what the board is wearing.
   *
   * Undead draws a ghost either as a ghost or as a G, and the key has to agree
   * with the square it fills: a button showing a vampire that writes a V is a
   * second puzzle on top of the first. Only the face changes — the key sent is
   * 'G', 'V' or 'Z' either way, which is what undead.c reads either way.
   *
   * The setting moves two ways and both land here, because both are the same
   * bit: the preferences box, and `a`, which undead.c turns over on its own
   * without saving it or announcing it. get_prefs reports `ui->ascii` as it
   * stands, so asking the box is asking the board.
   */
  undead(_p, prefs) {
    const letters = preference(prefs, MONSTERS) === MONSTERS.indexOf('Letters')
    return [
      ...UNDEAD.map(({ letter, icon }): KeyLabel => ({
        button: letter.charCodeAt(0),
        ...(letters ? { label: letter } : { icon }),
      })),
      CLEAR,
      MARKS,
    ]
  },

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

/**
 * Puzzles whose keypad is not settled by the game id alone. Everything else
 * here is worked out once per deal; these have to be worked out again whenever
 * a preference might have moved, which is what tells the host to go and look.
 */
export const READS_PREFS = new Set(['undead'])

export function keysFor(
  name: string,
  gameId: string,
  prefs: readonly DialogControl[] = [],
): KeyLabel[] {
  const rule = RULES[name]
  if (!rule) return []
  const keys = rule(params(gameId), prefs)
  // A misread game id would put a keypad of the wrong length on screen, which
  // is worse than none: better to show nothing than to offer a digit the
  // puzzle will not take, or to leave one out that it needs.
  if (!keys || keys.length < 1 || keys.length > MAX_SYMBOLS + 3) return []
  return keys
}
