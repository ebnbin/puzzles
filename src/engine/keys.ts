import type { IconName } from '../Icon'
import type { DialogControl, KeyLabel } from './types'

/**
 * Which keys a puzzle needs offered on a device without a keyboard.
 *
 * Three sorts, and a row runs through them in this order. The ones that put
 * something in a square — digits, monsters, clear — are what upstream's
 * request_keys() returns, and six of the forty puzzles have one. Then the keys
 * a puzzle reads but never advertises: they do something to the whole board,
 * and every one of them was, until now, unreachable without a keyboard. Last
 * the three no puzzle reads at all, because they are this front end's own.
 *
 * That order is the row's own logic twice over. Reach grows along it — one
 * square, then the board, then the board again — and so does whose idea the key
 * is: the game as its author shipped it comes before anything added to it. The
 * three looks index.css gives them climb the same ladder, so the row is read
 * left to right in the order the styles are written.
 *
 * Upstream answers the first question itself, through request_keys(), but
 * that is not reachable from here: the web front end never had a keypad, so
 * emcc.c does not call it, and the midend pointer is static in that file. The
 * lists it would return are short and derived from one number, so they are
 * reconstructed here instead of reaching into the C.
 *
 * This does duplicate upstream. If a puzzle changes the keys it asks for, or
 * the way it encodes its parameters, nothing here will notice, and nothing
 * anywhere will catch it: there are no tests in this repo.
 *
 * What holds the line instead is the fallback, and it is worth knowing that it
 * is the only thing holding it. An id this file cannot read gets no keypad
 * rather than a wrong one, and a keypad of an impossible length is refused the
 * same way, so a misreading costs a missing keypad and not a digit the puzzle
 * will not take.
 */

/** Anything past this and the game id was misread, not merely unusual. */
const MAX_SYMBOLS = 36

/**
 * And the keys that are not symbols, at their widest: clear, the three of ours,
 * and Unequal's two of upstream's. Counted rather than guessed at, because it is
 * only ever used to tell a misread id from an unusual one, and a number too
 * small there would take a working keypad away instead — which is what it was on
 * its way to doing, having been written when there were two of these keys and
 * not four.
 *
 * The widest real keypad is Unequal's: solo.c stops at 31 symbols and
 * unequal.c at 32, so nothing legal comes anywhere near 36 + this.
 *
 * Named for what it counts rather than for what those keys are, because they
 * are not one thing any more: of the six, clear is a plain key, M and H are
 * upstream's and the last three are ours. It was `MAX_AIDS` while "aid" was
 * the word for all of them — see `whose` in ./types, where that word ran out.
 */
const MAX_EXTRAS = 6

/**
 * `count` consecutive values, spelled the way the puzzles spell them: as
 * digits while they fit in one, then as letters from `a`.
 *
 * The character and the value part company when `startAtZero` does it: Unequal
 * counts from zero above order nine so that every label stays one character
 * wide, and there its `0` is the value 1. Both are carried, because the key
 * shows one and the board counts the other.
 */
function digits(count: number, startAtZero = false): KeyLabel[] {
  const first = startAtZero ? 0 : 1
  return Array.from({ length: count }, (_, i) => {
    const shown = first + i
    const button =
      shown <= 9 ? '0'.charCodeAt(0) + shown : 'a'.charCodeAt(0) + shown - 10
    return { button, label: String.fromCharCode(button), value: i + 1 }
  })
}

/** Backspace. The midend treats 8 and 127 alike; upstream labels it Clear. */
const CLEAR: KeyLabel = { button: 8, icon: 'clear' }

/*
 * The keys that are the puzzle's, which it reads without ever offering a button
 * for. M fills every empty square with every pencil mark; H runs the game's own
 * solver as far as it will go; J deals the same network again, shuffled — its
 * own source asks "should we have some mouse control for this?" and the answer,
 * here, is this key.
 *
 * `M` was taken off these five keypads when the three below arrived, on the
 * grounds that the first of them *is* `M` when there is nothing to rule out and
 * a keypad should not offer one key twice. That was wrong twice over. They
 * differ even then — `M` writes every value, POSSIBLE only the ones the board
 * has not ruled out — and they are opposites the rest of the time, since `M`
 * fills marks the reader has spent the game crossing off. It is upstream's key,
 * with upstream's meaning and upstream's word for it, and it is back.
 */
const MARKS: KeyLabel = { button: 'M'.charCodeAt(0), icon: 'marks', whose: 'upstream' }
const HINT: KeyLabel = { button: 'H'.charCodeAt(0), icon: 'hint', whose: 'upstream' }
const JUMBLE: KeyLabel = { button: 'J'.charCodeAt(0), icon: 'jumble', whose: 'upstream' }

/**
 * And the three keys no puzzle reads, because they are not the puzzle's: work
 * out what each square can still take, write in the squares that have come down
 * to one, and take every mark off again. No back end has a button for any of
 * them — their solvers cannot be asked what is still possible, only told to
 * finish — so these carry an action rather than a button and are answered on
 * this side. See engine/marks.
 *
 * In that order among themselves, because the first two are the pair a reader
 * alternates and the third is the one they reach for rarely: it is how the first
 * is made to fill again rather than subtract.
 */
const POSSIBLE: KeyLabel = { button: 0, action: 'possible', icon: 'possible', whose: 'ours' }
const SINGLE: KeyLabel = { button: 0, action: 'single', icon: 'single', whose: 'ours' }
const BLANK: KeyLabel = { button: 0, action: 'blank', icon: 'blank', whose: 'ours' }

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
    return [...digits(cr), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK]
  },
  // Digits 1..w.
  keen(p) {
    const w = size(p)
    return w ? [...digits(w), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK] : null
  },
  towers(p) {
    const w = size(p)
    return w ? [...digits(w), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK] : null
  },
  // Digits 1..order, except that past 9 the puzzle counts from 0 so the
  // labels stay one character wide.
  //
  // Two of upstream's here rather than one, and in the order unequal.c's own
  // manual puts them: "use the M key to auto-fill every numeric hint, ready for
  // removal as required, or the H key to do the same but also to remove all
  // obvious hints". Both write over the pencil marks with something the reader
  // did not put there. The three after them are ours and stay inside what the
  // marks on the board already say — see engine/marks, which is exact about how
  // far that goes now that one of them draws a conclusion from them.
  unequal(p) {
    const order = size(p)
    if (!order) return null
    return [...digits(order, order > 9), CLEAR, MARKS, HINT, POSSIBLE, SINGLE, BLANK]
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
      POSSIBLE,
      SINGLE,
      BLANK,
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
  //
  // `value` comes off them: these are the only digit keys in the collection
  // that put nothing in a square, so there is nothing on the board for one to
  // be counted against.
  dominosa(p) {
    const n = size(p)
    if (n === null) return null
    return digits(n + 1, true).map(({ value: _, ...key }): KeyLabel => ({
      ...key,
      whose: 'upstream',
    }))
  },
}

/**
 * Puzzles whose keypad is not settled by the game id alone. Everything else
 * here is worked out once per deal; these have to be worked out again whenever
 * a preference might have moved, which is what tells the host to go and look.
 */
export const READS_PREFS = new Set(['undead'])

/**
 * The one puzzle that does not read the cursor keys.
 *
 * Everything above is about the keys a puzzle asks for. This is about the four
 * it is never asked about and almost always takes: the arrows, which the
 * midend hands over as CURSOR_UP and its three neighbours, and which
 * thirty-nine of the forty do something with — move a cursor, roll a cube,
 * slide a tile, walk the rim of the grid.
 *
 * Loopy is the exception, and it is an explicit one rather than an oversight.
 * Its `interpret_move` switches on the three mouse buttons and returns NULL for
 * everything else; the comment above that switch reads "I think it's only
 * possible to play this game with mouse clicks, sorry". Its
 * `game_get_cursor_location` is an empty function, because it has no cursor to
 * report, and its chapter of the manual describes no keyboard control at all.
 * Three independent ways of saying the same thing.
 *
 * Stated as the exception rather than as a list of thirty-nine because that is
 * what it is: a puzzle added upstream will read the arrows unless it says
 * otherwise, and the cost of being wrong here is small and self-correcting —
 * four keys that do nothing, which the reader turns off again. That is the
 * opposite of the bargain `keysFor` strikes below, where a misread id would put
 * a *wrong* key on screen, and the answer is to show none.
 */
const NO_ARROWS = new Set(['loopy'])

/** Whether this puzzle does anything at all with the arrow keys. */
export const readsArrows = (name: string) => !NO_ARROWS.has(name)

/**
 * The puzzle whose board has eight ways out of a square rather than four.
 *
 * Inertia's ball rolls until it hits something, and it rolls diagonally as
 * readily as it rolls straight: `DX`/`DY` in inertia.c turn its eight
 * directions into the eight unit steps, corners included. Four of those are the
 * arrow keys and the other four have no key at all — upstream puts them on the
 * corners of the numeric keypad, which is a device this app's readers largely
 * do not have.
 *
 * So this is the one place the four arrows really are half a control, and the
 * cross grows into a full three by three to hold the rest.
 *
 * Cube is the puzzle that looks like it belongs here and does not, which is
 * worth writing down because reading the key handler alone says otherwise: it
 * takes the same four numpad corners, but on its square grid all four are
 * `0` — "no diagonals in a square", cube.c says — and on its triangular grids
 * they are aliases, `UP_LEFT` wired to `LEFT` and both down diagonals to
 * `DOWN` (cube.c:408-411, 453-456). A triangle has three exits, not eight.
 * Measured over four presets and sixteen positions, no numpad corner in Cube
 * ever reached a square one of the four arrows had not already reached.
 */
const EIGHT_WAY = new Set(['inertia'])

/** Whether the four arrows are the whole of this puzzle's directions. */
export const movesEightWays = (name: string) => EIGHT_WAY.has(name)

/**
 * A key that acts on the square the cursor is sitting on, offered beside the
 * arrows because it is the half of them that does anything.
 *
 * Moving a cursor is not playing: something has to happen where it stops, and
 * in almost every puzzle here that something is Enter or Space —
 * `CURSOR_SELECT` and `CURSOR_SELECT2` once midend.c has translated them
 * (midend.c:1255). Thirty-seven of the forty read the first and twenty-nine the
 * second, so without them the arrows move a cursor that can never do anything,
 * which is most of a keyboard's worth of play still out of reach on a phone.
 *
 * Sent by name rather than by code, the way the arrows are: emcc.c matches
 * "Enter" and a bare space against the key string before it consults any key
 * code, so these arrive as the same button a keyboard would produce.
 */
export type CursorKey = {
  /** The key name, as emcc.c matches it: "Enter" or " ". */
  key: string
  icon: IconName
  /** Which of the words under `play.cursor` this key is called. */
  says: CursorWord
}

/** The words these keys can be called, so a missing translation is a type error. */
export type CursorWord = 'rotateLeft' | 'lock' | 'pencil' | 'black' | 'white'

/**
 * What the back end says its two cursor keys would do, right now.
 *
 * `post_move` asks for both after every input event and pushes them out
 * (emcc.c:310) — the same notice that carries undo and redo — and each puzzle
 * answers from wherever its cursor is standing. Net says "Rotate" on a tile you
 * can turn and nothing at all on one you have locked; Solo says "Pencil" only
 * once a square is highlighted.
 *
 * This is the only thing this side ever learns about the cursor.
 * `midend_get_cursor_location` exists and would say where it is, but emcc.c
 * neither calls nor exports it, so the position is unreachable without changing
 * the C. Two words about what the keys would do turn out to be enough for what
 * the keys need, which is to know when to stand down.
 *
 * Named for the keys the buttons send rather than for upstream's `csk`/`lsk`,
 * which are a phone's soft keys and not these.
 */
export type KeyLabels = { enter: string; space: string }

/**
 * Whether a cursor key would do nothing where the cursor is standing.
 *
 * Enter is idle exactly when its own label is empty. Space is idle only when
 * *both* are, and the asymmetry is forced rather than chosen:
 * `js_update_key_labels` blanks `lsk` when it equals `csk`, so an empty Space
 * beside a named Enter has two meanings this side cannot tell apart. Measured,
 * Solo and Unequal both report `{"", "Pencil"}` from a highlighted square — and
 * in Solo that Space really is dead (`current_key_label` answers only
 * `CURSOR_SELECT`), while in Unequal it does exactly what Enter does
 * (`IS_CURSOR_SELECT`, which covers both). One reading grants a key that would
 * do nothing; the other takes away a key that works. A press that turns out to
 * be wasted is cheap, and a button greyed out for good is a feature nobody can
 * find, so the tie goes to alive.
 *
 * "Nothing" here means nothing to the board. Two puzzles would still wake a
 * sleeping cursor from a key whose label is empty: Pattern's select shows the
 * cursor and returns before touching a square (pattern.c:1423), and Net's sets
 * `cur_visible` on its way to a rotation the lock will refuse (net.c:2330).
 * Both are greyed here anyway. The arrows are in the same group, they wake the
 * cursor too, and unlike these they say where it went.
 */
export const doesNothing = (key: string, labels: KeyLabels) =>
  key === 'Enter' ? !labels.enter : !labels.enter && !labels.space

/**
 * Which puzzles have been given theirs, and what they do.
 *
 * One entry per puzzle rather than one rule for all of them, because what Enter
 * does is each puzzle's own answer and the picture on the key has to agree with
 * it — a padlock that rotated something would be a second puzzle on top of the
 * first. The back end will happily report what its two keys do right now
 * (`current_key_label`, which all forty implement), but it reports a word and
 * in English; a picture is what fits on a 40 square, and it has to be chosen.
 *
 * At most two, in this order: the first sits left of the up arrow and the
 * second right of it, in the two cells the cross leaves empty. A puzzle with
 * one key fills only the left.
 *
 * Being absent is the same bargain the rest of this file strikes: a puzzle
 * nobody has worked through yet shows the four arrows and nothing else, rather
 * than a guessed pair.
 */
const PENCIL: CursorKey = { key: 'Enter', icon: 'pencil', says: 'pencil' }

export const CURSOR_KEYS: Record<string, CursorKey[]> = {
  /*
   * Rotate, and lock.
   *
   * Rotating is the game, so it takes the left cell. Locking is the other
   * thing a reader does constantly — it is how you record that a tile is
   * settled — and it had no way in on a touch device at all: net.c gives it to
   * the middle button, and a finger has no middle button.
   *
   * Rotating the other way is not here and does not need to be. It is three
   * presses of this one, since a tile turns in quarters, and the cross has only
   * two cells to give.
   */
  net: [
    { key: 'Enter', icon: 'rotate', says: 'rotateLeft' },
    { key: ' ', icon: 'lock', says: 'lock' },
  ],

  /*
   * Two keys that are one key twice, wound opposite ways.
   *
   * A Pattern square is grey, black or white, and `Enter` steps it round that
   * cycle while `Space` steps it back — "the space bar does the same cycle in
   * reverse", as its chapter puts it. So neither key *sets* a colour, and the
   * pictures on them are the colour each reaches from a square nobody has
   * touched, which is where nearly every press happens. What the second and
   * third press do is on the long press, where a sentence fits.
   *
   * This also quietly closes something older. Grey is upstream's middle button
   * — or Shift with any button — and a finger has neither, so on a touch device
   * a square could be painted but never unpainted. `Space` on a black square is
   * grey in one press. The keys were added for the arrows; the hole they fill
   * was there before them.
   */
  pattern: [
    { key: 'Enter', icon: 'black', says: 'black' },
    { key: ' ', icon: 'white', says: 'white' },
  ],

  /*
   * And one key, the same one, on all five puzzles that keep pencil marks.
   *
   * Whether the next digit goes in as an answer or as a pencil mark is a mode,
   * and `Enter` is how the mode is turned over — `ui->hpencil = !ui->hpencil`
   * in every one of the five. On a keyboard that is the whole of it; on a
   * phone, where the digits are already buttons, it was the one thing about
   * them nobody could say, so the digits could only ever write answers.
   *
   * Nothing goes in the cell beside it, and that is not an omission. `Space` in
   * four of the five is clear — the same branch as `\b`, which is on the keypad
   * as its own key already — and in Unequal it is `Enter` again, since that one
   * matches with `IS_CURSOR_SELECT`, which is both. A second button would be a
   * key these puzzles already have, twice.
   */
  solo: [PENCIL],
  unequal: [PENCIL],
  keen: [PENCIL],
  towers: [PENCIL],
  undead: [PENCIL],
}

/**
 * The button a second press on the board stands for, where it is not the right
 * one.
 *
 * Every pointer makes two presses and no more: a finger taps or holds, a mouse
 * clicks left or right. `usePuzzlePointer` spends the second of them on the
 * right button, which is the correct trade almost everywhere — half the
 * collection needs a right click for something, flagging a mine or pencilling a
 * digit — but it leaves the middle button with no gesture at all, and in Net
 * the middle button is the lock.
 *
 * So Net spends its second press differently. What it gives up is rotating the
 * other way, which is three presses of the ordinary rotate; what it buys is the
 * only gesture that can lock a tile, and locking has no substitute at all.
 *
 * One number for both pointers, not one for the hold and another for the right
 * click. They are the same request made two ways, and this was briefly wrong in
 * exactly that way: the hold locked while the right click went on rotating, so
 * the same board answered a mouse and a finger differently.
 *
 * Per puzzle, and it has to be: making this the rule everywhere would take the
 * right click away from the twenty-odd puzzles that are played with it.
 */
export const SECOND_PRESS: Record<string, number> = {
  /** The middle button, which is `TOGGLE_LOCK` in net.c. */
  net: 1,
}

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
  if (!keys || keys.length < 1 || keys.length > MAX_SYMBOLS + MAX_EXTRAS) return []
  return keys
}
