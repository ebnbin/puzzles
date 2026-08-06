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

/** guess.c's own name for the setting that writes numbers on the pegs. */
const LABELLED = 'Label colours with numbers'

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
    const m = p.match(/^c(\d+)p\d+g\d+/)
    if (!m) return null
    const n = +m[1]
    // guess.c:219-224: under two colours is not a puzzle, and ten is as many
    // as game_colours defines.
    if (n < 2 || n > 10) return null
    const labelled = flag(prefs, LABELLED)
    return [
      ...Array.from({ length: n }, (_, i): KeyLabel => {
        // guess.c:940 takes '1'..'9' and then '0' for the tenth, and draw_peg
        // writes `'0' + col % 10` inside the peg — so the character the key
        // sends and the character the board shows are the same one, and the
        // tenth peg is labelled 0 on both.
        const button = '0'.charCodeAt(0) + ((i + 1) % 10)
        return {
          button,
          ...(labelled ? { label: String.fromCharCode(button) } : {}),
          slot: COL_1 + i,
          ink: COL_FRAME,
          value: i + 1,
        }
      }),
      CLEAR,
      HINT,
    ]
  },

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
export const READS_PREFS = new Set(['undead', 'guess'])

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
}

/**
 * What a key looks like and is called while it is reporting one particular
 * word. `on` draws it as held down, for the modes that are otherwise invisible.
 */
export type CursorFace = { icon: IconName; says: CursorWord; on?: boolean }

/** The words these keys can be called, so a missing translation is a type error. */
export type CursorWord =
  | 'rotateLeft'
  | 'lock'
  | 'pencil'
  | 'black'
  | 'white'
  | 'carryTile'
  | 'holdPlace'
  | 'turnLeft'
  | 'turnRight'
  | 'slide'
  | 'place'
  | 'submit'
  | 'hold'
  | 'flip'
  | 'select'
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
export type KeyLabels = { enter: string; space: string }

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
 * Why there has to be one at all. Twenty-two of the thirty-four puzzles that
 * implement `current_key_label` open it with a check on their own visibility
 * flag, so an empty pair of labels already means "no cursor" and this side has
 * to keep nothing. Net does not: it reads `tile(state, ui->cur_x, ui->cur_y)`
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
   * And Guess, whose label leaves out `ui->display_cur` like the other three,
   * and whose select key places a peg the instant it is pressed (guess.c:933).
   *
   * The longest list here, because Guess reads the most keys and nearly every
   * one of them shows the cursor: the digits insert a colour (guess.c:943), D
   * and Backspace clear a peg (952), and `h` runs the hinter, which shows the
   * cursor as a side effect of the "visually indicate futility" hack at
   * guess.c:799. Most of this list matters to us and not only to a keyboard:
   * the digits, Clear and `h` are all on this puzzle's keypad, so a thumb can
   * reach them, which is why `pressKey` asks about waking too.
   *
   * Backspace is in here twice on purpose, spelled both ways. The two paths
   * name the same key differently: a physical press arrives as
   * `KeyboardEvent.key`, which is `Backspace`, and a keypad press arrives as
   * the character its button value stands for, which is `\b`. Neither spelling
   * covers the other, and a mirror that slept through the button would leave
   * two grey keys beside a cursor the board is drawing.
   */
  guess: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ',
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
          'd', 'D', 'Backspace', '\b', 'h', 'H', '?'],
}

/** Whether this puzzle's cursor has to be tracked on this side. */
const mirrorsCursor = (name: string) => name in CURSOR_LIFE

/**
 * The puzzles whose cursor can walk off the board, and what they report while
 * it is out there.
 *
 * Sixteen is the only one. Its cursor roams a grid two wider and two taller
 * than the board (sixteen.c:657-686), so the arrows walk it out into the ring
 * of sliding arrows around the edge, and the four corners of that ring bounce
 * it round onto the neighbouring edge. Nowhere else in the collection do the
 * arrows leave the board at all.
 *
 * Those rim squares are a dead end for anyone playing from the button pad. The
 * two keys slide a row from out there instead of setting a mode, and sliding a
 * row already has a gesture — the same arrow, tapped on the board — so the
 * shoulder buttons go out and the reader is somewhere with nothing to press.
 * `PuzzleHost` keeps the cursor off them: an arrow that lands out here is
 * undone by sending its opposite, in the same turn, before anything is painted.
 *
 * Measured: fifty of those step-off-step-back pairs leave the cursor exactly
 * where it started and add nothing to the move list — cursor movement returns
 * `MOVE_UI_UPDATE`, which the midend does not record as a state.
 *
 * Reading it from the labels rather than from a tracked position is what keeps
 * this free. "Slide" and "Back" are what the keys report out there and nothing
 * else reports them, so one string comparison answers it, and an upstream
 * rename means no match, no bounce, and upstream's own behaviour back.
 */
const OFF_BOARD: Record<string, readonly string[]> = {
  sixteen: ['Slide', 'Back'],
}

/** Whether this puzzle's cursor is somewhere the arrows should not leave it. */
export const isOffBoard = (name: string, labels: KeyLabels) =>
  (OFF_BOARD[name] ?? []).includes(labels.enter)

/** The arrow that undoes an arrow, for stepping back off the rim. */
export const OPPOSITE: Record<string, string> = {
  ArrowUp: 'ArrowDown',
  ArrowDown: 'ArrowUp',
  ArrowLeft: 'ArrowRight',
  ArrowRight: 'ArrowLeft',
}

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
   * while off and "Unlock" while on. `toggles` reads the second job and lets
   * the first alone, so a cursor sitting on the rim finds both buttons out.
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
  guess: ['Place', 'Submit', 'Hold'],
}

/** Whether we are still reading a puzzle's labels rather than guessing at them. */
const understood = (name: string, labels: KeyLabels) => {
  const words = WORDS[name]
  return !!words && [labels.enter, labels.space].every((w) => !w || words.includes(w))
}

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
 * Everywhere else the pair already carries it and this argument is ignored.
 */
export const wouldSend = (
  name: string,
  cursor: CursorKey,
  labels: KeyLabels,
  awake: boolean,
): string | null => {
  if (mirrorsCursor(name) && !awake) return null
  if (understood(name, labels)) {
    if (cursor.does) {
      if (labels.enter === cursor.does) return 'Enter'
      if (labels.space === cursor.does) return ' '
      return null
    }
    if (cursor.faces) return cursor.faces[mine(cursor, labels)] ? cursor.key : null
  }
  return doesNothing(cursor.key, labels) ? null : cursor.key
}

/**
 * What the back end says about this button's own key, with the blanking undone.
 *
 * An empty Space beside a named Enter is `js_update_key_labels` folding the two
 * together because they agree, so Space's real word is Enter's. Rectangles is
 * where this bites: a drag that has been opened but not moved yet has both keys
 * saying "Cancel", which arrives as {"", "Cancel"} — and taken at face value the
 * Space button would go out wearing the face it had before the drag started,
 * telling the reader it would erase something when a press would abandon the
 * drag. The same fold is why `doesNothing` is asymmetric.
 */
const mine = (cursor: CursorKey, labels: KeyLabels) =>
  cursor.key === 'Enter' ? labels.enter : labels.space || labels.enter

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
  const known = understood(name, labels) && (awake || !mirrorsCursor(name))
  const face = known ? cursor.faces?.[mine(cursor, labels)] : undefined
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
   * They are the first keys here that are a mode rather than a move, and that
   * costs them two things the others do not need. They show a pressed state,
   * because `cur_mode` lives in Sixteen's `game_ui` and is never drawn — the
   * word on the key is the only place a reader can find out that their arrows
   * have stopped moving the cursor and started shoving tiles — hence the `on`
   * face. And they go out
   * on the rim, where the same two keys slide a row instead: sliding already
   * has a gesture, so it is not what these buttons are for, and a key that
   * quietly changed jobs under the reader's finger would be worse than one that
   * waits.
   */
  sixteen: [
    {
      key: 'Enter',
      icon: 'carryTile',
      says: 'carryTile',
      faces: {
        'Lock tile': { icon: 'carryTile', says: 'carryTile' },
        Unlock: { icon: 'carryTileOn', says: 'carryTile', on: true },
      },
    },
    {
      key: ' ',
      icon: 'holdPlace',
      says: 'holdPlace',
      faces: {
        'Lock pos': { icon: 'holdPlace', says: 'holdPlace' },
        Unlock: { icon: 'holdPlaceOn', says: 'holdPlace', on: true },
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
        Done: { icon: 'done', says: 'done', on: true },
        Cancel: { icon: 'cancel', says: 'cancel' },
      },
    },
    {
      key: ' ',
      icon: 'erase',
      says: 'erase',
      faces: {
        Erase: { icon: 'erase', says: 'erase' },
        Done: { icon: 'done', says: 'done', on: true },
        Cancel: { icon: 'cancel', says: 'cancel' },
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
   * board's own arrow, where it already was.
   */
  netslide: [{ key: 'Enter', icon: 'slide', says: 'slide' }],

  /*
   * Two keys that are a colour each, which is not how the puzzle spells them.
   *
   * A Pattern square is grey, black or white, and upstream's two keys are one
   * cycle wound opposite ways: `Enter` steps grey→black→white→grey and `Space`
   * steps it back — "the space bar does the same cycle in reverse", as its
   * chapter puts it. Neither key *sets* a colour, so a black square on a button
   * would have been a promise about the first press only, and a lie about the
   * second.
   *
   * `does` is how they become a promise about every press. The back end reports
   * what each key would do from where the cursor is standing, and the words are
   * the colours themselves, so a button asking for "Black" can look up which
   * key reaches black right now and send that one. On a grey square that is
   * `Enter`; on a white square it is `Space`; on a square already black it is
   * neither, and the button goes out. The picture on the key is now the whole
   * of what it does, so the long press has nothing left to explain and says the
   * colour.
   *
   * Grey is the one thing this costs, and it is worth saying where it went.
   * Grey is upstream's middle button — or Shift with any button — and a finger
   * has neither, so on a touch device a square could be painted and never
   * unpainted; the cycle reached it in two or three presses, which was the hole
   * these keys quietly closed when they arrived. Naming the colours takes it
   * away again: neither button ever asks for "Grey". Undo is the way back for
   * now.
   */
  pattern: [
    { key: 'Enter', icon: 'black', says: 'black', does: 'Black' },
    { key: ' ', icon: 'white', says: 'white', does: 'White' },
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
   * one row where it differs offers "Unselect", and nothing in a game of Same
   * Game needs it. Moving onto another region and pressing once switches the
   * selection, because that branch clears before it expands (samegame.c:1307,
   * whose own comment reads "might be no-op"); measured, a two-square selection
   * became a four-square one in a single press with no move committed. So the
   * second button was the same button again three times out of four, and on the
   * fourth it offered to tidy a status line.
   *
   * "Unselect" gets no face at all, which is the reason there are only two here.
   * This button is one job in two steps — pick a region, then press again to
   * take it — and unselecting is a third thing that is neither. Where upstream
   * offers it, the reader is standing on a lone square, which is to say they
   * tried to pick something and there was nothing pickable; the button that
   * says "select" going quiet is what that looks like. Sixteen's pair make the
   * same call on the rim, where the keys really would slide a row: a key that
   * changed jobs under the reader's finger is worse than one that waits.
   *
   * So on any square where nothing can be picked the button greys out still
   * wearing its own face, which falls out of `faces` without a special case —
   * an unlisted word is not live, and `faceOf` drops back to the key's own
   * picture.
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
   * Guess, where the arrows are two dials rather than one cursor.
   *
   * Its chapter: "the up and down cursor keys can be used to select a peg
   * colour, the left and right keys to select a peg position, and the Enter key
   * to place a peg of the selected colour in the chosen position... Space adds a
   * hold marker." So up and down pick *what*, left and right pick *where*, and
   * these two act on the pair — `move_cursor` is handed `&ui->peg_cur` for x and
   * `&ui->colour_cur` for y (guess.c:925), which is the whole of that.
   *
   * Enter has a second job at the end of the row and `current_key_label` names
   * it (guess.c:542): walk one step past the last peg and it becomes "Submit",
   * which marks the guess. That position only exists when the guess is
   * finished — `maxcur` is `npegs + ui->markable` — so the word appears exactly
   * when there is something to submit, and Space reports nothing there, since
   * holding a feedback slot means nothing.
   *
   * A hold is what carries a peg into the next guess, and it is the one thing
   * here the mouse reaches by a button rather than a drag — right-click, which
   * is a long press on the board already. This button is the keyboard's way to
   * the same mark.
   *
   * Not covered here, and still open: the colour digits and D/Backspace. Both
   * act where the cursor is, so they are cursor companions by the second
   * criterion, but there are up to ten of them and the cross has two cells.
   * They belong on the keypad beside `H`, drawn as the coloured pegs they
   * insert, which needs `keysFor` to read the colour count out of the game id.
   * A separate piece of work; see docs/keys.md.
   */
  guess: [
    {
      key: 'Enter',
      icon: 'place',
      says: 'place',
      faces: {
        Place: { icon: 'place', says: 'place' },
        Submit: { icon: 'done', says: 'submit', on: true },
      },
    },
    {
      key: ' ',
      icon: 'hold',
      says: 'hold',
      faces: { Hold: { icon: 'hold', says: 'hold' } },
    },
  ],

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
