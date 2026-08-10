import type { IconName } from '../Icon'
import { COLOURS } from './map'
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

/**
 * Whether a boolean preference is on. False when the box on offer does not
 * hold it at all, which is the same answer as off — a keypad drawn from a
 * setting nobody has is the plain one.
 *
 * Matched on the label, which `preference` above goes out of its way not to
 * do. There is no choice here: a boolean has no answers to match on, and the
 * keyword never crosses the boundary. So this is the one place where a
 * sentence rewritten upstream would quietly take a face off a key, rather than
 * putting the wrong one on it.
 */
function flag(prefs: readonly DialogControl[], label: string): boolean {
  for (const control of prefs)
    if (control.kind === 'boolean' && control.label === label) return control.value
  return false
}

/** undead.c's "Monster representation", by its two answers. */
const MONSTERS = ['Pictures', 'Letters']

/** The three monsters, in the board's two ways of drawing them. */
const UNDEAD = [
  { letter: 'G', icon: 'ghost' },
  { letter: 'V', icon: 'vampire' },
  { letter: 'Z', icon: 'zombie' },
] as const

/**
 * The two colour numbers Guess's keys are pictures of: the first peg colour,
 * which the other nine follow, and the ink the board rims a peg and writes its
 * digit in. Counted off the `COL_*` enum at guess.c:21-25, where COL_BACKGROUND
 * is 0 — the same counting the back end reports its colours by.
 */
const COL_FRAME = 1
const COL_1 = 6

/**
 * And Map's first region colour, off its own enum (map.c:68-74), where
 * COL_BACKGROUND is 0 and COL_GRID is 1. Its four run from here.
 */
const COL_MAP = 2

/** guess.c's own name for the setting that writes numbers on the pegs. */
const LABELLED = 'Label colours with numbers'

/**
 * Clear, sent backwards: it takes the peg behind the write head rather than the
 * one under it.
 *
 * Upstream's key clears where the head is (guess.c:948) and a digit moves the
 * head on after placing (946), so a reader who has just typed a peg and wants it
 * back finds the key does nothing where it stands. That is not what a key drawn
 * as a backspace means anywhere else, and the row above it is a row of
 * characters being typed.
 *
 * It steps *always*, and the version that did not is worth keeping as a lesson.
 * It used to try in place first and step only if that press was wasted, which is
 * right when the reader can put the head anywhere: standing on a peg then means
 * "this one". Once a guess is typed left to right the head is always one past
 * the last thing typed, so in place is always the wrong peg — and it stayed
 * hidden until holds began pre-filling pegs *ahead* of the head. Measured: with
 * the second peg held, the row `5,2_,0,0` came back `5,0_,0,0`, which is the
 * held peg gone and the typed one untouched.
 *
 * Stepping always also retires the case that had to be written for the Submit
 * slot. Upstream's clear branch is the only one in that function that does not
 * bound-check `peg_cur` first — it would read, and possibly write, one int past
 * the row — and a key that steps before it presses is never pressed there.
 *
 * What it cannot do by itself is stop at the start of a row: `move_cursor`
 * clamps, so the step is silently wasted and the clear lands on the first peg,
 * which with a held first peg is a peg nobody typed. The back end will not say
 * — `move_cursor` does answer MOVE_NO_EFFECT when it clamps (misc.c:387), but
 * emcc turns that into a false return only for the key spelled "Backspace"
 * (emcc.c:456), so an arrow answers true either way, measured. So PuzzleHost
 * counts what has been typed instead; see `advances`.
 */
const ERASE: KeyLabel = { ...CLEAR, behind: { step: 'ArrowLeft' } }

/**
 * And the two that came off the arrows block when Guess stopped having one.
 *
 * Both are upstream's own select keys, which is why they are `upstream` rather
 * than ours: `Enter` marks the guess (guess.c:934) and `Space` turns the hold on
 * the peg the write head is on (961). Neither is anything new — they have moved
 * from one row to the other, because that other row is now the whole keyboard.
 *
 * `HOLD` goes *first*, ahead of the digits, and that is the one place this file
 * puts an `upstream` key before the ordinary ones. The ladder it breaks is about
 * how far a press reaches; this is about the order two presses are made in. A
 * digit puts a peg down and moves the head on (guess.c:946), so a hold has to be
 * asked for before the digit that fills the peg — and a key you press first
 * reads first. Left of the digits is where it is pressed from.
 *
 * `SUBMIT` is drawn always and dimmed until the guess is whole, which upstream
 * says outright: its Enter reports "Submit" only at the end of the row
 * (guess.c:547), and reports "Place" everywhere else. See `needs`.
 */
const HOLD: KeyLabel = { button: ' '.charCodeAt(0), icon: 'lock', whose: 'upstream' }

const SUBMIT: KeyLabel = {
  restarts: true,
  // 13 rather than the name: a one-character key string is passed straight
  // through (emcc.c:402) and `midend_process_key` turns 13 into CURSOR_SELECT
  // (midend.c:1255), so the ordinary keypad path carries it.
  button: 13,
  icon: 'done',
  needs: 'Submit',
  whose: 'upstream',
}

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
  /*
   * Guess's colour bar, as keys: one per colour, drawn as the peg it puts down
   * where the cursor is.
   *
   * These are the one set here that draws itself from the board's palette
   * rather than from a glyph or a character — see `slot`, and the renderer's
   * `colour`. A digit would need the reader to have turned the labels on and
   * learnt the numbering; a swatch is the thing they are already looking at.
   *
   * And when the labels *are* on, the key wears the number too, because the
   * board does. Same trade as Undead's monsters: the key has to agree with the
   * square it fills, and the setting that decides one decides the other. Which
   * is why guess is the second name in READS_PREFS.
   */
  guess(p, prefs) {
    const m = p.match(/^c(\d+)p(\d+)g\d+/)
    if (!m) return null
    const n = +m[1]
    // The pegs in a guess, which is how far the write head can run: a digit
    // moves it on (guess.c:946) and stops at the Submit slot past the last peg.
    const pegs = +m[2]
    // guess.c:219-224: under two colours is not a puzzle, and ten is as many
    // as game_colours defines.
    if (n < 2 || n > 10 || pegs < 1) return null
    const labelled = flag(prefs, LABELLED)
    return [
      HOLD,
      ...Array.from({ length: n }, (_, i): KeyLabel => {
        // guess.c:940 takes '1'..'9' and then '0' for the tenth, and draw_peg
        // writes `'0' + col % 10` inside the peg — so the character the key
        // sends and the character the board shows are the same one, and the
        // tenth peg is labelled 0 on both.
        const button = '0'.charCodeAt(0) + ((i + 1) % 10)
        // Which end of the bar to count from: the nearer one, since the walk
        // costs `span` presses to reach an end plus the distance back. Up
        // clamps `colour_cur` to 0 (misc.c:378), which is the first colour.
        const fromTop = i <= (n - 1) / 2
        return {
          button,
          ...(labelled ? { label: String.fromCharCode(button) } : {}),
          slot: COL_1 + i,
          ink: COL_FRAME,
          value: i + 1,
          advances: pegs,
          aims: {
            home: fromTop ? 'ArrowUp' : 'ArrowDown',
            step: fromTop ? 'ArrowDown' : 'ArrowUp',
            span: n,
            at: fromTop ? i : n - 1 - i,
          },
        }
      }),
      ERASE,
      SUBMIT,
      HINT,
    ]
  },

  /*
   * Map's palette, which upstream has not got and could not have.
   *
   * Its four colours have numbers — `FOUR` is 4 and map.c:1301 asserts it at
   * compile time, the move language is `'0' + colour` (map.c:2609), and the
   * board draws colour i in slot `COL_0 + i` (map.c:68-74). So the keys can be
   * written down once and are the same on every deal. What they cannot be is
   * built out of upstream keys: `drag_colour` only ever becomes a colour by
   * being read off a region already on the board (map.c:2521 and 2542), so
   * there is no key, and no sequence of keys, that means "red". These go
   * through the save file instead — see engine/map for the whole argument.
   *
   * Four keys and not eight. A region takes two kinds of answer and the board
   * draws them differently — filled is "this region is red", a scatter of dots
   * is "it might be" (map.c:2872) — and both used to have a swatch of their
   * own. Two rows of colours is two rows to read before pressing one, and the
   * second row is the rarer answer. So the maybe is a modifier beside the
   * arrows instead, and these four wear the dots while it is armed: see
   * `asMaybes`, and `arms` on CursorKey.
   */
  map: () =>
    Array.from({ length: COLOURS }, (_, i): KeyLabel => ({
      button: 0,
      slot: COL_MAP + i,
      paints: { colour: i },
      aimed: true,
      whose: 'ours',
    })),

    // Nothing to put in a square — only the key that was out of reach.
  net: () => [JUMBLE],
  fifteen: () => [HINT],
  bridges: () => [HINT],
  range: () => [HINT],
  pearl: () => [HINT],
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
 *
 * Both are here for the same reason and answer it differently: the board draws
 * a thing two ways, and the key that puts that thing down has to be drawn the
 * way the board is. Undead's `a` moves the setting without touching the box,
 * so the box is asked again after every press; Guess's `l` does the same
 * (guess.c:825), which is why asking is on the key rather than on the box.
 */
export const READS_PREFS = new Set(['undead', 'guess', 'palisade'])

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

/**
 * The puzzle whose keyboard is the keypad alone.
 *
 * Guess. Its arrows were never one cursor: `move_cursor` is handed
 * `&ui->peg_cur` for x and `&ui->colour_cur` for y (guess.c:925), so Left and
 * Right walk the holes of the guess being built and Up and Down walk the colour
 * bar. Half a cross that travels and half that is a one-dimensional menu.
 *
 * The menu half is answered better by the swatches, which are upstream's own
 * number keys (guess.c:940) and exist for exactly that reason. The travelling
 * half turned out not to be needed either: a digit puts a peg down and moves the
 * head on by itself (946), so a guess is typed left to right the way a code is
 * typed anywhere, backspace is the edit, and the last digit walks the head onto
 * the Submit slot without being asked. What is left for an arrow to do is jump
 * to a peg out of order — and a finger reaches that by dragging a colour onto
 * the peg, which is what the board is for (guess.c:858).
 *
 * So the block is not drawn at all, rather than drawn with two of its four keys
 * dead. A button that can never be pressed is a fourth kind of "no" beside
 * absent, dim and lit-but-inert, and each of those three already means something
 * exact. Dim promises "somewhere else this works"; a permanently dim arrow would
 * be that promise broken on every board.
 *
 * What it costs is written down rather than waved past. A held peg carries into
 * the next guess and the head goes back to zero (guess.c:525-535), so a reader
 * types over the held pegs with the same values rather than skipping them: the
 * hold key saves no presses, and is left as a way to say "keep this one" while
 * typing. Holding after the fact — the natural moment, once the feedback is on
 * screen — is a long press on the peg itself, which is upstream's right button
 * (guess.c:912) and reads better there than on any key.
 */
const PAD_ONLY = new Set(['guess'])

/**
 * Whether this puzzle is offered the arrows block: it must read the keys, and
 * it must be one whose keyboard is not the keypad alone.
 */
export const offersArrows = (name: string) => !NO_ARROWS.has(name) && !PAD_ONLY.has(name)

/**
 * The puzzles whose keypad arrives with the arrows, because without them the
 * keys have no way to be aimed.
 *
 * Map, and so far only Map. Nearly every keypad in the collection acts where the
 * cursor is, and nearly every one is fine without the arrow buttons, because a
 * tap on the board puts the cursor where the reader wants: that is how a digit
 * gets into Solo on a phone. Map has no such path — a press on its board starts
 * a drag and hides the cursor without moving it (map.c:2552) — so with the
 * arrows off its palette can only ever paint whichever region the cursor was
 * last left on, which is the top-left one and stays the top-left one.
 *
 * Which keys go is `aimed` on each key rather than a rule about `whose`, and
 * that distinction was got wrong once: the first version dropped the keys with
 * no `whose`, which was right for the puzzle it was written for and exactly
 * backwards for Map, whose nine keys are all `ours` and would all have stayed.
 * A key says for itself whether it needs aiming.
 */
const KEYS_WITH_ARROWS = new Set(['map'])

/**
 * The palette said as maybes, for while Map's modifier is armed.
 *
 * A transform rather than a second set of keys, so that the row a thumb has
 * learnt keeps its length and its order and only changes what it is offering.
 * The dots are what the board draws for a stipple, which is the same rule every
 * swatch here follows: the key looks like what it puts down.
 */
export const asMaybes = (keys: KeyLabel[]): KeyLabel[] =>
  keys.map((k) =>
    k.paints && k.paints.colour >= 0
      ? { ...k, dotted: true, paints: { ...k.paints, pencil: true } }
      : k,
  )

/** Whether this puzzle's aimed keys come and go with its arrows. */
export const keysFollowArrows = (name: string) => KEYS_WITH_ARROWS.has(name)

/**
 * Whether this puzzle's row is typed against a write head this side counts.
 *
 * Guess, and it is a list rather than a rule for the same reason the two above
 * are: what moves a head is that puzzle's own answer, and the count only exists
 * to serve one key. See `advances` and `behind` on KeyLabel, and `typed` in
 * PuzzleHost, which is the count itself.
 */
export const heads = (name: string) => name === 'guess'

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
  /**
   * The key name, as emcc.c matches it: "Enter" or " ". Empty for the two that
   * are answered on this side and send nothing — see `paints` and `arms`, and
   * the branch in PuzzleHost that keeps them away from the label machinery.
   */
  key: string
  /**
   * Answered here, not sent: what this key puts in the region under the cursor.
   * The same field, and the same door, as the keypad key of that name.
   */
  paints?: { colour: number; pencil?: boolean }
  /**
   * A mode rather than a move: while it is armed the palette offers maybes
   * instead of colours, and it stays armed until it is pressed again.
   *
   * The same lifetime as `sweeps`, which is not a coincidence — it was one
   * press long first, and the two of them lit the same way while on, so the
   * only thing a reader could tell them apart by was saying they were the same.
   * The reasons for landing on this lifetime rather than the other are at the
   * call site in PuzzleHost.
   *
   * Out while there is no cursor, like everything else it stands among.
   */
  arms?: boolean
  icon: IconName
  /** Which of the words under `play.cursor` this key is called. */
  says: CursorWord
  /**
   * Upstream's own word for the thing this button is for, when the button is
   * named for a result rather than for a press.
   *
   * With it, the button stops meaning "send this key" and starts meaning "get
   * me this": it sends whichever of the two keys currently offers the word, and
   * stands down when neither does, which is what already having it looks like.
   * See `wouldSend`, and `WORDS` for the vocabulary that makes it safe.
   */
  does?: string
  /**
   * And what to ask for instead once the square already has it, which turns a
   * key that places a value into a switch for that value.
   *
   * Nobody offering `does` is exactly "this square is already that", since a
   * puzzle does not label a press that would change nothing — so the fallback
   * fires on precisely the squares the switch should be emptying, and on no
   * others. That equivalence is what makes this safe without reading anything:
   * see `holding`, which is the same test asked for the button's face.
   *
   * Range's two, and only where the labels can tell all three states apart.
   * Its do: an empty square offers {Fill, Dot}, a dotted one {Empty, Fill} and
   * a filled one {Dot, Empty} (range.c:1317), so every one of the six
   * transitions a pair of switches needs is exactly one press, and which press
   * is always readable from the words.
   */
  instead?: string
  /**
   * And the key to send when the square already holds this key's own value,
   * for a switch whose puzzle cannot answer that in words.
   *
   * Tents': `T` and `N` are absolute keys upstream reads on the line after its
   * cycle keys (tents.c:1706), so placing is one press and needs nothing. What
   * needs something is emptying, because "Clear" is upstream's word for a tent
   * and for a green square alike (tents.c:1485-1486) and the blanking then eats
   * the first of the pair — the two states arrive here identical. `instead`
   * cannot help: it reads the words, and the words are the problem.
   *
   * So the value under the cursor is read from the save file instead and handed
   * in from outside. See engine/tents, and `held` in PuzzleHost, which is the
   * only caller.
   */
  switches?: string
  /**
   * Arms the next arrow press to carry these modifiers, and is spent by it.
   *
   * Bridges', and so far only that. Its `Shift`+arrow marks "these two islands
   * are definitely not joined" (bridges.c:2449-2453) and nothing else on the
   * keyboard reaches it: `Enter` starts a drag with `drag_is_noline` false, and
   * the line that looks as though `Space` could start a no-line one
   * (bridges.c:2540) sits inside a branch that has already excluded `Space`, so
   * it is dead as written. Without this the mark has no route into the arrow
   * row at all.
   *
   * Spent by one press rather than sticky, and that is not the coin-flip it
   * looks like. While it is armed an arrow lays a mark and *does not move the
   * cursor* — `finish_drag` leaves cur_x and cur_y alone — so a sticky version
   * would be a mode a reader has to remember to leave before they can go
   * anywhere at all. Map's sticky arming modifies its four colour keys, which
   * are pressed on purpose; this one modifies the keys travelling is done with.
   *
   * Shown on the key and not on the arrows, which is where Bridges already puts
   * this: `Enter` is an arming key too — it opens a drag the next arrow closes —
   * and it says so by changing its own face. A one-press life needs no more.
   */
  primes?: { shift?: boolean; ctrl?: boolean }
  /**
   * The modifier that paints this key's result along a cursor move, for the
   * puzzles whose arrows can paint.
   *
   * Nine back ends read `Shift`/`Ctrl` with an arrow, and in several of them it
   * is the same act as this key: move one square and set what you crossed. It
   * has never had a button because a button cannot hold a modifier down — see
   * `sweeps`, which is the button that can.
   *
   * The pairing is the puzzle's, not ours, and it is not guessable: Pattern
   * spends `Ctrl` on black, `Shift` on white and both together on grey
   * (pattern.c:1406), which is neither the order of its keys nor the order of
   * its colours.
   */
  brush?: { shift?: true; ctrl?: true }
  /**
   * A sticky mode rather than a move: while it is on, every arrow carries the
   * `brush` of whichever neighbouring key is chosen.
   *
   * The one thing on this row that is not a press but a way of pressing. It
   * exists because painting a run is what these puzzles are played by and the
   * only gesture upstream offers for it is a held modifier — which a thumb has
   * no way to hold. Upstream reached the same conclusion itself once and did it
   * in the back end: Sixteen's chapter says Enter and Space "simulate holding
   * down" Control and Shift. This is that, one layer out, for the puzzles whose
   * authors did not.
   *
   * Which key it paints with is chosen by pressing that key, and the chosen one
   * is ringed. See PuzzleHost.
   *
   * Unless there is only one, in which case this key carries the `brush` itself
   * and nothing is chosen or ringed. Tents can only sweep green and Range can
   * only sweep dots — their modifier tables have one entry — and a chooser
   * among one is a step that always has the same answer. It also gets Range out
   * of a hole: both of its keys are cycle keys wearing all three faces, so
   * there is no key that permanently means "dot" for a ring to sit on.
   *
   * Out while the puzzle reports no cursor, like everything else on this row. A
   * mode is not an act and there was an argument for leaving it live — it can
   * be armed before there is anywhere to paint, and it would be true by the
   * time it mattered. The argument does not survive the row it sits in: with no
   * cursor the three keys beside it are out, the arrows are the only thing that
   * works, and one lit button among four dark ones says the opposite. The bit
   * is kept rather than cleared, so a cursor that comes back finds the mode
   * where it was left.
   */
  sweeps?: boolean
  /**
   * That an *idempotent* press is not a failed press, so this key stays lit
   * through the one null that means "you already have it".
   *
   * Dimming is the house rule and it is the right one nearly everywhere: a
   * button that cannot act says so rather than swallowing the press. Pattern's
   * three are the exception, and for a reason that only shows up in how it is
   * played. A run of squares gets painted one colour in one sweep, and some of
   * them are already that colour; a button that goes out part way through the
   * sweep changes shape under a thumb that is not looking at it, which is worse
   * than the press it saves. Asking for black on a square that is already black
   * leaves it black — the postcondition holds, so the button did its job and
   * has nothing to report.
   *
   * That is the whole of the exemption, and it took a second pass to say so.
   * `does` answers null in two quite different situations and this used to
   * cover both: "the square already has it", which is the one above, and "there
   * is no cursor at all", which is the plain case the house rule exists for.
   * With no cursor there is no square, so nothing is idempotent and nothing has
   * been achieved — three buttons sat lit on an untouched board and swallowed
   * every press. The two are told apart at the call site by `silent`, and the
   * telling is exact for this puzzle: `current_key_label` opens with
   * `cur_visible` and its switch covers all three states, so empty labels mean
   * a hidden cursor and can mean nothing else (pattern.c:1272).
   *
   * Everywhere else a dead key means the reader wanted something they did not
   * get, which is why this exemption still does not generalise.
   */
  lit?: boolean
  /**
   * That this slot is only in the menu while the puzzle's second level is open.
   *
   * Several puzzles are two levels rather than one: a press picks something out
   * and leaves it pending — a region highlighted, a rectangle half-drawn — and
   * only then are "confirm" and "abandon" things that exist. The row of keys is
   * the menu of whichever level is running, and a level's menu does not list
   * what belongs to the other one.
   *
   * Rectangles is two levels and needs no marking, which is the case worth
   * understanding before adding more: its first level is Mark and Erase, its
   * second is Done and Cancel, and those are the *same two buttons* wearing
   * different faces. Nothing appears or leaves, so `faces` says all of it. Same
   * Game's levels are one item and two — pick a region, then remove or unselect
   * it — so its second key belongs to the second level alone, and at the first
   * there is no selection for "cancel" to be about.
   *
   * That is the line between this and dimming, and both are needed. Dim says
   * the action is in this menu and cannot run here — Same Game's "select" on a
   * lone square, Rectangles' tick before the drag has moved. Absent says the
   * action is not in this menu at all, because the thing it acts on does not
   * exist yet. A dim button invites the reader to work out what would light it;
   * for a cancel with nothing to cancel there is no answer to find.
   *
   * See `SECOND` for how the level is read, and `ACT` in PuzzleHost for why the
   * slots keep their places when one of them empties.
   */
  level?: 2
  /**
   * Or, for a key that changes job as the puzzle goes along: a face per word
   * its own key can report.
   *
   * `does` cannot describe these, because they are not a result to be asked
   * for — they are the same key meaning different things at different moments,
   * and the back end says which. Such a button always sends its own key, is
   * live exactly while the word it is reporting is one of these, and wears the
   * face filed under it.
   *
   * Two puzzles need it and they need it for opposite reasons. Sixteen's keys
   * are modes, and the mode is invisible — `cur_mode` lives in its `game_ui`
   * and never reaches `game_redraw` — so the button is the only place a reader
   * can see it, which is what `on` is for. Rectangles' keys are a flow: "Mark"
   * or "Erase" starts a drag, and mid-drag the same two become "Done" and
   * "Cancel". Three words each, so a pair would not hold them.
   */
  faces?: Record<string, CursorFace>
  /**
   * That this key does its work somewhere other than where the cursor is, so
   * the mirror in `CURSOR_LIFE` must not gate it.
   *
   * The mirror answers one question — is the cursor on screen — and greying a
   * button while the answer is no is right only for a button that acts *at* the
   * cursor. Flood's second key is the collection's one exception: `Advance`
   * replays the solver's next move out of `state->soln` and never reads
   * `ui->cx, ui->cy` (flood.c:855), so it is as meaningful on an untouched board
   * as on a walked one. Upstream agrees and says so — its label appears the
   * moment Solve is pressed, with no arrow in between.
   *
   * Measured before and after: press Solve on a fresh Flood board and the button
   * sat disabled, wearing the same "Play the solver's next move" face it wears
   * when live, until an arrow woke a cursor it had no use for. Which is the trap
   * a disabled button always sets — the face is the resting one either way, so
   * only `disabled` tells you, and only a test reads that.
   */
  offCursor?: boolean
}

/**
 * What a key looks like and is called while it is reporting one particular
 * word. `on` draws it as held down, for the modes that are otherwise invisible.
 */
export type CursorFace = {
  icon: IconName
  says: CursorWord
  on?: boolean
  /**
   * Shown, but out: this is the button's job and it cannot do it yet.
   *
   * The alternative is to fall back to the resting face, which is what a button
   * that is out normally wears — right when the face would otherwise be some
   * *other* job's, wrong when the button has one job throughout and is merely
   * waiting. Rectangles' finisher is the latter: a greyed tick says "this is
   * where the rectangle gets finished, once there is one", and a greyed
   * rectangle-outline would say it had gone back to being the draw key.
   */
  idle?: boolean
}

/** The words these keys can be called, so a missing translation is a type error. */
export type CursorWord =
  | 'rotateLeft'
  | 'lock'
  | 'pencil'
  | 'black'
  | 'white'
  | 'grey'
  | 'sweep'
  | 'carryTile'
  | 'holdPlace'
  | 'turnLeft'
  | 'turnRight'
  | 'slide'
  | 'pushLine'
  | 'pullLine'
  | 'jump'
  | 'unjump'
  | 'domino'
  | 'undomino'
  | 'line'
  | 'unline'
  | 'drag'
  | 'cycle'
  | 'fire'
  | 'ball'
  | 'unball'
  | 'check'
  | 'lockCell'
  | 'unlockCell'
  | 'slash'
  | 'backslash'
  | 'noLine'
  | 'light'
  | 'unlight'
  | 'cannot'
  | 'uncannot'
  | 'tent'
  | 'grass'
  | 'clearSquare'
  | 'blackSquare'
  | 'restore'
  | 'circle'
  | 'uncircle'
  | 'whiteSquare'
  | 'emptySquare'
  | 'fillSquare'
  | 'dotSquare'
  | 'plus'
  | 'minus'
  | 'blankDomino'
  | 'notBlankDomino'
  | 'track'
  | 'noTrack'
  | 'multiselect'
  | 'stopSelect'
  | 'selectSquare'
  | 'deselectSquare'
  | 'floodFill'
  | 'advance'
  | 'edge'
  | 'noEdge'
  | 'startBridge'
  | 'endBridge'
  | 'islandDone'
  | 'noBridge'
  | 'linkFrom'
  | 'linkTo'
  | 'cancelLink'
  | 'startLoop'
  | 'endLoop'
  | 'cancelLoop'
  | 'newArrow'
  | 'moveArrow'
  | 'dropArrow'
  | 'removeArrow'
  | 'cancelArrow'
  | 'drawEdge'
  | 'clearEdge'
  | 'maybeMode'
  | 'clearRegion'
  | 'place'
  | 'submit'
  | 'hold'
  | 'flip'
  | 'select'
  | 'unselect'
  | 'remove'
  | 'uncover'
  | 'chord'
  | 'flag'
  | 'unflag'
  | 'mark'
  | 'erase'
  | 'done'
  | 'cancel'

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
export type KeyLabels = {
  enter: string
  space: string
  /**
   * And, for the one puzzle whose two keys can be reporting the same word while
   * meaning different jobs, which key opened the drag that is running.
   *
   * Rectangles' keyboard drag is finished by the key that started it and
   * abandoned by the other (`erasing == ui->erasing`, rect.c:2511). Until the
   * drag has moved, neither can finish, so `current_key_label` says "Cancel"
   * twice — true of both, and silent about which is which. Two keys covering
   * four states have nothing better to say; a pair of buttons wants to know,
   * because it is what decides which of them is the finisher.
   *
   * Corrected by the labels rather than trusted: the moment the drag moves they
   * name the finisher outright, and a wrong value is replaced then. Until then
   * a wrong value costs nothing, since in that state both keys really do
   * abandon — the button left standing does what it says either way.
   */
  opened?: string
}

/**
 * The puzzles whose labels do not say whether the cursor is on screen, and the
 * keys that put it there.
 *
 * This table is the one place in the app that keeps a copy of something the
 * back end knows and will not tell us, so it is meant to stay nearly empty.
 * Everything else here is derived: `keysFor` reads the game id, `wouldSend`
 * reads the labels, `marks` replays the save file. A mirror can drift; a
 * derivation cannot. Read the note in docs/keys.md before adding a second one.
 *
 * Why there has to be one at all, and why for exactly these six. Thirty-five
 * puzzles implement `current_key_label`; twenty-eight of them open it with a
 * check on their own visibility flag, so an empty pair of labels already means
 * "no cursor" and this side has to keep nothing. Seven do not — the six here
 * and Inertia, which drops out because it has no cursor to mirror: its
 * `game_ui` holds five fields and not one of them is a coordinate.
 *
 * Net is the first of the six: it reads `tile(state, ui->cur_x, ui->cur_y)`
 * unconditionally (net.c:2124), so on a board nobody has touched it reports
 * `{Lock, Rotate}` about a tile the reader cannot see is selected — and its
 * select key rotates *and* reveals in the same press (net.c:2330), unlike
 * Pattern's, which reveals and returns. A live button that turns a tile you are
 * not looking at is the thing being fixed.
 *
 * The rules, all four of them read out of the C:
 *
 *   - It starts hidden. `new_ui` sets the flag from `PUZZLES_SHOW_CURSOR`,
 *     which no wasm build has.
 *   - A press on the board hides it (net.c:2172), before any bounds check, so
 *     a press outside the grid counts too.
 *   - A key in this list shows it — arrows through `action = MOVE_CURSOR`
 *     (net.c:2415), the rest through the select branch (net.c:2330). Modifiers
 *     suppress the arrows: Shift and Ctrl turn them into `MOVE_ORIGIN` and
 *     `MOVE_SOURCE`, which move something else and leave the flag alone.
 *   - A rebuilt `game_ui` hides it — `midend_new_game` (midend.c:659) and
 *     `midend_deserialise` (midend.c:2623). Restart does *not*: it keeps the
 *     ui and only calls `changed_state` (midend.c:939), which Net leaves empty.
 *
 * Every input reaching `interpret_move` passes through this side — PuzzleHost's
 * `onKeyDown` forwards each keystroke, `usePuzzlePointer` each board press, our
 * own buttons go through `sendKey` — so the mirror sees everything it needs to.
 *
 * And it fails safe. Believing it hidden when it is not greys a button for one
 * press, and the next arrow puts both sides back in step; believing it shown
 * when it is not is the behaviour this replaces. Neither error sticks, which is
 * what makes a mirror tolerable here and not in `marks`, where a wrong guess
 * rubs out something the reader wrote.
 */
const CURSOR_LIFE: Record<string, readonly string[]> = {
  net: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Enter', ' ', 'a', 's', 'd', 'f', 'A', 'S', 'D', 'F'],
  /*
   * And Same Game, for the same reason and with a shorter list. Its
   * `current_key_label` reads `ui->xsel, ui->ysel` without ever asking whether
   * the cursor is on screen (samegame.c:1098), so on an untouched board it
   * reports what the top-left region would do; and its select keys act at once
   * rather than merely revealing — `ui->displaysel = true` and straight on to
   * the selection (samegame.c:1291) — so a press with the cursor hidden picks a
   * region nobody pointed at. Same trade as Net's, four rules and all of them
   * self-correcting.
   *
   * Its flag is called `displaysel`, which is why the audit that swept the
   * collection for one missed it: `cur_visible`, `hshow`, `cshow`,
   * `cursor_active`, `cdisp`, `cdraw`, `displaysel` — ten spellings for one
   * boolean, and no way to find them but to read each `game_ui`.
   */
  samegame: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
  /*
   * And Flip, which needs one for a starker reason than either. Net and Same
   * Game answer about a square nobody is standing on; Flip's
   * `current_key_label` is `if (IS_CURSOR_SELECT(button)) return "Flip";` and
   * nothing else (flip.c:934) — a constant. It says the same word on a hidden
   * cursor, a shown one, a finished board. So the labels carry no news at all
   * here and the mirror is the only thing between a press and a blind flip of
   * the top-left square.
   *
   * Its flag is `cdraw`, and its rules are Same Game's four with one wrinkle:
   * only `LEFT_BUTTON` clears it (flip.c:959), because Flip reads no other
   * button. A long press therefore puts the cursor away on this side while
   * upstream keeps it — over-sleeping, which is the safe direction, and it
   * clears on the next arrow. A long press does nothing in Flip anyway.
   */
  flip: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
  /*
   * And Dominosa, whose list is the shortest here and interesting for
   * what is missing from it.
   *
   * Only the arrows wake this cursor. `move_cursor` is handed `&ui->cur_visible`
   * (dominosa.c:2831) and nothing else in that function sets it — not the select
   * keys, which place a domino or a line without showing where, and not the
   * digits, which only light numbers up. So a physical Enter on a hidden cursor
   * makes a move nobody can see; the board does not draw the cursor either, and
   * the button beside the arrows stays out, which is the two of us agreeing.
   *
   * It clears the way the others do — a press on the board — but only on the
   * path that ends in a move (2823). A right-click on a *number* toggles a
   * highlight and returns before that line, so upstream keeps the cursor and we
   * put it away. Over-sleeping, which is the safe direction and the same trade
   * Flip makes; the next arrow puts it right.
   */
  dominosa: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  /*
   * And Flood, the last of them and the only one whose label never mentions the
   * cursor at all: `current_key_label` asks whether the square under it is a
   * different colour from the corner and nothing else (flood.c:830), so with
   * the cursor away it would still offer to flood from wherever it was left.
   *
   * Only the arrows wake it — `move_cursor` has the flag (flood.c:876) and the
   * select keys do not touch it — and a press on the board puts it away.
   *
   * And it is the one puzzle here where the mirror covers one key rather than
   * both. `Advance` does its work out of `state->soln`, nowhere near `ui->cx`,
   * so gating it on the cursor left it dead from the press of Solve until an
   * arrow it had no use for. See `offCursor`.
   */
  flood: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  /*
   * And Map, which is the seventh and the first to keep the copy for its own
   * sake rather than for a button's.
   *
   * The other six mirror the flag so a key beside the arrows can stand down.
   * Map has no such keys any more; what reads this is the palette, which acts
   * where the cursor is and therefore must not act while the reader cannot see
   * where that is. On a sleeping cursor a swatch wakes it and stops, which is
   * upstream's own answer to the same press (map.c:2515) and the behaviour the
   * pick-up key had before it went.
   *
   * The four rules read the same as Net's. `move_cursor` is not handed the flag
   * here (map.c:2506), but the line after it sets the flag outright, so the
   * arrows show the cursor all the same; a press on the board hides it
   * (map.c:2552) without moving it; and a rebuilt ui hides it, which for this
   * puzzle happens on every press of a swatch — see engine/map, where that turn
   * of events is put to work.
   */
  map: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
}

/** Whether this puzzle's cursor has to be tracked on this side. */
const mirrorsCursor = (name: string) => name in CURSOR_LIFE

/**
 * And whether *this key* is one the tracking should stand in front of.
 *
 * Not the same question, which is why it is a second one. `mirrorsCursor` asks
 * whether we are keeping a copy for this puzzle; this asks whether a given
 * button is one the copy has anything to say about. Every key of the six is,
 * except Flood's `Advance` — see `offCursor`, where the exception is argued.
 */
const gated = (name: string, cursor: CursorKey) =>
  mirrorsCursor(name) && !cursor.offCursor

/**
 * Whether the arrows are currently shoving tiles rather than moving the cursor.
 *
 * Sixteen alone, and only while one of its two sticky locks is on: from then
 * until it is pressed again, every arrow plays a move and the cursor cannot be
 * repositioned at all (sixteen.c:633). Upstream draws nothing for it — a board
 * with a lock on and the same board without are byte-identical images — so the
 * buttons are the only place it can be seen, and the four arrows say it as well
 * as the key that armed it.
 *
 * Read from the labels and not remembered. "Unlock" is what a key reports while
 * its own mode is on, and `cur_mode` holds one of three values, so at most one
 * key ever says it; every other word either key can report belongs to a mode
 * that is off or to the rim, where there are no modes.
 */
export const shovesTiles = (name: string, labels: KeyLabels) =>
  name === 'sixteen' && (labels.enter === 'Unlock' || labels.space === 'Unlock')

/**
 * Which key opened the drag now running, as far as anything can say.
 *
 * Rectangles only. Three of its four drag states are legible: the two where the
 * drag has moved name the finisher outright, and the idle one says there is no
 * drag. The fourth — open but unmoved — says "Cancel" twice, so the answer for
 * that one has to come from having watched the press that opened it, which is
 * `sent` below.
 *
 * Written as a correction rather than a memory: every call is given what was
 * believed and returns what the labels now prove, so a value that came from
 * watching survives only until upstream contradicts it. Being wrong in the
 * meantime is free — in that state both keys abandon, so whichever button is
 * left standing does exactly what it says.
 */
export function opener(name: string, labels: KeyLabels, was: string | null) {
  if (name !== 'rect') return null
  if (labels.enter === 'Done') return 'Enter'
  if (labels.space === 'Done') return ' '
  // Idle, or no cursor, or a mouse drag: nothing of ours is open.
  if (labels.enter !== 'Cancel') return null
  return was
}

/** And the press that opens one, which is the only thing the labels miss. */
export const opens = (name: string, key: string, labels: KeyLabels) =>
  name === 'rect' && (key === 'Enter' || key === ' ') && labels.enter === 'Mark'

/** Whether this key, sent unmodified, would bring that puzzle's cursor up. */
export const wakesCursor = (name: string, key: string) =>
  CURSOR_LIFE[name]?.includes(key) ?? false

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
const doesNothing = (key: string, labels: KeyLabels) =>
  key === 'Enter' ? !labels.enter : !labels.enter && !labels.space

/**
 * Every word a puzzle's two keys are known to report, for the puzzles whose
 * buttons are named for a result.
 *
 * This is the whole of what keeps `does` honest, and it is worth the extra
 * table. Matching one word would tell a renamed label apart from nothing at
 * all: if upstream ever calls Pattern's states something else, "no key offers
 * Black" would read as "the square is already black" and the button would grey
 * itself out for good. Recognising the *pair* answers instead — a word outside
 * this list means we are no longer reading the labels, and `wouldSend` falls
 * back to the key the button has always sent, which is upstream's cycle and
 * still plays the game.
 *
 * Pattern's three, measured from a running board: a grey square reports
 * `{Space: "White", Enter: "Black"}`, a black one `{"Grey", "White"}`, a white
 * one `{"Black", "Grey"}` (pattern.c:1269). No pair repeats a word, so the
 * blanking above never fires here.
 */
const WORDS: Record<string, readonly string[]> = {
  pattern: ['Black', 'White', 'Grey'],
  /*
   * Sixteen's five, and there are five because its two keys hold two different
   * jobs at once. On the rim they play — "Slide" one way, "Back" the other. On
   * a tile they are sticky modifiers, and each says "Lock tile" / "Lock pos"
   * while off and "Unlock" while on. All five have a face; see CURSOR_KEYS.
   */
  sixteen: ['Slide', 'Back', 'Lock tile', 'Lock pos', 'Unlock'],
  /*
   * Rectangles' four, which are a flow rather than a set of choices: "Mark" and
   * "Erase" open a drag and "Done" and "Cancel" close one. The empty string is
   * a fifth state and needs no entry — it is what a hidden cursor reports, and
   * what upstream reports while a *mouse* drag is running, where it wants the
   * keys ignored (rect.c:2377).
   */
  rect: ['Mark', 'Erase', 'Done', 'Cancel'],
  /*
   * Mines' four. "Mark" is Rectangles' word too and means something else there,
   * which costs nothing: these tables are per puzzle and never consulted across
   * one.
   */
  mines: ['Uncover', 'Clear', 'Mark', 'Unmark'],
  samegame: ['Select', 'Remove', 'Unselect'],
  /*
   * Pegs' two, and the shortest list here. "Select" is offered on a peg,
   * "Cancel" once one is armed, and the third state — a hole, or a hidden
   * cursor — is the empty string, which needs no entry (pegs.c:836).
   */
  pegs: ['Select', 'Cancel'],
  /*
   * Dominosa's three, and it is the first puzzle here whose two keys share one.
   * "Remove" is Enter's word for a domino that is down and Space's for a line
   * that is drawn, and the two can never be offered together — a line may not
   * be marked beside a domino (dominosa.c:2762), which is also what makes the
   * blanking unreadable here. See `BOTH`.
   */
  dominosa: ['Place', 'Remove', 'Line'],
  /*
   * Black Box's six, the longest list here and the only one where a single key
   * carries four. Enter's word comes from which of three regions the cursor is
   * standing in — the check button in the corner, the arena, the ring of laser
   * squares — and Space's from whether what is under it is already locked.
   *
   * Disjoint between the keys, so there is nothing here for `BOTH`: an empty
   * Space beside a named Enter is an empty Space.
   */
  blackbox: ['Fire', 'Ball', 'Clear', 'Check', 'Lock', 'Unlock'],

  /*
   * And the nine that put one of three or four things in a square. Every one of
   * these labels names *what the press will produce*, not what is there now, so
   * the face on the button is a picture of the result — which is the whole
   * reason these were cheap to do once the machinery existed.
   */
  lightup: ['Light', 'Mark', 'Clear'],
  singles: ['Black', 'Circle', 'Restore', 'Remove'],
  unruly: ['Black', 'White', 'Empty'],
  mosaic: ['Black', 'White', 'Empty'],
  range: ['Fill', 'Dot', 'Empty'],
  /* Magnets' six. The two markers are upstream's own characters — a blank
     domino and a pair of question marks — and it names them by what it draws. */
  magnets: ['+', '-', 'X', '?', 'Clear'],
  tracks: ['Track', 'X', 'Clear'],
  filling: ['Multiselect', 'Stop', 'Select', 'Deselect'],
  /* Flood's two do not share a state at all: one is a move on the board and
     the other replays the solver, which only exists after Solve. */
  flood: ['Fill', 'Advance'],
  /* And Inertia's one, which is the same replay and the whole of its
     vocabulary: every other key it reads is a direction, and a direction is
     never labelled. */
  inertia: ['Advance'],
  /* Bridges' two. "Finished" comes from both keys and means two things — end
     the bridge you are drawing, or say you have done with this island — which
     `faces` keeps apart because each key reads only its own word. */
  bridges: ['Select', 'Finished'],
  signpost: ['From here', 'To here', 'Cancel'],
  pearl: ['Start', 'Stop', 'Cancel'],
  /* Galaxies' seven, the longest label vocabulary in the collection. Its
     `current_key_label` never looks at which key it was asked about, so both
     report the same word and there is one button. */
  galaxies: ['New arrow', 'Move arrow', 'Place', 'Remove', 'Cancel', 'Edge', 'Clear'],
}

/**
 * Both of a puzzle's keys reporting nothing at all.
 *
 * What that means is the puzzle's own business — most of them go quiet when the
 * cursor is hidden, some also on a square their keys cannot touch, and the
 * seven in `CURSOR_LIFE` never go quiet at all. So this says only what it sees,
 * and the caller says what it means for the puzzle it is asking about.
 *
 * Pattern is the one caller, where it is exactly "no cursor": its
 * `current_key_label` opens with `cur_visible` and its switch covers every
 * state a square can be in, so there is no other way for both to be empty.
 */
export const silent = (labels: KeyLabels) => !labels.enter && !labels.space

/** Whether we are still reading a puzzle's labels rather than guessing at them. */
const understood = (name: string, labels: KeyLabels) => {
  const words = WORDS[name]
  return !!words && [labels.enter, labels.space].every((w) => !w || words.includes(w))
}

/**
 * The words that say a puzzle's second level is open — that something has been
 * picked out and is waiting to be dealt with.
 *
 * Declared rather than inferred, and that is the point of the table. The same
 * effect falls out of `does` for free — a key asking for "Unselect" has nobody
 * to send to while nothing is selected — but a rule that lives inside another
 * mechanism is a rule the next puzzle cannot find. This says which words mean
 * "pending" in so many terms, so a second-level key needs no `does` to be
 * placed correctly, and reading the table answers what the levels are.
 *
 * Two entries, and they are two different shapes of level, which is worth
 * seeing before adding a third. Same Game's is a selection: the menu is about
 * the thing under the cursor, and confirm and cancel exist only while there is
 * one. Inertia's is a mode: before Solve the reader is playing and after it
 * they are walking a route, and the key belongs to the second of those.
 *
 * Seven more puzzles have a second level by their vocabulary
 * — Pegs, Bridges, Signpost, Pearl, Galaxies, Filling, and Rectangles, which is
 * the one that needs no entry because both its levels are the same two buttons.
 * Each will get its own line as its keys are looked at again; guessing them all
 * now would be filing seven claims about puzzles nobody has measured.
 *
 * Map was on that list and came off it a different way: its second level was a
 * colour in hand, and the palette in `keysFor` means there is never one — see
 * CURSOR_KEYS, where its two keys used to be.
 */
const SECOND: Record<string, readonly string[]> = {
  /*
   * "Remove", and only that word, because it is the one that means the cursor
   * is standing on the thing (samegame.c:1104). Its branch is inside
   * `if (ISSEL(ui->xsel, ui->ysel))` and no other branch can produce it, so the
   * word and the position are the same fact read two ways.
   *
   * "Unselect" was in this list for a day and it is what made the whole thing
   * need a stored bit. That word comes from two places — `Space` on the region,
   * and *either* key on a lone square while something is held — so counting it
   * dragged "the reader has walked away from the selection" into the second
   * level, where the labels then could not say when they had walked back out.
   *
   * The mistake underneath was reading the second level as "something is
   * pending", which is a fact about the whole board and one the labels really
   * cannot report. A menu is about where the cursor is standing: its two items
   * are confirm *this* and cancel *this*, so the thing has to be under the
   * cursor for either to mean anything. Read that way the level is a function
   * of position, and position is exactly what `current_key_label` describes.
   */
  samegame: ['Remove'],
  /*
   * Inertia's, and the level here is not a selection but a mode: before Solve
   * the reader is playing, after it they are walking a route the solver worked
   * out. The key belongs to the second of those and to nothing else.
   *
   * "Advance" is the only word this puzzle ever reports (inertia.c:1544), and
   * it reports it exactly while `state->soln` holds a route with steps left.
   * That route does not exist until Solve installs one and is thrown away the
   * moment the game ends, either way (inertia.c:1735) — so the word and "there
   * is an answer to walk" are the same fact.
   *
   * Dimming was wrong here for the reason `level` is set out with: a key that
   * cannot act because the thing it acts on does not exist yet is not in this
   * menu. It sat grey through every game nobody asked for the answer to, and
   * the only way to light it was to press Solve, which is not a thing to invite
   * a reader towards.
   */
  inertia: ['Advance'],
  /*
   * And Flood's, which is Inertia's word doing Inertia's job in a puzzle that
   * also has a real move. Its two keys never share a word — Enter reports
   * "Fill" off the square under the cursor, Space reports "Advance" off
   * `state->soln` (flood.c:807) — so the level is read off Space alone and the
   * flooding key beside it is untouched.
   */
  flood: ['Advance'],
}

/**
 * Whether this slot is in the menu the reader is looking at.
 *
 * Everything without a level is always in it. A second-level slot is in it while
 * one of its puzzle's words is being reported — and also whenever we have
 * stopped understanding the labels, which is the same bargain as everywhere else
 * here: an upstream rename should cost a button that is offered when it cannot
 * act, not one that has vanished with no way to ask for it back.
 *
 * The sleeping cursor comes first and is the one case where the labels are read
 * and then set aside. A second level is "the reader is standing on the thing",
 * and with no cursor on the board nobody is standing anywhere — the words are
 * still describing the square the cursor was last at, which is exactly why
 * `faceOf` stops believing them here too. Believing them in one place and not
 * the other is what let Same Game's cancel appear, dimmed, after a press on the
 * board: the tap had selected a region the hidden cursor happened to be inside,
 * so "Remove" was on the wire with nothing on screen to justify it.
 */
export const inMenu = (
  name: string,
  cursor: CursorKey,
  labels: KeyLabels,
  awake: boolean,
) => {
  if (!cursor.level) return true
  if (gated(name, cursor) && !awake) return false
  if (!understood(name, labels)) return true
  const second = SECOND[name]
  return !!second && [labels.enter, labels.space].some((w) => !!w && second.includes(w))
}

/**
 * The puzzles that read the cursor keys and never say a word about them.
 *
 * `current_key_label` is optional and five back ends leave it NULL. Three of
 * those do not read the keys at all; these two read them and report nothing, so
 * `midend_current_key_label` hands back "" for both, forever. Read literally
 * that is "neither key does anything", and both buttons would sit out the whole
 * game.
 *
 * So they are exempted rather than fixed. Their buttons are always live, which
 * is very nearly true of them: every press Untangle's Enter can make does
 * something — pick a point up, put it down, or show the highlight for the first
 * time — and its Space does nothing only while a point is in the air. A dead
 * press there is the price of not keeping a copy of a state upstream will not
 * report, and it costs nothing that is not immediately visible: the board draws
 * the point being carried.
 *
 * Nothing else changes for them. `faceOf` already falls back to a key's own
 * picture when there are no words to read, which is the right face when there
 * never will be any.
 */
const SILENT = new Set(['untangle', 'palisade'])

/** Palisade's cursor walks a half-grid; only the borders are worth a press. */

/**
 * Which key a cursor button should send, or null when it should stand down.
 *
 * Three kinds of button come through here. Most send the key they were built
 * with, and go quiet when its label is empty — Net's rotate, the five pencil
 * keys. A `does` button is named for a result instead, and asks the back end
 * which key currently reaches it; nobody offering it is what "you already have
 * it" looks like from out here, since a puzzle does not label a press that
 * would change nothing. A `faces` button always sends its own key, and is out
 * whenever the word it is reporting is not one it has a face for.
 *
 * `awake` is only consulted for the puzzles in `CURSOR_LIFE`, and only because
 * their labels answer as confidently with the cursor hidden as with it showing.
 * Everywhere else the pair already carries it and this argument is ignored — as
 * it is for a key that does not act at the cursor at all; see `offCursor`.
 */
/**
 * Whether the square under the cursor already holds this switch's value.
 *
 * Read off the same words the press is: a puzzle does not offer a word for a
 * press that would leave the square as it is, so "nobody is offering what this
 * key places" and "the square already has it" are one fact. No copy, and
 * nothing to drift.
 *
 * False for a key that is not a switch, and false with the words unreadable —
 * where the button falls back to sending its own key and wearing its own face,
 * as everything else here does when the labels stop making sense.
 */
export const holding = (cursor: CursorKey, labels: KeyLabels) =>
  !!cursor.instead &&
  !!cursor.does &&
  labels.enter !== cursor.does &&
  labels.space !== cursor.does &&
  (labels.enter === cursor.instead || labels.space === cursor.instead)

export const wouldSend = (
  name: string,
  cursor: CursorKey,
  labels: KeyLabels,
  awake: boolean,
): string | null => {
  if (gated(name, cursor) && !awake) return null
  if (SILENT.has(name)) return cursor.key
  if (understood(name, labels)) {
    if (cursor.does) {
      const asks = holding(cursor, labels) ? cursor.instead : cursor.does
      if (labels.enter === asks) return 'Enter'
      if (labels.space === asks) return ' '
      return null
    }
    if (cursor.faces) {
      const face = cursor.faces[mine(name, cursor, labels)]
      // `idle` is a face worn while the button waits, so it shows and is out.
      return face && !face.idle ? cursor.key : null
    }
  }
  return doesNothing(cursor.key, labels) ? null : cursor.key
}

/**
 * The words a puzzle's two keys can be reporting *at the same moment*, for the
 * puzzles where there are any. This is the whole of what the blanking can ever
 * have eaten, and the only reason to undo it.
 *
 * Rectangles is the one entry. A drag that has been opened and not moved has
 * both keys saying "Cancel" (rect.c:2374), so it arrives as {"", "Cancel"} —
 * and read literally the Space button would go out still wearing the face it
 * had before the drag started, telling the reader it would erase something when
 * a press would abandon the drag.
 *
 * Everywhere else an empty Space means an empty Space, and reading it as
 * Enter's word is wrong rather than merely cautious. Dominosa is where that
 * showed: a square covered by a domino reports {"", "Remove"} — Enter takes the
 * domino off and Space genuinely cannot act, since a line may not be drawn
 * beside a domino — and both keys *have* a "Remove" face, so the fallback lit
 * the second button up and offered to remove a line that was not there. Four of
 * the five puzzles with `faces` were only safe from this by accident: their two
 * keys share no word at all, so an inherited one never matched a face.
 *
 * Checked one function at a time rather than assumed. Sixteen looks like a
 * second entry and is not: its `cur_mode` is one enum with three values
 * (sixteen.c:569), so "Unlock" is on offer from one key or the other but never
 * both.
 */
const BOTH: Record<string, readonly string[]> = {
  rect: ['Cancel'],
  /* Same shape twice over — a black square restores and a circled one is
     rubbed out, whichever key is asked (singles.c:1141). */
  singles: ['Restore', 'Remove'],
  /* While a bridge is being drawn both keys answer "Finished": Enter lands it,
     Space drops it. Without this line the second button would go dark in the
     middle of the one flow it is there to get out of. */
  bridges: ['Finished'],
  /* Both of Signpost's keys cancel the same half-built link. */
  signpost: ['Cancel'],
}

/** What the back end says about this button's own key, with the blanking undone. */
const mine = (name: string, cursor: CursorKey, labels: KeyLabels) => {
  const word =
    cursor.key === 'Enter'
      ? labels.enter
      : labels.space || (BOTH[name]?.includes(labels.enter) ? labels.enter : '')
  // And one puzzle needs a word the back end has not got round to saying yet.
  // While Rectangles' drag has not moved both keys report "Cancel", which is
  // true of both and tells the pair nothing about which of them finishes. The
  // key that opened it does — so it wears the finisher's face, waiting, and its
  // neighbour keeps the abandon. See `opened` and `WAITING`.
  if (WAITING[name] === word && labels.space === '' && labels.opened)
    return cursor.key === labels.opened ? PENDING : word
  return word
}

/**
 * The word that means "either of us, and neither can finish", per puzzle, and
 * the word this side substitutes for the one that will be the finisher.
 *
 * Only Rectangles, and only in the moment between opening a drag and moving it.
 * `PENDING` is ours and never comes from upstream, so it can never collide with
 * a label — the check above requires the blanking as well, which is upstream
 * saying the two keys are equal.
 */
const WAITING: Record<string, string> = { rect: 'Cancel' }
const PENDING = '\0waiting'

/**
 * The face a key should be wearing: its picture, its word, and whether to draw
 * it held down.
 *
 * The entry in `faces` for whatever the back end is reporting right now, and
 * the key's own picture when it has no `faces` or we have stopped recognising
 * the words. That fallback is the same bargain as everywhere else here — an
 * upstream rename costs a button that shows its resting face and still works,
 * rather than a button that vanishes.
 */
export const faceOf = (
  name: string,
  cursor: CursorKey,
  labels: KeyLabels,
  awake: boolean,
): CursorFace => {
  // A puzzle whose labels answer without being asked where the cursor is says
  // something true about a square nobody is standing on. While the mirror says
  // the cursor is away, that is not a face to wear — the button is out anyway,
  // and its own picture is the honest thing to be out *as*. See CURSOR_LIFE.
  const word = mine(name, cursor, labels)
  const known = understood(name, labels) && (awake || !gated(name, cursor))
  const face = known ? cursor.faces?.[word] : undefined
  return face ?? { icon: cursor.icon, says: cursor.says }
}

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

const CURSOR_KEYS: Record<string, CursorKey[]> = {
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
   * The half of Sixteen a finger has never been able to reach.
   *
   * Tapping an arrow in the rim slides that row or column, and that is a whole
   * game — Sixteen has always been playable on a phone. But its chapter
   * describes a second way to play beside it: "move the cursor onto a tile,
   * hold Control and press an arrow key to move the tile under the cursor and
   * move the cursor along with the tile. Or, hold Shift to move only the tile."
   * A touch screen has no Control and no Shift, so that paragraph has been
   * describing something nobody here could do.
   *
   * The same paragraph gives the way in: "pressing Enter simulates holding down
   * Control (press Enter again to release), while pressing Space simulates
   * holding down Shift". Sticky modifiers, and a sticky modifier is a button.
   *
   * They are the first keys here that are a mode rather than a move, and they
   * show a pressed state for it, because `cur_mode` lives in Sixteen's
   * `game_ui` and is never drawn. Measured: a board with a mode on and the same
   * board with it off are byte-identical images. So the key is the only place a
   * reader can find out that their arrows have stopped moving the cursor and
   * started shoving tiles — hence the `on` face.
   *
   * And there is a third face each, because upstream's cursor also walks out
   * into the rim of arrows, where the same two keys slide a row — one way and
   * the other. Two faces used to be the whole of it, and the cursor was kept
   * off the rim by undoing any arrow that landed there. That was the wrong
   * trade, and looking at the board says why: on the rim the cursor lights up
   * one of the fat arrows upstream has drawn all round the edge, and pressing a
   * key then does what that arrow says — nothing to learn. On a tile it shades
   * a number, which announces nothing at all, and the mode it arms is invisible.
   * The design that had to be explained was the one being kept.
   *
   * So all four positions are upstream's now, and the faces follow the labels
   * rather than the reader being steered away from half of them.
   *
   * The rim pair claims only what this side knows, and after four rounds that
   * turned out to be less than "a pair of inverses": one dot and two dots, which
   * say which of the two keys this is and stop. Which way either goes stays the
   * board's to show, by the arrow it has lit under the cursor, and the verbs are
   * in the words — "push this line along the arrow" and "pull this line back".
   * See `primary` in ../Icon for the three versions that claimed more, and for
   * the survey that killed the fourth by finding it already taken.
   */
  sixteen: [
    {
      key: 'Enter',
      icon: 'lockTile',
      says: 'carryTile',
      faces: {
        'Lock tile': { icon: 'lockTile', says: 'carryTile' },
        Unlock: { icon: 'lockTileOn', says: 'carryTile', on: true },
        Slide: { icon: 'primary', says: 'pushLine' },
      },
    },
    {
      key: ' ',
      icon: 'lockPlace',
      says: 'holdPlace',
      faces: {
        'Lock pos': { icon: 'lockPlace', says: 'holdPlace' },
        Unlock: { icon: 'lockPlaceOn', says: 'holdPlace', on: true },
        Back: { icon: 'secondary', says: 'pullLine' },
      },
    },
  ],

  /*
   * The pair that makes Twiddle's outline square worth moving.
   *
   * Nothing new is reachable here and that is the point: a tap already turns a
   * block anticlockwise and a long press turns it clockwise, so by the rule this
   * file usually applies — a key earns a button when no gesture does its job —
   * neither of these would qualify. They are in the other category. Twiddle's
   * arrows walk an outline square around the grid, and without something to
   * press when it arrives that square is a marker with no use; a puzzle that
   * offers the arrows and not these offers a decoration.
   *
   * The simplest entry in this table, because Twiddle asks for nothing special.
   * Its `current_key_label` opens with `if (!ui->cur_visible) return ""`
   * (twiddle.c:633), so both keys go out on their own until the cursor is up.
   * `move_cursor` walks a grid of block corners, `w-n+1` by `h-n+1`
   * (twiddle.c:661), so there is nowhere off the board to fall. And the first
   * select press only reveals — it returns before computing a move
   * (twiddle.c:678) — so nothing turns under a cursor the reader cannot see.
   *
   * Left turns left. `CURSOR_SELECT` is `dir = +1`, the same as the left mouse
   * button, which its chapter calls anticlockwise; `CURSOR_SELECT2` is `-1`.
   * So the two land either side of the up arrow in the order they read.
   */
  twiddle: [
    { key: 'Enter', icon: 'turnLeft', says: 'turnLeft' },
    { key: ' ', icon: 'turnRight', says: 'turnRight' },
  ],

  /*
   * Rectangles, where the two keys are a flow rather than two actions.
   *
   * Its chapter: "use the cursor keys to move the position indicator around the
   * board. Pressing the return key then allows you to use the cursor keys to
   * drag a rectangle out from that position, and pressing the return key again
   * completes the rectangle. Using the space bar instead of the return key
   * allows you to erase the contents of a rectangle without affecting its
   * edges. Pressing escape cancels a drag." So each key opens a drag, and while
   * one is open both keys mean something else — which is why these have `faces`
   * and not a picture apiece.
   *
   * The whole of that state machine comes back in the labels (rect.c:2374), and
   * it is worth writing out because the button is only ever repeating it:
   *
   *   idle                 {Mark, Erase}    either key opens a drag
   *   opened, not moved    {Cancel, Cancel} nothing to finish yet
   *   marking, moved       {Done, Cancel}   Enter finishes, Space abandons
   *   erasing, moved       {Cancel, Done}   and the other way round
   *   a mouse drag is on   {"", ""}         upstream ignores the keys entirely
   *
   * "Cancel" is not decoration in that second row: a drag that has not moved
   * builds no rectangle, because the cursor path rounds to the middle of a
   * square and only an edge midpoint makes a move (rect.c:2523). Pressing the
   * key that does not match the drag's mode abandons it too — `erasing ==
   * ui->erasing` guards the only branch that produces one (rect.c:2509). Both
   * are exactly what upstream's own word says, which is the argument for
   * repeating the word rather than inventing a fixed pair.
   *
   * Nothing else is needed. `current_key_label` opens on `ui->cur_visible`, so
   * both keys go out until the cursor is up; `move_cursor` walks the plain w×h
   * grid, so there is nowhere off the board; and the first select press only
   * reveals (rect.c:2432). Escape and backspace also cancel, and neither has a
   * button — the Cancel face is the way out, and it is the same key the reader
   * already has a finger on.
   */
  rect: [
    {
      key: 'Enter',
      icon: 'mark',
      says: 'mark',
      faces: {
        Mark: { icon: 'mark', says: 'mark' },
        Done: { icon: 'done', says: 'done' },
        Cancel: { icon: 'cancel', says: 'cancel' },
        [PENDING]: { icon: 'done', says: 'done', idle: true },
      },
    },
    {
      key: ' ',
      icon: 'erase',
      says: 'erase',
      faces: {
        Erase: { icon: 'erase', says: 'erase' },
        Done: { icon: 'done', says: 'done' },
        Cancel: { icon: 'cancel', says: 'cancel' },
        [PENDING]: { icon: 'done', says: 'done', idle: true },
      },
    },
  ],

  /*
   * Netslide, which needs one key and gets one.
   *
   * It is Sixteen's rim with none of Sixteen's modes: its whole `game_ui` is
   * `cur_x, cur_y, cur_visible` (netslide.c:965), and the cursor lives only on
   * the ring of arrows, walked by the shared `c2pos`/`pos2c` pair that exists
   * for these two puzzles. There is no interior to stand on, so nothing here
   * needs keeping off it.
   *
   * One key because upstream gives one job: `current_key_label` answers
   * `IS_CURSOR_SELECT` with "Slide" and nothing else (netslide.c:1047), and
   * `interpret_move` takes both keys down the same branch. Space is Enter's
   * synonym, and a second button would be the same button twice. The reverse
   * direction is the right mouse button's alone — `if (button == RIGHT_BUTTON)`
   * is what flips it, and no key reaches that — so it stays a long press on the
   * board's own arrow, where it already was. Nothing is owed to HOLD_BUTTON for
   * that: a hold is the right button by default, and the table is the list of
   * puzzles that spend theirs elsewhere.
   *
   * It wears `primary` — Sixteen's first key — rather than a glyph of its own,
   * and that is the point rather than a saving: the two perform the same act on
   * the same rim under the same ignorance of which edge the cursor is on, so
   * drawing them differently would claim a difference. The direction it used to
   * show was right one time in four: `interpret_move` takes it from the edge
   * alone (netslide.c:1097), and `encode_ui` is NULL (netslide.c:1867), so the
   * cursor is not in the save either and nothing here can derive it.
   */
  netslide: [{ key: 'Enter', icon: 'primary', says: 'slide' }],

  /*
   * Three keys for three colours, which is what the board has and what the
   * mouse has: left black, right white, middle grey (pattern.c:1330).
   *
   * Upstream's keyboard has two, and they are one cycle wound opposite ways —
   * `Enter` steps grey→black→white→grey and `Space` steps it back, "the space
   * bar does the same cycle in reverse", as its chapter puts it. Neither key
   * *sets* a colour. `does` is what turns that into three that do: a button
   * asking for "Black" reads `current_key_label` (pattern.c:1269) for whichever
   * key reaches black from this square and sends that one — `Enter` from grey,
   * `Space` from white, neither from a square already black, where it goes out.
   *
   * The two shapes this went through are both worth keeping, because each was
   * wrong in a way the other was not.
   *
   * Two fixed colours, black and white, was the first. Each button meant one
   * thing all game, which is the property being bought here, and it cost the
   * third state outright: neither button ever asked for "Grey", so a square
   * could be painted and never unpainted. Measured through the buttons, the
   * moves that came out were `F` and `E` for ever and no `U`, and a finger has
   * none of the other ways in — the middle button, `Ctrl+Shift` with an arrow
   * (pattern.c:1408), or a cycle key pressed from the right square. A hold on
   * the board is the right button here, which is white. Undo was the only way
   * back, and undo takes back whatever came with it.
   *
   * Upstream's own two keys, cycling, was the second. That reaches everything
   * in one press and is exactly what the back end does, but the face turns over
   * with every press, so "the black button" stops being a place and starts
   * being something to read. Pattern is played by painting long runs, and a
   * button that moves under a repeated press is the wrong kind of true.
   *
   * Three fixed keys is both properties at once, and the only thing it spends
   * is a row: the block goes from two keys tall to three, which comes out of
   * the board. See `[data-keys='3']` in index.css.
   *
   * A near miss worth recording, since it looks like the obvious middle way:
   * keeping "Black" fixed on the left and letting only the right key cycle
   * *duplicates* the pair on a white square. `Enter` reports "Grey" and `Space`
   * "Black" there, so `does: 'Black'` resolves to `Space` — both buttons then
   * send the same key, produce the same colour and wear the same face.
   *
   * The fallback `key` on each is the one that reaches its colour from an
   * untouched square, which is where nearly every press happens. It is only
   * ever used if upstream renames these labels, and then the three become two
   * useful buttons and one dead one rather than three dead ones.
   */
  /*
   * And a fourth, which is not a colour and not a press: the stroke mode.
   *
   * Three buttons that each paint one square is the whole of what a thumb could
   * do here, and it is not how this puzzle is played. A clue of 4 is four
   * squares in a row; the keyboard does it by holding Ctrl and walking, because
   * `IS_CURSOR_MOVE` with a modifier moves the cursor and then paints the
   * rectangle spanning where it was and where it is (pattern.c:1399) — one
   * press, two squares, so a walk lays a continuous run. A finger has no way to
   * hold Ctrl, so it painted runs one square and one aimed press at a time,
   * which is four presses per four squares against the keyboard's four.
   *
   * The saving is better than half and it is arithmetic rather than a guess. A
   * run of n from where the cursor stands costs n colour presses and n-1 arrows
   * without the mode, and n-1 arrows with it: nine presses against four for a
   * run of five, and the mode is turned on once rather than once per run.
   * Measured through the buttons — four presses of Right with black chosen, and
   * the save came back with five squares filled.
   *
   * The other half of what it buys does not show in that count: the presses
   * become *the same press repeated*. Without the mode a run alternates arrow,
   * colour, arrow, colour, and the reader has to keep track of which square the
   * cursor is on between each pair.
   *
   * It is a mode and modes are a cost, so it is paid for as visibly as it can
   * be: the button holds down while it is on, and so does the colour it is
   * painting with, which is the same colour button that was already there. Two
   * lit buttons say "the arrows are painting, and they are painting black"
   * without a word.
   *
   * The colour keys keep everything they had — same key, same `does`, same
   * `lit`, same single square per press when the mode is off. `brush` is the
   * only thing added to them, and it is dead weight until the mode is on.
   */
  pattern: [
    { key: 'Enter', icon: 'black', says: 'black', does: 'Black', lit: true, brush: { ctrl: true } },
    { key: ' ', icon: 'white', says: 'white', does: 'White', lit: true, brush: { shift: true } },
    {
      key: 'Enter',
      icon: 'grey',
      says: 'grey',
      does: 'Grey',
      lit: true,
      brush: { shift: true, ctrl: true },
    },
    { key: '', icon: 'sweep', says: 'sweep', sweeps: true },
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
  /*
   * Mines, where the two keys are worth more for what they refuse than for what
   * they do.
   *
   * Nothing here is out of reach without them. A tap uncovers a covered square,
   * and a tap on an uncovered one clears around it — `ui->hradius` is 1 exactly
   * when the square is already open, and `LEFT_BUTTON` copies it into
   * `validradius` (mines.c:2616), which is the whole of what makes a click a
   * chord. A long press flags. The middle button adds no move at all; it only
   * refuses to uncover, which is a safety variant of the left button and not a
   * capability. So docs/keys.md was wrong to file the chord as unreachable, and
   * these are cursor companions like Twiddle's.
   *
   * What they add is upstream's own arithmetic, shown as a live button.
   * `current_key_label` (mines.c:2516) counts the flags around the cursor and
   * answers "Clear" only when the count matches the number, so Enter lights up
   * exactly when a chord is available and goes out when it is not. It also goes
   * out on a flagged square, which is upstream's safety rule made visible — you
   * must take the flag off before you can open it — and both go out once the
   * board is dead or won, until an undo brings them back.
   *
   * Lit is not the same as safe, and this is the one place in the collection
   * where that distinction has teeth. The flags are the reader's own; if they
   * are on the wrong squares the chord still lights, and pressing it opens
   * precisely the mined ones among the squares it would have cleared
   * (mines.c:2723). That is the move's own risk and the same one a tap on the
   * number already carries — nothing here makes it worse — but a button is more
   * of an endorsement than a tap, so it is worth having said.
   */
  mines: [
    {
      key: 'Enter',
      icon: 'uncover',
      says: 'uncover',
      faces: {
        Uncover: { icon: 'uncover', says: 'uncover' },
        Clear: { icon: 'chord', says: 'chord' },
      },
    },
    {
      key: ' ',
      icon: 'flag',
      says: 'flag',
      faces: {
        Mark: { icon: 'flag', says: 'flag' },
        Unmark: { icon: 'flag', says: 'unflag' },
      },
    },
  ],

  /*
   * Same Game, whose two keys are a flow with a third state in the middle.
   *
   * Its chapter: "if you left-click an unselected region, it becomes selected";
   * "if you left-click the selected region, it will be removed"; "if you
   * right-click the selected region, it will be unselected". The cursor keys
   * reach all three, and `current_key_label` (samegame.c:1098) names whichever
   * applies where the cursor stands:
   *
   *   an unselected region      {Select, Select}      either key picks it
   *   the selected region       {Remove, Unselect}    Enter does it, Space drops it
   *   a lone square, selection  {Unselect, Unselect}  no region to pick, so it drops
   *   a lone square, nothing    {"", ""}              and then there is nothing to do
   *   an already-cleared square {"", ""}
   *
   * Both keys report "Select" on the first row, so the fold blanks Space and
   * both buttons end up showing the same face — which is the truth, since both
   * keys do select. Rectangles' pair does the same with "Cancel".
   *
   * One place the manual is looser than the code, and the labels are right: it
   * says "pressing Space or Enter again removes it", but `interpret_move` sends
   * `CURSOR_SELECT2` to `sel_clear` and only Enter to `sel_movedesc`
   * (samegame.c:1302-1306). Space unselects; it does not remove.
   *
   * And it gets one key, not two, which took a second look to see. Space is
   * Enter's synonym in three of those four rows — the fold is what says so, and
   * says it for free: `lsk` arrives blank exactly when the two words agree. The
   * one row where it differs offers "Unselect", and that is the second button.
   *
   * It had none for a while, and the argument for that is worth keeping because
   * it was the wrong argument rather than a wrong fact. Every fact in it holds:
   * unselecting changes no game — moving onto another region and pressing once
   * switches the selection, since that branch clears before it expands
   * (samegame.c:1307, whose own comment reads "might be no-op"), and measured, a
   * two-square selection became a four-square one in a single press with no move
   * committed. Its only effect is to put the highlight out and take the status
   * line back from "Selected: 4 (4)" to "Score: 0". A hold on the board reaches
   * it too, since a hold is the right button and upstream's line reads
   * `RIGHT_BUTTON || CURSOR_SELECT2`; measured, that clears the selection and
   * commits nothing.
   *
   * What was wrong was the test. "A finger can reach it another way" is not the
   * rule this keypad is built on — Mines' flag is on `Space` and on the right
   * button both, and has a button anyway, as does every other key in that
   * position. The rule is whether upstream's *keyboard* does it, which is what
   * decided Netslide the other way: its reverse slide is the right mouse button
   * alone, so no button is owed. Same Game's unselect is `CURSOR_SELECT2`, so
   * one is.
   *
   * `does` is what keeps it from being Enter again three rows out of four. The
   * button asks for "Unselect" and is live exactly where that word is on offer:
   * on a selected region, where `Space` has it and `Enter` says "Remove"; and on
   * a lone square with something selected, where both keys have it and the fold
   * hands us {"", "Unselect"}, so it sends `Enter`. On a region waiting to be
   * picked both keys say "Select", nobody offers "Unselect", and it goes out.
   *
   * That second case also closes a gap this side had opened by itself. On a lone
   * square upstream's own `Enter` clears the selection, and our one button greyed
   * out there — less than the key it stands for. Walked over a board with a
   * region selected, 47 of 144 stops were that square.
   *
   * The first button still has no "Unselect" face, and now for a reason rather
   * than for want of somewhere to put it: it is one job in two steps — pick a
   * region, then press again to take it — and a key that changed jobs under the
   * reader's finger is worse than one that waits. Sixteen's pair make the same
   * call on the rim. So on a square where nothing can be picked it greys out
   * still wearing its own face, which falls out of `faces` without a special
   * case, while the button beside it lights up with the thing that *can* be
   * done.
   */
  samegame: [
    {
      key: 'Enter',
      icon: 'select',
      says: 'select',
      faces: {
        Select: { icon: 'select', says: 'select' },
        Remove: { icon: 'done', says: 'remove', on: true },
      },
    },
    { key: ' ', icon: 'cancel', says: 'unselect', does: 'Unselect', level: 2 },
  ],

  /*
   * Flip, one key, and the plainest entry in this table.
   *
   * Its chapter: "left-click in a square to flip it and its associated squares,
   * or use the cursor keys to choose a square and the space bar or Enter key to
   * flip". Both keys, one job — `IS_CURSOR_SELECT` covers them and
   * `interpret_move` sends them down the same branch (flip.c:955) — so a second
   * button would be the first one again.
   *
   * And no `faces`, because there is nothing for them to follow: the label is a
   * constant. Whatever the board is doing, `current_key_label` answers "Flip".
   * That is also why this is the only puzzle so far whose button is live from
   * the moment the cursor is up and never goes out again: nothing upstream ever
   * says it would do nothing, and the mirror is all that gates it.
   */
  flip: [{ key: 'Enter', icon: 'flip', says: 'flip' }],

  /*
   * Guess has none, and no arrows either — its whole keyboard is the keypad
   * above. See `PAD_ONLY`, and `keysFor`, where the two keys that used to be
   * here now live as the tick and the padlock.
   */

  /*
   * Pegs, where the button arms the arrows rather than moving anything itself.
   *
   * Its chapter: "Pressing the return key while over a peg, followed by a
   * cursor key, will jump the peg in that direction (if that is a legal move)."
   * So the press sets `cur_jumping` (pegs.c:993) and the *next* arrow is the
   * move — pegs.c:960 takes the arrow branch apart and sends a jump instead of
   * walking the cursor. Without this button the arrows in this puzzle can only
   * ever move a marker about, which is the second criterion exactly.
   *
   * One button. `current_key_label` answers `IS_CURSOR_SELECT`, so Enter and
   * Space always report the same word, the blanking empties the left one, and a
   * second button would be the first one again.
   *
   * And no mirror: this is one of the twenty-two that check the flag —
   * `if (!ui->cur_visible) return ""` is the first line of it (pegs.c:838) — so
   * a hidden cursor greys the button out with nothing kept on this side. The
   * same line greys it on a hole, where upstream answers MOVE_NO_EFFECT.
   *
   * Two words and two pictures, which is a reversal: this key wore one picture
   * under both words for a while, and the argument for that is worth keeping
   * beside the reason it lost.
   *
   * The facts have not changed. Pegs *draws* the mode — pointed at, a peg is a
   * solid disc in the cursor colour; armed, it is a ring of that colour around
   * its own (pegs.c:1150-1155), measured at 3249 cursor-coloured pixels against
   * 1214, and 509 pixels of the board turn over on the press. And Sixteen's
   * rule stands: the thing that identifies a button has to survive being
   * pressed.
   *
   * What was wrong was the conclusion drawn from them, twice over. "It would
   * stop being findable in a block of five" does not follow: the block is four
   * arrows and this, the arrows never move, and a cross is not an arrow — the
   * reader looks for the one that is not pointing anywhere and finds it in the
   * same corner either way. And "the state is on the board already" was
   * answered in the sentence before it, which calls that difference quiet: same
   * hue, thirty-two identical discs. A quiet board is a reason for the button to
   * speak up, not to stay silent.
   *
   * The thing that settled it arrived later. Pegs is two levels — a press picks
   * a peg up, and then the arrows jump it and this key puts it down again
   * (pegs.c:987) — and every other two-level puzzle here shows the second one
   * with a different face: Rectangles turns Mark and Erase into a tick and a
   * cross, Same Game's second key is a cross. Pegs wearing one picture in both
   * was the odd one out, and it was odd in the direction of saying less.
   *
   * `cancel` rather than a picture of its own, because that is what this is:
   * the same abandon-the-pending-thing that five other puzzles spend it on. The
   * tint from `on` stays, as it does on Same Game's, and now says the same thing
   * a third time rather than a second.
   */
  pegs: [
    {
      key: 'Enter',
      icon: 'jump',
      says: 'jump',
      faces: {
        Select: { icon: 'jump', says: 'jump' },
        Cancel: { icon: 'cancel', says: 'unjump', on: true },
      },
    },
  ],

  /*
   * Dominosa, where the cursor stands between two squares rather than on one.
   *
   * Its chapter: "when the cursor is half way between two adjacent numbers,
   * pressing the return key will place a domino covering those numbers, or
   * pressing the space bar will lay a line between the two squares. Repeating
   * either action removes the domino or line." So the arrows walk a grid of
   * `2w-1` by `2h-1` (dominosa.c:2831) and only the positions with exactly one
   * odd coordinate are between two squares; on a square's own centre, and on the
   * corner where four meet, both keys report nothing and both buttons go out.
   *
   * Two buttons, and they are the clearest case of it so far: one says these two
   * are a domino, the other says they are not, and a reader deducing their way
   * through a board wants the second at least as often as the first. Upstream
   * spends its right-click on the same mark.
   *
   * Both keys can say "Remove" — of a domino, and of a line — and they are the
   * reason `BOTH` exists. They are never on offer together, so an empty Space
   * beside "Remove" is a real empty, not a folded one.
   */
  dominosa: [
    {
      key: 'Enter',
      icon: 'domino',
      says: 'domino',
      faces: {
        Place: { icon: 'domino', says: 'domino' },
        Remove: { icon: 'dominoOn', says: 'undomino', on: true },
      },
    },
    {
      key: ' ',
      icon: 'line',
      says: 'line',
      faces: {
        Line: { icon: 'line', says: 'line' },
        Remove: { icon: 'lineOn', says: 'unline', on: true },
      },
    },
  ],

  /*
   * Untangle, the first puzzle here whose back end says nothing at all — its
   * `current_key_label` is NULL. See `SILENT` for what that costs.
   *
   * Its chapter: "the cursor keys may also be used to navigate amongst the
   * points. Pressing the Enter key will toggle dragging the currently-
   * highlighted point. Pressing Tab or Space will cycle through all the points."
   * Three sentences, three keys, and the two here are the two that are not
   * arrows.
   *
   * The arrows are unlike every other puzzle's: they do not step a grid, they
   * search for the nearest point in the quadrant they point at
   * (untangle.c:2287-2350) — and once a point is in the air the same four keys
   * shove it half a tile at a time instead. So Enter is not merely what makes
   * the arrows worth having, it is what changes what they are.
   *
   * `drag` is named as the switch rather than as either side of it, which is
   * upstream's own framing — "toggle dragging" — and Net's padlock all over
   * again. There is nothing to gate it on and nothing needs gating: with no
   * point highlighted a press highlights the first one rather than moving
   * anything, so there is no state in which this button acts unseen. That makes
   * Untangle the one puzzle so far that keeps no copy and needs no label.
   *
   * `cycle` is the second key and it earns the cell. It is not a synonym for
   * Enter the way Netslide's and Flip's Space is, and the quadrant search is
   * exactly the kind of thing that leaves a point unreachable — two points in
   * the same place are skipped on purpose (2313), and upstream's own answer to
   * that is this key.
   */
  untangle: [
    { key: 'Enter', icon: 'vertex', says: 'drag' },
    { key: ' ', icon: 'cycle', says: 'cycle' },
  ],

  /*
   * Black Box, whose Enter means three different things depending on which part
   * of the board the cursor has got to.
   *
   * Its chapter puts two of them in one sentence — "pressing the Enter key will
   * fire a laser or add a new ball-location guess, and pressing Space will lock
   * a cell, row, or column" — and the third a paragraph later: "when an
   * appropriate number of balls have been guessed, a button will appear at the
   * top-left corner of the grid; clicking that (with mouse or cursor) will check
   * your guesses". The cursor roams a grid two wider and two taller than the
   * arena (blackbox.c:934), so those three regions are three places it can
   * stand, and `current_key_label` names which one it is in.
   *
   * Four faces on one key looks like the thing the Same Game note warns
   * against, and it is the other side of that line. The rule there is that a
   * button keeps one job and greys out when upstream spends the key on
   * something else; here every one of the four *is* the job — do what this
   * square offers — and each is the only thing the cursor could mean while it
   * stands where it stands. Rectangles' pair is the same shape with fewer
   * regions.
   *
   * Nothing is kept on this side. The label checks `ui->cur_visible` and
   * `!state->reveal` before it says anything (blackbox.c:1170), so a hidden
   * cursor and a revealed board both grey the pair out on their own. It greys
   * them in two more places worth knowing: a laser square that has already been
   * fired, where a press only replays the beam — reachable by tapping it, which
   * is what the manual describes — and an arena square that is locked, which is
   * what locking is for.
   *
   * Space says "Lock" or "Unlock" for a single square, and for a whole row or
   * column from the ring, where upstream picks the word by majority (1183-1194).
   * That is the case for reading it rather than printing one padlock the way Net
   * does: nobody can see at a glance which way a row of eight will go.
   */
  blackbox: [
    {
      key: 'Enter',
      icon: 'ball',
      says: 'ball',
      faces: {
        Fire: { icon: 'laser', says: 'fire' },
        Ball: { icon: 'ball', says: 'ball' },
        Clear: { icon: 'ballOn', says: 'unball', on: true },
        Check: { icon: 'done', says: 'check' },
      },
    },
    {
      key: ' ',
      icon: 'lock',
      says: 'lockCell',
      faces: {
        Lock: { icon: 'lock', says: 'lockCell' },
        Unlock: { icon: 'unlock', says: 'unlockCell', on: true },
      },
    },
  ],

  /*
   * The eight that cycle one square through three or four contents, and the
   * plainest entries in this table: two keys, a face per word, and the word is
   * already a name for what the press produces.
   *
   * That last part is what makes them plain, and it is worth saying because
   * Pattern is the exception that had to be built by hand. There the labels are
   * upstream's cycle — press Enter on a grey square and you get "Black", press
   * it on a black one and you get "Grey" — so a button named for a colour has
   * to hunt for the key that currently reaches it (`does`). These eight report
   * the same way, but their two keys between them cover every state a square
   * can be in, so nothing has to be hunted for: whatever the label says, that
   * is what this key does here, and the picture says it.
   *
   * Where a square goes back to nothing the face is `emptyCell` rather than a
   * bare outline. Unruly and Mosaic need "white" and "empty" to be two
   * pictures; the rest are given the same one for the sake of the reader who
   * plays more than one of them.
   */
  /*
   * Slant's three, the first entry here to send neither Enter nor Space. Tents
   * is the other, and reading them together is worth the two minutes: the same
   * three buttons, arrived at from opposite complaints, and only one of the two
   * puzzles hands back a MOVE_NO_EFFECT to make the idempotent press free.
   *
   * Its two cursor keys are one cycle wound both ways, exactly Pattern's shape:
   * blank steps to `\` steps to `/` steps back to blank, and Space steps round
   * the other way (slant.c:1742). Pattern's answer to that was three buttons
   * named for a result, hunting for whichever key reaches it — and Pattern had
   * to be built that way because upstream gives it nothing else.
   *
   * Slant gives something else. `\`, `/` and `\b` set the square outright and
   * answer MOVE_NO_EFFECT when it is already that (slant.c:1832), so three
   * buttons here are not three names for a synthesis: they are three keys the
   * back end has always read and never offered a button for. That is the
   * original definition of what this keypad is for, and it is why these send
   * their own characters rather than going through `does`.
   *
   * The cycle keys lose their buttons and nothing goes with them: any state is
   * one press from any other on the three, which is all the cycle bought.
   *
   * No `lit`, and the reason is worth keeping because these three look so much
   * like Pattern's. Pattern needs it because its buttons are named for a result
   * and `does` answers null when the square already has that colour — the same
   * null it answers when there is no cursor, so the two had to be told apart by
   * hand. Nothing is named for a result here. A square that already holds a `\`
   * still has non-empty labels, so the key goes out and *upstream* answers
   * MOVE_NO_EFFECT, which is the idempotent case settled by the side that knows.
   * The only null left is the one meaning "no cursor", and dimming is exactly
   * what that one is for. `lit` was written in first and measured: all three
   * stayed live with the cursor away, which is the state the house rule reserves
   * the dimming for.
   *
   * Liveness comes from the labels going empty, which for this puzzle means
   * exactly one thing. `current_key_label` opens with `ui->cur_visible` and its
   * switch answers both keys in all three cases, so both words are non-empty
   * whenever the cursor is on screen and both are empty when it is not — and
   * `doesNothing` already asks for both to be empty when the key is not Enter.
   * The gate matters: these three do *not* check `cur_visible` themselves, and
   * measured, one pressed after a tap on the board writes to wherever the
   * hidden cursor was left.
   *
   * No `WORDS` entry any more, since nothing here reads what the words are —
   * only whether there are any.
   *
   * The third key is `bareSquare` and not `white`: what this puzzle's empty
   * square shows is the board's own ground, which is a glyph with no fill and
   * not a white one. See Icon.tsx for the measurement — a filled `white` here
   * came out inverted on the dark theme.
   */
  slant: [
    { key: '\\', icon: 'backslash', says: 'backslash' },
    { key: '/', icon: 'slash', says: 'slash' },
    { key: '\b', icon: 'bareSquare', says: 'noLine' },
  ],

  /*
   * Light Up, whose two keys are mutually exclusive rather than a cycle: a lit
   * square cannot be marked and a marked one cannot be lit (lightup.c:1500), so
   * whichever one is in use puts the other button out. Both spell their undo
   * "Clear", and they can never say it together, which is why there is no
   * `BOTH` line for it.
   */
  lightup: [
    {
      key: 'Enter',
      icon: 'lamp',
      says: 'light',
      faces: {
        Light: { icon: 'lamp', says: 'light' },
        Clear: { icon: 'white', says: 'unlight', on: true },
      },
    },
    {
      key: ' ',
      icon: 'dotSquare',
      says: 'cannot',
      faces: {
        Mark: { icon: 'dotSquare', says: 'cannot' },
        Clear: { icon: 'white', says: 'uncannot', on: true },
      },
    },
  ],

  /*
   * Tents' three, Slant's shape reached from the other direction: not a cycle
   * wound both ways, but a pair of keys that will not do the one thing this
   * puzzle is played by.
   *
   * Enter gives `v == BLANK ? 'T' : 'B'` and Space `v == BLANK ? 'N' : 'B'`
   * (tents.c:1702), so neither key can put grass where a tent stands — it has
   * to be cleared first — and while it stands both buttons wear "Clear" and
   * neither shows what it would place. Two presses and a face that changes
   * under the thumb, for the one move a reader makes over and over.
   *
   * `'T'`, `'N'` and `'B'` set the square outright and are read on the very
   * next line (tents.c:1706). So all three faces are fixed, every state is one
   * press from every other, and the cycle keys lose nothing by losing their
   * buttons.
   *
   * These were two switches for a while — tent and grass, each clearing the
   * square on a second press, with no third button. It read well and it cost a
   * save-file reader to work at all, because nothing the back end says tells a
   * tent from grass: both answer "Clear". Three fixed keys need none of that.
   * The press that asks for what is already there writes the move anyway, since
   * there is no MOVE_NO_EFFECT on this path, so it costs an undo step that
   * changes nothing — Slant is spared that by slant.c:1832 and this is not.
   *
   * Liveness is free and exact, more exact than anywhere else in this table.
   * `interpret_move` refuses all three when the cursor is hidden or the square
   * is a tree, and `current_key_label` returns "" under precisely those two
   * conditions — its switch covers BLANK, TENT and NONTENT and lets TREE fall
   * out (tents.c:1482). The labels going empty *is* the refusal, which is what
   * `doesNothing` already reads. No `WORDS` and no `BOTH`: nothing here reads
   * what the words are, only whether there are any.
   *
   * `bareSquare` and not `white` for the third, for Slant's reason and on
   * Slant's measurement: a blank square here is COL_BACKGROUND (tents.c:2349),
   * the ground the board leaves showing, rgb(213,213,213) light and
   * rgb(44,44,44) dark, while `white` fills with `--cell-empty`, #ffffff and
   * #cccccc.
   */
  tents: [
    { key: 'T', icon: 'tent', says: 'tent', switches: 'B' },
    { key: 'N', icon: 'grass', says: 'grass', switches: 'B' },
  ],

  singles: [
    {
      key: 'Enter',
      icon: 'black',
      says: 'blackSquare',
      faces: {
        Black: { icon: 'black', says: 'blackSquare' },
        Restore: { icon: 'white', says: 'restore', on: true },
        Remove: { icon: 'white', says: 'uncircle', on: true },
      },
    },
    {
      key: ' ',
      icon: 'circleSquare',
      says: 'circle',
      faces: {
        Circle: { icon: 'circleSquare', says: 'circle' },
        Restore: { icon: 'white', says: 'restore', on: true },
        Remove: { icon: 'white', says: 'uncircle', on: true },
      },
    },
  ],

  unruly: [
    {
      key: 'Enter',
      icon: 'black',
      says: 'blackSquare',
      faces: {
        Black: { icon: 'black', says: 'blackSquare' },
        White: { icon: 'white', says: 'whiteSquare' },
        Empty: { icon: 'emptyCell', says: 'emptySquare' },
      },
    },
    {
      key: ' ',
      icon: 'white',
      says: 'whiteSquare',
      faces: {
        Black: { icon: 'black', says: 'blackSquare' },
        White: { icon: 'white', says: 'whiteSquare' },
        Empty: { icon: 'emptyCell', says: 'emptySquare' },
      },
    },
  ],

  mosaic: [
    {
      key: 'Enter',
      icon: 'black',
      says: 'blackSquare',
      faces: {
        Black: { icon: 'black', says: 'blackSquare' },
        White: { icon: 'white', says: 'whiteSquare' },
        Empty: { icon: 'emptyCell', says: 'emptySquare' },
      },
    },
    {
      key: ' ',
      icon: 'white',
      says: 'whiteSquare',
      faces: {
        Black: { icon: 'black', says: 'blackSquare' },
        White: { icon: 'white', says: 'whiteSquare' },
        Empty: { icon: 'emptyCell', says: 'emptySquare' },
      },
    },
  ],

  /*
   * Range's three, Pattern's shape rather than the cycle upstream reads.
   *
   * Its two keys are a cycle wound both ways — empty steps to a dot steps to a
   * fill — so buttons that follow the labels wear three faces that move with
   * the cursor: the button that filled a square a moment ago is the one that
   * empties it now. Three buttons named for a result instead, each one hunting
   * for whichever key currently reaches it, which is exactly what `does` is
   * for and exactly what Pattern needed it for.
   *
   * Safe because the labels give a distinct pair for each of the three states —
   * empty says {Fill, Dot}, a dot says {Empty, Fill}, a fill says {Dot, Empty}
   * (range.c:1317) — so every result is always one press away and never
   * ambiguous. And `lit` for the same reason Pattern has it: a press asking for
   * a dot on a square that already has one leaves it there, which is idempotent
   * rather than failed, and a button that goes dark mid-run changes shape under
   * a thumb that is not watching it.
   *
   * A clue square reports nothing at all (range.c:1316) and all three go out
   * together, which is upstream's own refusal showing through.
   */
  range: [
    { key: 'Enter', icon: 'black', says: 'fillSquare', does: 'Fill', instead: 'Empty' },
    { key: ' ', icon: 'dotSquare', says: 'dotSquare', does: 'Dot', instead: 'Empty' },
  ],

  /*
   * Magnets, where a press works on half a domino and the other half follows.
   * Enter cycles the poles, Space the two markers upstream draws for "this
   * domino is blank" and "this one is definitely not" — six words between
   * them, and each names what the press will leave behind.
   */
  magnets: [
    {
      key: 'Enter',
      icon: 'plusSquare',
      says: 'plus',
      faces: {
        '+': { icon: 'plusSquare', says: 'plus' },
        '-': { icon: 'minusSquare', says: 'minus' },
        Clear: { icon: 'emptyCell', says: 'clearSquare' },
      },
    },
    {
      key: ' ',
      icon: 'crossSquare',
      says: 'blankDomino',
      faces: {
        X: { icon: 'crossSquare', says: 'blankDomino' },
        '?': { icon: 'questionSquare', says: 'notBlankDomino' },
        Clear: { icon: 'emptyCell', says: 'clearSquare' },
      },
    },
  ],

  /*
   * Tracks, whose cursor walks a half-grid like Dominosa's: the even stops are
   * squares and the odd ones the edges between them, and both keys work on
   * whichever it is standing on. Upstream's `ui_can_flip_*` decides whether
   * there is anything to do at all (tracks.c:1268), and where there is not the
   * label is empty and the button goes out — which is how a clue square, whose
   * track is given, keeps its answer.
   */
  tracks: [
    {
      key: 'Enter',
      icon: 'track',
      says: 'track',
      faces: {
        Track: { icon: 'track', says: 'track' },
        Clear: { icon: 'emptyCell', says: 'clearSquare', on: true },
      },
    },
    {
      key: ' ',
      icon: 'crossSquare',
      says: 'noTrack',
      faces: {
        X: { icon: 'crossSquare', says: 'noTrack' },
        Clear: { icon: 'emptyCell', says: 'clearSquare', on: true },
      },
    },
  ],

  /*
   * Filling, whose two keys are both about the selection rather than about the
   * board: the digits on its keypad are what actually fill squares, and these
   * choose which squares they fill. Enter runs a selection along with the
   * arrows and stops it; Space adds and removes the one square under the
   * cursor. A clue square cannot be selected, and upstream says so by falling
   * silent (filling.c:1462).
   */
  filling: [
    {
      key: 'Enter',
      icon: 'select',
      says: 'multiselect',
      faces: {
        Multiselect: { icon: 'select', says: 'multiselect' },
        Stop: { icon: 'done', says: 'stopSelect', on: true },
      },
    },
    {
      key: ' ',
      icon: 'pickCell',
      says: 'selectSquare',
      faces: {
        Select: { icon: 'pickCell', says: 'selectSquare' },
        Deselect: { icon: 'white', says: 'deselectSquare', on: true },
      },
    },
  ],

  /*
   * Flood, whose two keys have nothing to do with each other. Enter floods the
   * top-left corner with the colour under the cursor — the only move this game
   * has — and Space replays the solver's next step, which exists only after
   * Solve has been pressed and which upstream reports exactly then.
   *
   * That second one is a level rather than a state, the same as Inertia's key
   * of the same name and for the same reason: before Solve there is no route,
   * so the slot is not in this menu. It sat dim through every game nobody asked
   * for the answer to until that was noticed. See `level`, and `SECOND`.
   *
   * This is the one puzzle in the collection whose label does not check the
   * cursor flag, so it needs a mirror. See CURSOR_LIFE.
   */
  flood: [
    {
      key: 'Enter',
      icon: 'floodFill',
      says: 'floodFill',
      faces: { Fill: { icon: 'floodFill', says: 'floodFill' } },
    },
    {
      key: ' ',
      icon: 'advance',
      says: 'advance',
      offCursor: true,
      level: 2,
      faces: { Advance: { icon: 'advance', says: 'advance' } },
    },
  ],

  /*
   * Palisade, the second back end that reports nothing (see SILENT) and the
   * only puzzle where a preference decides whether these buttons exist at all
   * — see `cursorKeys`.
   *
   * In its half-grid mode the cursor stands on the border between two squares
   * and these two draw a wall there or cross it off; on a square's own centre
   * or corner both do nothing, which is the same shape as Dominosa's half-grid
   * and the same cost. Both words name the switch rather than either side of
   * it, because with no label there is nothing to follow: a press draws a wall
   * as readily as it rubs one out, and the board shows which.
   */
  palisade: [
    { key: 'Enter', icon: 'edge', says: 'edge' },
    { key: ' ', icon: 'noEdge', says: 'noEdge' },
  ],

  /*
   * Bridges, whose two keys are two different jobs that happen to share a word.
   * Enter opens a bridge from the island under the cursor and lands it where
   * the arrows have got to; Space says you have finished with this island, and
   * upstream then refuses to let you disturb its bridges. Mid-drag both report
   * "Finished" — Enter lands it, Space drops it — which is what `BOTH` is for.
   */
  bridges: [
    {
      key: 'Enter',
      icon: 'island',
      says: 'startBridge',
      faces: {
        Select: { icon: 'island', says: 'startBridge' },
        Finished: { icon: 'done', says: 'endBridge', on: true },
      },
    },
    {
      key: ' ',
      icon: 'islandDone',
      says: 'islandDone',
      faces: { Finished: { icon: 'islandDone', says: 'islandDone' } },
    },
    // And the mark that says two islands are definitely not joined, which is
    // upstream's Shift+arrow and has no other way in. See `primes`.
    { key: '', icon: 'noBridge', says: 'noBridge', primes: { shift: true } },
  ],

  /*
   * Signpost, where a press starts a link and the next one lands it. The two
   * keys differ in which end the cursor is: Enter links this square to its
   * successor, Space to its predecessor, and once a link is open each key says
   * whether the square under the cursor can be the other end of it.
   */
  signpost: [
    {
      key: 'Enter',
      icon: 'linkFrom',
      says: 'linkFrom',
      faces: {
        'From here': { icon: 'linkFrom', says: 'linkFrom' },
        'To here': { icon: 'linkTo', says: 'linkTo', on: true },
        Cancel: { icon: 'cancel', says: 'cancelLink', on: true },
      },
    },
    {
      key: ' ',
      icon: 'linkTo',
      says: 'linkTo',
      faces: {
        'From here': { icon: 'linkFrom', says: 'linkFrom', on: true },
        'To here': { icon: 'linkTo', says: 'linkTo' },
        Cancel: { icon: 'cancel', says: 'cancelLink', on: true },
      },
    },
  ],

  /*
   * Pearl, whose Enter is a keyboard drag: press once to start drawing the
   * loop, walk it with the arrows, press again to leave it. Space exists only
   * to abandon one, which is why it has a single face and is out the rest of
   * the time — upstream reports nothing for it until a drag is open.
   */
  pearl: [
    {
      key: 'Enter',
      icon: 'drawLine',
      says: 'startLoop',
      faces: {
        Start: { icon: 'drawLine', says: 'startLoop' },
        Stop: { icon: 'done', says: 'endLoop', on: true },
      },
    },
    {
      key: ' ',
      icon: 'cancel',
      says: 'cancelLoop',
      faces: { Cancel: { icon: 'cancel', says: 'cancelLoop', on: true } },
    },
  ],

  /*
   * Galaxies, which has the longest label vocabulary in the collection and one
   * button to spend it on: its `current_key_label` never asks which key it was
   * called about, so both report the same word and a second button would be
   * the first one again.
   *
   * Seven words, three jobs. On a grid line the key draws an edge or rubs one
   * out. On a dot it picks up an arrow — the marker that says "this square
   * belongs to that dot" — and on a square holding one it picks that up
   * instead; the next press drops it, removes it, or abandons the whole thing,
   * and upstream works out which and says so.
   */
  galaxies: [
    {
      key: 'Enter',
      icon: 'edge',
      says: 'drawEdge',
      faces: {
        Edge: { icon: 'edge', says: 'drawEdge' },
        Clear: { icon: 'noEdge', says: 'clearEdge', on: true },
        'New arrow': { icon: 'galaxyArrow', says: 'newArrow' },
        'Move arrow': { icon: 'galaxyArrow', says: 'moveArrow' },
        Place: { icon: 'done', says: 'dropArrow', on: true },
        Remove: { icon: 'cancel', says: 'removeArrow', on: true },
        Cancel: { icon: 'cancel', says: 'cancelArrow', on: true },
      },
    },
  ],

  /*
   * Inertia's one, and the only key in this table that sits in the middle of
   * the cross rather than beside it.
   *
   * `IS_CURSOR_SELECT` plays the next step of the solver's answer, and only
   * while there is one left to play — `state->soln && state->solnpos <
   * state->soln->len` (inertia.c:1621). Both select keys reach it and both
   * report the same word, so it is one button; and `current_key_label` reports
   * "Advance" or nothing (1544), so the ordinary rule dims it — see
   * `doesNothing`, which is all `wouldSend` needs here.
   *
   * The centre is where it goes because Inertia is the one puzzle whose two
   * usual cells are taken: eight ways out of a square fills the corners. That
   * cell was left empty on the grounds that a key in the middle of a direction
   * pad would have to mean "stay", and a ball that rolls until it hits
   * something has no such move — which is true of *directions* and is the
   * argument for what may go there rather than against anything going there.
   * This is not a direction. It is the one press on this screen that is not
   * about where to go, and the middle of a pad of directions is where a thing
   * that is not one is unmistakable.
   *
   * The last key in the collection the back end read with no button anywhere,
   * and the one that most clearly earned one: all eight directions are already
   * a tap on the board, since a press on any square but the ball's own is read
   * as an octant (inertia.c:1591), and the solver's replay has no gesture at
   * all.
   */
  inertia: [{ key: 'Enter', icon: 'advance', says: 'advance', level: 2 }],

  /*
   * Map's two, and the first pair in this table that the back end has never
   * heard of.
   *
   * Upstream's own two were halves of a pick-up — Enter took the colour under
   * the cursor and put it down somewhere else, Space did the same with a
   * stipple — and every word either reported was about a colour in hand. The
   * palette says the colour outright, so there is nothing to carry and no
   * journey to offer.
   *
   * What is left are the two answers that are not a colour, and they take the
   * two cells the cross leaves either side of the up key. The modifier is on
   * the left because it is pressed first and reads first, the same argument
   * Guess's padlock is placed by; emptying is on the right, where a thumb finds
   * it without reading, and it is the one of the two that changes the board.
   *
   * One key rather than five for emptying: a colour move takes the stipple
   * under it away too (map.c:2653), so `C` empties a region whatever was in it.
   */
  map: [
    { key: '', icon: 'stipple', says: 'maybeMode', arms: true },
    { key: '', icon: 'clear', says: 'clearRegion', paints: { colour: -1 } },
  ],


  solo: [PENCIL],
  unequal: [PENCIL],
  keen: [PENCIL],
  towers: [PENCIL],
  undead: [PENCIL],
}

/**
 * The button a *hold* stands for, where it is not the right one.
 *
 * A finger makes two presses and no more: a tap and a hold. `usePuzzlePointer`
 * spends the second of them on the right button, which is the correct trade
 * almost everywhere — half the collection needs a right click for something,
 * flagging a mine or pencilling a digit — but it leaves the middle button with
 * no gesture at all, and in Net the middle button is the lock.
 *
 * So Net spends its hold differently. What it gives up is rotating the other
 * way, which is three presses of the ordinary rotate; what it buys is the only
 * gesture on touch that can lock a tile, and locking has no substitute there.
 *
 * A hold only, and not the mouse's right click with it. That is a change from
 * how this started, and the reason is that the trade above is a trade a finger
 * has to make and a mouse does not: the wheel button and Shift-click both reach
 * the middle button already, so charging the right click for it takes away
 * rotate-right and returns nothing. A mouse therefore gets upstream's three
 * buttons unaltered — left rotates one way, right the other, wheel or Shift
 * locks — and only the hold is ours to spend.
 *
 * Per puzzle, and it has to be: making this the rule everywhere would take the
 * hold away from the twenty-odd puzzles whose second press is a right click.
 *
 * Upstream has an accommodation for a one-button pointer and this is not a
 * duplicate of it — it is dead code in this build, twice over. `MOD_STYLUS`
 * makes Net's right click lock (net.c:2299) and does the same kind of thing in
 * four other games, but the midend only ever sets that bit inside
 * `#ifdef STYLUS_BASED` (midend.c:991), and `STYLUS_BASED` is defined nowhere
 * in the tree — it is a Palm/PocketPC-era platform macro. Defining it would
 * also hand Net `USE_DRAGGING` (net.c:31), replacing click-to-rotate with
 * drag-to-rotate, which upstream's own comment calls "quite strange and
 * unintuitive". And it is a claim about the machine, not about the pointer in
 * use: one wasm binary serves a mouse and a finger at once and cannot make it.
 *
 * The second layer is simpler. Upstream's own `emccpre.js` binds only
 * `onmousedown`/`onmousemove`/`onmouseup`; there is no touch code in it at all,
 * so on a phone its web build has one button and no hold. A second press on
 * touch is this side's invention, which is why spending it is this side's
 * choice to make.
 */
export const HOLD_BUTTON: Record<string, number> = {
  /** The middle button, which is `TOGGLE_LOCK` in net.c. */
  net: 1,
}

/** palisade.c's "Cursor mode", by its two answers (palisade.c:906). */
const CURSOR_MODE = ['Half-grid', 'Full-grid']

/**
 * The keys to put either side of the arrows, for a puzzle whose answer is not
 * settled by its name alone.
 *
 * Palisade is the only one, and it is the one place where a preference decides
 * whether a button exists at all rather than what it looks like. Its cursor has
 * two modes: on the borders, where Enter and Space place and unplace an edge,
 * and on the squares, where the same job is Ctrl and Shift held with an arrow
 * (palisade.c:1013). We cannot send a modifier, so in the second mode these two
 * buttons would be live and do nothing — and Palisade reports no labels at all,
 * so nothing else would ever put them out. Better to have no buttons than two
 * that lie.
 *
 * Half-grid is upstream's default (892), so the ordinary reader gets them.
 */
export function cursorKeys(
  name: string,
  prefs: readonly DialogControl[] = [],
): CursorKey[] {
  if (name === 'palisade' && preference(prefs, CURSOR_MODE) === 1) return []
  return CURSOR_KEYS[name] ?? []
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
