import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Dialog from './Dialog'
import ErrorNote from './ErrorNote'
import Icon from './Icon'
import Introduction from './Introduction'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleTypes from './PuzzleTypes'
import ThemeToggle from './ThemeToggle'
import { createPuzzle } from './engine/createPuzzle'
import {
  asMaybes,
  cursorKeys,
  faceOf,
  inMenu,
  HOLD_BUTTON,
  keysFor,
  heads,
  keysFollowArrows,
  movesEightWays,
  opener,
  opens,
  READS_PREFS,
  offersArrows,
  shovesTiles,
  silent,
  wakesCursor,
  wouldSend,
} from './engine/keys'
import type { KeyLabels } from './engine/keys'
import { rolls } from './engine/cube'
import { clearMarks, fillMarks, pending, placeSingles, remaining } from './engine/marks'
import { mapSize, paintRegion, stepCursor } from './engine/map'
import type { Paint, Spot } from './engine/map'
import { setOrClear } from './engine/tents'
import {
  clearSave,
  isPlayed,
  markIntroduced,
  owesIntroduction,
  readSave,
  setPlaying,
  writeRecent,
  writeSave,
} from './engine/saves'
import type { CanvasRenderer } from './engine/renderer'
import type {
  DialogControl,
  DialogSpec,
  KeyAction,
  KeyLabel,
  Preset,
  PuzzleApi,
} from './engine/types'
import { docHref, useLang, useStrings } from './i18n'
import { showGallery } from './view'
import { toggleArrows, useArrows } from './useArrows'
import { useHelp } from './useHelp'
import { HoldTip, useHoldTip } from './useHoldTip'
import { useResolvedTheme } from './useTheme'
import { usePuzzleFit } from './usePuzzleFit'
import { usePuzzlePointer } from './usePuzzlePointer'

/** Stands for "we could not start it", which is the one error we word. */
const START_FAILED = '\0start'

/**
 * What the back end calls the parameters when it lists them among the presets:
 * anything negative, where a real preset carries its index. Asking for it is
 * asking for the config box rather than for a game.
 */
const CUSTOM_PRESET = -1

/**
 * The keys the page forwards to the board on the board's behalf.
 *
 * They are the back end's own shortcuts, not ours — `one_key_shortcuts` in
 * midend.c, offered to the reader as "Keyboard shortcuts without Ctrl" — and
 * what they do, including whether they do anything at all, is its answer to
 * give. This list exists only to say which keys are worth asking it about.
 */
const SHORTCUT_KEYS = /^[urn]$/i

/**
 * The keys the page answers instead of forwarding, by the action they carry.
 *
 * Each takes the save file and gives back one with the moves appended, or null
 * for "nothing to do". They point in three directions on purpose — `possible`
 * writes marks from the values, `single` writes values from the marks, `blank`
 * takes the marks off — so no one of them can feed itself. See engine/marks.
 */
const ACTIONS: Record<KeyAction, (save: string) => string | null> = {
  possible: fillMarks,
  single: placeSingles,
  blank: clearMarks,
}

/** DOM_KEY_LOCATION_NUMPAD, which is how emcc.c is told to set MOD_NUM_KEYPAD. */
const NUMPAD = 3

/**
 * The four arrow keys, in the order they are written into the block: the top of
 * the cross first, then the row under it left to right.
 *
 * The name is what goes across the boundary, not the code: emcc.c reads the
 * `key` string and matches "ArrowUp" and its three neighbours by name before it
 * ever looks at a key code, so these reach `midend_process_key` as CURSOR_UP
 * and the rest exactly as a real keyboard's would. Nothing about the press
 * being made with a thumb is visible on the far side.
 */
const ARROWS = [
  { dir: 'up', key: 'ArrowUp', where: 0, icon: 'arrowUp', shove: 'pushUp' },
  { dir: 'left', key: 'ArrowLeft', where: 0, icon: 'arrowLeft', shove: 'pushLeft' },
  { dir: 'down', key: 'ArrowDown', where: 0, icon: 'arrowDown', shove: 'pushDown' },
  { dir: 'right', key: 'ArrowRight', where: 0, icon: 'arrowRight', shove: 'pushRight' },
] as const

/**
 * And the four corners, for the puzzle that has somewhere to go in them.
 *
 * These have no key of their own to be named by. Upstream reads them as digits
 * carrying `MOD_NUM_KEYPAD` — the corners of a numeric keypad, which is where
 * they sit under a hand — so what goes across is the digit and the claim that
 * it came from the keypad, which is what `where` is. A plain `7` would be the
 * digit seven and would mean nothing to Inertia at all.
 *
 * The digits are the keypad's own geometry and not a code: 7 is up and left of
 * 5, and it is up and left that it means.
 */
const DIAGONALS = [
  { dir: 'upLeft', key: '7', where: NUMPAD, icon: 'arrowUpLeft' },
  { dir: 'upRight', key: '9', where: NUMPAD, icon: 'arrowUpRight' },
  { dir: 'downLeft', key: '1', where: NUMPAD, icon: 'arrowDownLeft' },
  { dir: 'downRight', key: '3', where: NUMPAD, icon: 'arrowDownRight' },
] as const

/**
 * What the stylesheet calls each cursor key, by where it sits in the list.
 *
 * Positions rather than names, because where they go is a layout question and
 * two puzzles can spend the same position on different jobs.
 *
 * The fourth arrived and cost no row. Three keys already push the cross down to
 * the bottom two lines, which leaves the cells either side of the up arrow
 * empty — and the fourth is Pattern's stroke mode, a thing that changes what
 * the cross does, so standing inside the cross is where it belongs rather than
 * where it fits. See `[data-keys='4']` in index.css.
 */
const ACT = ['first', 'second', 'third', 'fourth'] as const

/** Enough of a set of controls to tell whether anything in it was changed. */
const values = (controls: readonly DialogControl[]) =>
  JSON.stringify(controls.map((c) => c.value))

/** Shared, so that "this puzzle paints no keys" is one object and not forty. */
const NO_SWATCHES: ReadonlyMap<number, string> = new Map()

/**
 * Which of the two configurations a sheet is showing without a dialog: the
 * parameters, in the type sheet, or the preferences, in the menu.
 */
type InlineKind = 'custom' | 'prefs'
type Inline = { kind: InlineKind; spec: DialogSpec }

/** Ask the back end to open one. It has one config box; this says which. */
const ask = (api: PuzzleApi, kind: InlineKind) =>
  kind === 'custom' ? api.selectPreset(CUSTOM_PRESET) : api.preferences()

/** The two addresses a position has, each of which can be typed as well as read. */
type TextKind = 'desc' | 'seed'

/**
 * A puzzle, hosted entirely by React.
 *
 * The screen is laid out for the board's benefit: one line of bar above, the
 * two controls worth reaching for below, and the board taking everything left
 * over. Everything else lives in a sheet that covers the board only while it
 * is open, so none of it costs the puzzle any room.
 *
 * What sits on the bottom row is a judgement about frequency, not importance.
 * Undo is pressed constantly. New game is pressed once a sitting and throws
 * the position away if hit by mistake, so it is behind the menu.
 */
export default function PuzzleHost({
  name,
  title,
  objective,
}: {
  name: string
  title: string
  objective: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<PuzzleApi | null>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)
  const startedRef = useRef(false)
  /** Whether the latest run of the start effect is still in force. */
  const effectAlive = useRef(false)
  /** Whether the running back end still has a host to report to. */
  const liveRef = useRef(true)

  const [status, setStatus] = useState<string | null>(null)
  const [presets, setPresets] = useState<Preset[] | null>(null)
  const [selected, setSelected] = useState(0)
  /**
   * Which preset the puzzle is set to before anybody chooses — upstream's
   * `default_params()`, as an index into the list.
   *
   * Worth showing because it is not guessable: on twenty of the forty it is not
   * the first chip in the list, and emcc.c says as much where it makes the
   * menu ("in case it isn't the first one in the list (e.g. Slant)"). Keen
   * opens on the fifth of eleven, Dominosa on the seventh of thirteen.
   *
   * The back end is not asked for it, because it answers unprompted: emcc.c
   * calls select_appropriate_preset() once while it is building the menu, and
   * only then does anything else touch the parameters — a save being restored,
   * a preset being picked. So the first index the back end ever reports is the
   * one it started on, and every one after it is somebody's choice. First wins,
   * which is what the `??` below is.
   *
   * Null while nothing has been reported. Not -1: that is a real answer,
   * meaning the parameters match no preset at all, and a puzzle whose defaults
   * are custom should mark nothing rather than mark the "Custom…" chip.
   */
  const [standard, setStandard] = useState<number | null>(null)
  const [canSolve, setCanSolve] = useState(true)
  const [undoRedo, setUndoRedo] = useState({ undo: false, redo: false })
  /**
   * And what the two cursor keys would do, from the same notice. Only the
   * buttons beside the arrows read it, to stand down when there is nothing
   * where the cursor is for them to do — see doesNothing.
   *
   * Empty to begin with, which is the right answer rather than a placeholder:
   * every puzzle reports both keys during start-up, and the ones that report
   * nothing are the ones whose cursor has not been woken yet.
   */
  const [labels, setLabels] = useState<KeyLabels>({ enter: '', space: '' })
  /**
   * Whether the cursor is on screen — for the six puzzles whose labels do not
   * say, and only for them. See CURSOR_LIFE, which is where the rules live and
   * where the case for keeping a copy of anything is argued. Six games need it,
   * but this is one boolean rather than six: only one puzzle runs at a time,
   * and the other thirty-three simply never read it.
   *
   * The only value in this file the back end does not hand us. It is a single
   * bit and it is not the position: where the cursor is stays unreachable.
   */
  const [awake, setAwake] = useState(false)
  /**
   * And which key opened Rectangles' drag, for the one state where its two keys
   * report the same word and the pair needs them apart. See `opener`, which
   * corrects this from the labels the moment they can say.
   */
  const [opened, setOpened] = useState<string | null>(null)
  /*
   * The same two words again, in a ref, because one caller cannot wait for a
   * render: the arrow that has just walked Sixteen's cursor off the board needs
   * undoing in the same turn, and `post_move` has already reported the new
   * labels by the time `api.key` returns while React has not rendered anything.
   * Measured — the button's `disabled` attribute is still the old one at that
   * instant. Written in the same breath as the state, never separately.
   */
  const labelsRef = useRef<KeyLabels>({ enter: '', space: '' })
  const [dialog, setDialog] = useState<DialogSpec | null>(null)
  const [permalink, setPermalink] = useState<{ desc: string; seed: string | null }>()
  /**
   * The preferences, as the back end last described them. Only the keypad
   * reads them, and only one puzzle's keypad does — see READS_PREFS.
   */
  const [prefs, setPrefs] = useState<readonly DialogControl[]>([])
  /*
   * Whether this puzzle is showing the four arrows, and whether it is even
   * allowed to be asked. Null for Loopy, which reads no cursor key — see
   * `offersArrows` — Loopy, which reads no cursor key, and Guess, whose keyboard
   * is the keypad alone. Everywhere else it is the reader's own answer, off
   * until they say otherwise.
   */
  const chosen = useArrows()
  const arrows = offersArrows(name) ? chosen.has(name) : null
  /*
   * Where Map's cursor is, which is the one thing its palette needs and the one
   * thing no save file can say — `encode_ui` is NULL there (map.c:3347). Null
   * for the other thirty-nine.
   *
   * A copy rather than a reading, and it survives because so little disturbs it:
   * only the arrows move it, a press on the board hides it without moving it,
   * and undo and redo never reach the ui at all. It is put back to the origin
   * whenever the back end says it rebuilt the ui — see `onPermalinks` — which is
   * every press of a swatch, so drift cannot build up across presses. See
   * engine/map.
   */
  const spot = useRef<Spot>({ x: 0, y: 0 })
  /*
   * And how much of the row being built the reader has typed, for the one
   * puzzle whose keypad is a line of characters: Guess's write head, `peg_cur`,
   * which the back end will not report either — `encode_ui` writes the row and
   * the holds and not the head.
   *
   * A number rather than a mirror of anything, and it only has to answer one
   * question: how many times the backspace may step. It is set back to zero by
   * everything that starts a fresh row — a guess submitted, a game dealt, an
   * undo or a redo, and any press on the board, since all of them rebuild
   * `ui->curr_pegs` out of the holds (guess.c:525-535). So it cannot drift
   * further than one row, and a row is as long as four presses.
   */
  const [typed, setTyped] = useState(0)
  /*
   * Whether Map's palette is offering maybes rather than colours.
   *
   * A modifier and not a mode: the first colour pressed spends it. The board
   * draws a stipple as a scatter of dots (map.c:2872), so while this is on the
   * swatches wear the dots and say so — see `asMaybes`, and `arms` on
   * CursorKey, which is the button that sets it.
   */
  const [maybe, setMaybe] = useState(false)
  /*
   * The stroke mode, and which key it is painting with — Pattern's, and see
   * `sweeps` and `brush` on CursorKey.
   *
   * A mode where the one above is a modifier, and the difference is what each
   * is for: Map's arms the *next* press, this one arms every arrow until it is
   * turned off, because painting a run means walking without stopping to rearm.
   *
   * The colour is the slot number of a key with a `brush`, so pressing a colour
   * chooses it. Zero rather than "none": the mode has to be painting something
   * the moment it is on, and Pattern's first key is black, which is the colour
   * a run is nearly always made of.
   */
  const [sweeping, setSweeping] = useState(false)
  const [brush, setBrush] = useState(0)
  const acts = useMemo(() => cursorKeys(name, prefs), [name, prefs])
  const grid = useMemo(
    () => (name === 'map' && permalink ? mapSize(permalink.desc.split(':')[0]) : null),
    [name, permalink],
  )
  /**
   * How many of each value are still to be placed, for the keys to say so.
   *
   * Worked out from the save, which is the only place the board can be read
   * from — so it costs a serialise and a replay per move, and is null for every
   * puzzle whose board this side cannot read, which is most of them. See
   * engine/marks.
   */
  const [left, setLeft] = useState<Map<number, number> | null>(null)
  /**
   * And which of the four arrows would move Cube's solid, for the one puzzle
   * where an arrow can be dead without the board saying so — see engine/cube.
   *
   * Null means "do not answer", which is what every other puzzle gets and what
   * this one got before: all four live. It is not the empty set, which would
   * mean the solid is stuck and cannot be.
   */
  const [rolling, setRolls] = useState<Set<string> | null>(null)
  // A message from the back end, or the sentinel for the one failure that is
  // ours to describe. Kept as a sentinel rather than as the sentence itself so
  // that it is still in the reader's language if they change it afterwards.
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  /** Whether this puzzle is still saying what it is. See Introduction. */
  const [intro, setIntro] = useState(false)

  /*
   * A configuration laid out inside a sheet rather than put in a dialog of
   * its own. The back end has exactly one config box and offers all of them
   * the same way — Game ID, the parameters, the preferences — so what tells
   * them apart is only that we asked for this one, and which sheet did the
   * asking. Hence the pending tag, set immediately before asking.
   *
   * One at a time, which is not a limitation: the two sheets that show one
   * are mutually exclusive, and opening either closes the other.
   *
   * Mirrored in refs because the callbacks that read them were handed to the
   * back end once, at startup, and close over nothing that re-renders.
   */
  const [inline, setInline] = useState<Inline | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const inlinePending = useRef<InlineKind | null>(null)
  const inlineRef = useRef<Inline | null>(null)
  /** What the fields said when they last came from the back end. */
  const inlineBaseline = useRef('')

  /*
   * The game id and the seed are config boxes too, but there is nothing in
   * them worth showing: one field, whose value we already have from the
   * permalinks. So the box is borrowed rather than displayed — opened, filled
   * in, answered, all inside one call — and this is where what it says on the
   * way past is caught.
   */
  const borrowed = useRef<{ spec: DialogSpec | null; error: string | null } | null>(null)
  const [textError, setTextError] = useState<{ kind: TextKind; message: string } | null>(null)

  const help = useHelp(name)
  const theme = useResolvedTheme()
  const t = useStrings()
  const [lang] = useLang()
  // Read inside the start-up effect without making it a dependency: the puzzle
  // is created once, and the theme it is created with has to be the one in
  // force at that moment.
  const themeRef = useRef(theme)
  themeRef.current = theme

  /*
   * Progress, kept as it is made.
   *
   * The midend announces every change of state through post_move — each move,
   * each undo, each redo, each new deal — so that one callback is where the
   * game is serialised and put away. Writes from one gesture coalesce into a
   * microtask.
   *
   * Armed by the reader touching anything, and not before: the opening deal
   * and the restore that may follow it happen without a hand on the screen, and
   * nothing about them is worth writing down — the deal because it is not
   * progress, the restore because it is what was already there.
   *
   * What comes back out of the store is a separate judgement, made where the
   * save is restored: a saved board nobody moved in is dealt over.
   */
  const armed = useRef(false)
  const restoring = useRef(false)
  const savePending = useRef(false)
  /*
   * The reader has asked for something. Two things follow from that, and this
   * is every place either of them is true, so they are said once.
   *
   * The save arms, as above. And whatever the back end last refused stops
   * being on the screen: that sentence is about the press before this one, and
   * it went out of date the moment there was another. It used to have no way
   * of going at all — `setError` was only ever called with a message — so a
   * "Game has not been started yet" from Solve sat under the title bar for the
   * rest of the session, through the click that started the game and through
   * the Solve that then worked.
   *
   * Cleared here, on the way in, rather than when the next thing succeeds: for
   * Solve the back end reports the refusal and *then* announces the move
   * (emcc.c case 9 calls js_error_box before post_move), so a rule that
   * cleared on the announcement would wipe the message in the same tick it
   * arrived, and it would never be seen at all.
   */
  const acted = useCallback(() => {
    armed.current = true
    setError(null)
  }, [])

  /*
   * And it leaves on its own if nothing else moves it.
   *
   * The rule above — gone at the next press — is the right one and is not
   * enough by itself: a reader who reads the sentence, understands it and then
   * sits still has a red bar over their board until they touch something. This
   * is a remark, not a state, and three seconds is what it gets: long enough
   * for the longest of them — "Multiple solutions exist for this puzzle" — and
   * short enough not to become furniture. Keyed on the text, so a second
   * refusal of the same kind restarts the count rather than inheriting what was
   * left of the first one's.
   */
  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), 3000)
    return () => window.clearTimeout(timer)
  }, [error])

  const queueSave = useCallback(() => {
    if (!armed.current || savePending.current) return
    savePending.current = true
    queueMicrotask(() => {
      savePending.current = false
      const api = apiRef.current
      if (api) writeSave(name, api.saveGame())
    })
  }, [name])

  /*
   * And what the keys should say, from the same notice.
   *
   * Not coalesced the way the save is, and not armed either: this is on screen
   * rather than on disk, so it has to be right before the reader has touched
   * anything — a board restored mid-game opens with its counts already made —
   * and it has to be right after every single change rather than once per
   * gesture. It is a read of the save either way, so a gesture that moves twice
   * pays for both.
   */
  const countLeft = useCallback(() => {
    const api = apiRef.current
    setLeft(api ? remaining(api.saveGame()) : null)
  }, [])

  /*
   * And which arrows Cube's solid could roll along, from the same notice and
   * for the same reason: it has to be right before the reader has pressed
   * anything, because the first press is exactly where a control that ignores
   * a third of them does its damage.
   *
   * Null everywhere else, and null here too for a board this side cannot read —
   * see rolls(), where refusing means leaving all four live. Reading the save
   * on every change is what the two above already do; this is a third read of
   * the same string.
   */
  const readRolls = useCallback(() => {
    const api = apiRef.current
    setRolls(name === 'cube' && api ? rolls(api.saveGame()) : null)
  }, [name])

  /*
   * This is now the game to come back to, from the moment it is opened — and
   * the one the gallery marks, which is the same fact stored once. What the
   * gallery drops on arrival is the flag beside it, not the name.
   *
   * The name goes first. Either write can fail on its own — a full store, a
   * blocked one — and the half that leaves the flag set with no name to go with
   * it is the half that would strand a cold start; this order fails the other
   * way, to the gallery.
   */
  useEffect(() => {
    writeRecent(name)
    setPlaying(true)
  }, [name])

  /*
   * A puzzle you have not met before says what it is, once. See Introduction.
   *
   * After `ready` rather than on mount: it floats over the board area, and
   * putting it over a rectangle that has not been dealt into yet would be a
   * sentence about nothing.
   */
  useEffect(() => {
    if (ready && owesIntroduction(name)) setIntro(true)
  }, [ready, name])

  useEffect(() => {
    /*
     * No teardown exists for the wasm, and StrictMode runs this effect,
     * its cleanup, and the effect again, synchronously, in development.
     * The guard keeps the second run from starting a second back end —
     * but the cleanup in between must not kill the first one, or the
     * puzzle that finally finishes loading reports to a host that has
     * written it off and the board stays hidden forever. So the effect
     * marks itself alive, and the cleanup passes sentence from a
     * microtask: a real unmount has no next run to overturn it.
     */
    effectAlive.current = true
    liveRef.current = true
    if (startedRef.current) return
    startedRef.current = true

    const canvas = canvasRef.current
    const area = areaRef.current
    if (!canvas || !area) return

    /*
     * Nothing in the address names a position, and nothing here reads one out
     * of it: there is one address and it is `/`, so anything found there would
     * be a leftover rather than an instruction. Opening a position from
     * outside would be its own piece of work — an address that means a board,
     * and a screen to arrive on — and none of it exists; see view.ts.
     */
    const saved = readSave(name)
    /*
     * Whether the save above went in. A stale one is refused whole and cleared
     * below, and there is then nothing of the reader's to deal over.
     */
    let restored = true

    createPuzzle({
      name,
      canvas,
      // No room stated, so the first board the back end lays out is the one it
      // would have chosen on its own. usePuzzleFit takes it from there, and
      // whichever frame lands first is a board at a size the game asked for —
      // handing over the whole area instead would flash a full-window board
      // for the frame before the cap is worked out.
      dark: themeRef.current === 'dark',
      callbacks: {
        onReady(list, api) {
          apiRef.current = api
          if (!liveRef.current) return api.stopTimer()
          // A handle on the running puzzle, for the icon build and the
          // browser tests: both need to drive a puzzle from outside React.
          window.__puzzle = api
          if (saved) {
            // Picking up where the reader left off, over the deal the back
            // end just made. Deserialising is atomic — a refused save
            // changes nothing — and what it says on refusal is swallowed
            // below, because "your old save was stale" is not worth a
            // banner over a perfectly good new game.
            restoring.current = true
            try {
              api.loadGame(saved)
            } finally {
              restoring.current = false
            }
            /*
             * And if there was nothing in it, deal over the top of it.
             *
             * A save with one state is a board nobody moved in — dealt, and
             * then left. Restoring it means coming back to the same untouched
             * puzzle, which is not what leaving an untouched puzzle feels like
             * it should do, and is not what the app does when there is no save
             * at all: a puzzle opened for the first time deals afresh on every
             * visit. The same board in a puzzle played once before came back
             * exactly as it was, because dealing a new game had armed the save
             * and written the fresh board over the old one. One question,
             * answered two ways, depending on a thing the reader cannot see.
             *
             * It is loaded first and dealt over rather than simply discarded,
             * because the position is not all it carries. The size and the
             * difficulty are in there too, and they are the reader's answer to
             * a different question — throwing the save away sent somebody who
             * had chosen 9x9 back to a 5x5, which is a worse bug than the one
             * being fixed. So the parameters survive and the board does not.
             */
            if (restored && !isPlayed(saved)) api.newGame()
          }
          setPresets(list)
          setReady(true)
          /*
           * And once, here, because the opening deal's own post_move has
           * already been and gone: emcc.c's main() calls it at the end of
           * start-up, which is before this callback runs and therefore before
           * there is an api to read the board through. Without this a board
           * opens with no counts on its keys and gains them on the first
           * press, which is exactly the state a reader would not think to
           * press their way out of.
           */
          countLeft()
          readRolls()
        },
        onError: (message) => {
          if (restoring.current) {
            restored = false
            clearSave(name)
            console.warn(`discarded a stale save for ${name}:`, message)
            return
          }
          // A refused value belongs against the field that was refused, not
          // under the title bar behind the sheet showing it.
          if (borrowed.current) borrowed.current.error = message
          else if (inlineRef.current) setInlineError(message)
          else setError(message)
        },
        onStatus: setStatus,
        onUndoRedo: (undo, redo) => {
          setUndoRedo({ undo, redo })
          // post_move: the one notice the midend gives after every change.
          // emcc.c calls it from the opening deal, every move, undo, redo, new
          // game and load — so nothing else has to be hooked for either of
          // these to stay current.
          queueSave()
          countLeft()
          readRolls()
        },
        // Both keys, every move, named in the order emcc.c asks for them:
        // CURSOR_SELECT2 first. Turned round here so that the rest of this file
        // can say `enter` and `space` and mean the keys the buttons send.
        onKeyLabels: (space, enter) => {
          labelsRef.current = { enter, space }
          setOpened((was) => opener(name, { enter, space }, was))
          setLabels({ enter, space })
        },
        onPermalinks: (desc, seed) => {
          setPermalink({ desc, seed })
          queueSave()
          /*
           * And the cursor is gone, for the puzzle that keeps one here.
           *
           * This is the back end announcing that it rebuilt its `game_ui`, not
           * us listing the ways to make it: `game_id_change_notify` fires from
           * `midend_new_game` (midend.c:664) and `midend_deserialise` (2722),
           * which are the only two places `new_ui` runs, and both are five
           * lines from it. So a new game, a preset, a typed game id or seed, a
           * restored save and the marks keys are all covered by one line, and
           * an eighth way to deal a board would be too.
           *
           * `midend_supersede_game_desc` fires it as well and does not rebuild
           * the ui — Mines' first click. Harmless twice over: that press has
           * already put the cursor away, and Mines keeps none here.
           */
          setAwake(false)
          // And with it Map's cursor, which lives in that same rebuilt ui. This
          // is what keeps the copy from drifting: every press of a swatch goes
          // through the save file and so comes back through here, so the copy is
          // re-anchored at the origin as often as it is used. See engine/map.
          spot.current = { x: 0, y: 0 }
          // Guess's write head is in there too, and a dealt board is a fresh row.
          setTyped(0)
        },
        onPresetSelected: (index) => {
          setStandard((first) => first ?? index)
          setSelected(index)
        },
        onSolveRemoved: () => setCanSolve(false),
        onDialog: (spec) => {
          // Borrowed: answered before this call returns, so it never reaches
          // React at all.
          if (spec && borrowed.current) {
            borrowed.current.spec = spec
            return
          }
          const kind = inlinePending.current
          if (spec && kind) {
            inlinePending.current = null
            inlineRef.current = { kind, spec }
            inlineBaseline.current = values(spec.controls)
            setInlineError(null)
            setInline({ kind, spec })
            // Free of charge, and the newest word there is: a settled field
            // is enacted at once (commitInline), and the box the back end
            // then hands back is the one being described here.
            if (kind === 'prefs') setPrefs(spec.controls)
            return
          }
          // Closing, and it was ours: the back end has finished with it,
          // whether it was accepted or cancelled.
          if (!spec && inlineRef.current) {
            inlineRef.current = null
            setInlineError(null)
            setInline(null)
            return
          }
          setDialog(spec)
        },
        onTimer: (running) => {
          window.__animating = running
        },
      },
    })
      .then(({ renderer }) => {
        rendererRef.current = renderer
      })
      .catch((err) => {
        if (!liveRef.current) return
        console.error(`could not start ${name}`, err)
        setError(START_FAILED)
      })

    return () => {
      effectAlive.current = false
      queueMicrotask(() => {
        // Resurrected by StrictMode's immediate re-run; nothing was unmounted.
        if (effectAlive.current) return
        liveRef.current = false
        apiRef.current?.stopTimer()
        delete window.__puzzle
      })
    }
  }, [name])

  /*
   * What the keypad should be, from the two things that decide it.
   *
   * The game id, mostly: it is where the grid size lives, and the back end
   * reissues it whenever the preset changes, so a 4x4 Solo grows its keypad by
   * arriving. And, for the one puzzle that draws its pieces two ways, the
   * preferences — see READS_PREFS in keys.ts.
   */
  const keys = useMemo(() => {
    const all = permalink ? keysFor(name, decodeURIComponent(permalink.desc), prefs) : []
    // And, on the one puzzle whose keys have no other way to be aimed, whether
    // the arrows are out. Each key says for itself whether it needs them — see
    // `aimed` in engine/types, and keysFollowArrows for why the list is one name.
    const shown = keysFollowArrows(name) && !arrows ? all.filter((k) => !k.aimed) : all
    return maybe ? asMaybes(shown) : shown
  }, [arrows, maybe, name, permalink, prefs])

  // The parameters, which is the part of the game id before the colon: a new
  // grid is a new natural size, and nothing else about the id changes it.
  usePuzzleFit(
    areaRef,
    apiRef,
    rendererRef,
    ready,
    permalink?.desc.split(':')[0] ?? '',
  )
  const pointer = usePuzzlePointer(apiRef, rendererRef, HOLD_BUTTON[name])

  /*
   * Turn the board over with the rest of the page. The back end is not
   * involved and does not need to be: the palette is rewritten on our side,
   * and a resize to the size it already is makes the midend redraw everything
   * through it. The position, the timer and the undo history are untouched.
   */
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || !ready) return
    // The board was created the right way up; this is only for changing it.
    if (!renderer.setDark(theme === 'dark')) return
    // `rescale` and not `resize`: resize_puzzle only redraws when the size it
    // works out differs from the one already set, and here it will not.
    apiRef.current?.rescale()
  }, [theme, ready])

  /*
   * The board colours the keypad is painting keys out of — Guess's pegs, and
   * nothing else so far. See `slot` on KeyLabel.
   *
   * An effect rather than a memo, and written after the one above rather than
   * before it, both for the same reason: on a theme change it is that effect
   * that turns the renderer's table over. Memos run during render and effects
   * after it, in the order they are declared, so this is the first moment the
   * new colours exist. As a memo it would have painted the last theme's pegs
   * and had no reason to run again.
   */
  const [swatches, setSwatches] = useState<ReadonlyMap<number, string>>(NO_SWATCHES)
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || !ready) return
    const next = new Map<number, string>()
    for (const key of keys)
      for (const slot of [key.slot, key.ink]) {
        if (slot === undefined) continue
        const css = renderer.colour(slot)
        if (css) next.set(slot, css)
      }
    // Thirty-nine puzzles ask for none, and handing them a fresh empty map
    // every time the keypad changes would be a second render for nothing.
    setSwatches((was) => (was.size === 0 && next.size === 0 ? was : next))
  }, [keys, theme, ready])

  /** A dialog is modal to the game; the C side is waiting for its answer. */
  const act = useCallback(
    (fn: (api: PuzzleApi) => void) => {
      if (!apiRef.current || dialog) return
      acted()
      fn(apiRef.current)
      // Everything that comes through here changes the position — undo, redo, a
      // preset, restart, solve — and Guess rebuilds the row being typed out of
      // the holds whenever it does (guess.c:525-535). So the count of what has
      // been typed goes with it. See `typed`.
      setTyped(0)
      canvasRef.current?.focus()
    },
    [dialog, acted],
  )

  /*
   * Asking for one starts a config box that will sit there until it is
   * answered, so every way out of the fields has to answer it: closing the
   * sheet, choosing something else, or reaching for anything else the back
   * end does.
   */
  const openInline = useCallback(
    (kind: InlineKind) => {
      const api = apiRef.current
      if (!api || dialog || inlineRef.current) return
      inlinePending.current = kind
      ask(api, kind)
    },
    [dialog],
  )

  /** Answers the config box without taking its values. */
  const closeInline = useCallback(() => {
    apiRef.current?.dialogCancel()
  }, [])

  /*
   * A settled value takes effect there and then.
   *
   * Nothing is sent unless something was actually changed: leaving a field
   * you only looked at would otherwise deal a fresh puzzle for nothing, and
   * so would tabbing through them.
   *
   * The back end closes its config box when it accepts, which would take the
   * fields off the screen mid-edit, so a new one is asked for immediately.
   * Both happen in this one call, so React sees only the second: the fields
   * never blink, and the caret stays where it was.
   */
  const commitInline = useCallback(() => {
    const api = apiRef.current
    const open = inlineRef.current
    if (!api || !open) return
    if (values(open.spec.controls) === inlineBaseline.current) return
    acted()
    setInlineError(null)
    api.dialogOk()
    if (!inlineRef.current) {
      inlinePending.current = open.kind
      ask(api, open.kind)
    }
  }, [])

  /*
   * Hand the back end a game id or a random seed.
   *
   * It will only take one through a config box, and it has one box, which the
   * menu is already using for the preferences. So: put those away, borrow the
   * box, fill it in, answer it, and put the preferences back — all before
   * this returns, so nothing of it is ever on screen.
   */
  const submitText = useCallback((kind: TextKind, text: string) => {
    const api = apiRef.current
    if (!api) return
    acted()
    const resume = inlineRef.current?.kind ?? null
    if (resume) api.dialogCancel()

    borrowed.current = { spec: null, error: null }
    if (kind === 'desc') api.enterGameId()
    else api.enterSeed()
    const { spec } = borrowed.current
    if (spec) {
      spec.controls[0].value = text
      api.dialogOk()
      // Refused, so the box is still open and still has to be answered.
      if (borrowed.current.error) api.dialogCancel()
    }
    const message = borrowed.current.error
    borrowed.current = null
    setTextError(message ? { kind, message } : null)

    if (resume) {
      inlinePending.current = resume
      ask(api, resume)
    }
  }, [])

  /*
   * Go and see what the preferences say.
   *
   * Nothing announces one changing. The back end describes its config box only
   * when the box is asked for, and undead.c's `a` key turns its own setting
   * over without going near the box at all — no save, no callback, just a
   * different-looking grid. So the box is borrowed for a look, the same way the
   * game id is, and this one is only a look: cfg_end(false) in emcc.c frees the
   * config and reselects the preset, and the game is left exactly where it was.
   *
   * Not while a dialog or a sheet has the box, which is the same one box.
   */
  const readPrefs = useCallback(() => {
    const api = apiRef.current
    if (!api || dialog || inlineRef.current) return
    borrowed.current = { spec: null, error: null }
    api.preferences()
    const { spec } = borrowed.current
    if (spec) api.dialogCancel()
    borrowed.current = null
    // Nothing moved is the usual answer — this runs after every press — and
    // handing back the same array is what keeps the keypad from being worked
    // out again, and the screen from being drawn again, for nothing.
    if (spec)
      setPrefs((was) => (values(was) === values(spec.controls) ? was : spec.controls))
  }, [dialog])

  // Once the puzzle is running, for the reader who set this a month ago: the
  // back end restored their preferences from localStorage before it started.
  useEffect(() => {
    if (ready && READS_PREFS.has(name)) readPrefs()
  }, [ready, name, readPrefs])

  const closeTypes = useCallback(() => {
    if (inlineRef.current) apiRef.current?.dialogCancel()
    setTypesOpen(false)
  }, [])

  const closeMenu = useCallback(() => {
    if (inlineRef.current) apiRef.current?.dialogCancel()
    setMenuOpen(false)
  }, [])

  // Stable, because Dialog listens for Escape on it and a fresh function every
  // render would mean tearing that listener down and putting it back up again.
  const closeHelp = useCallback(() => setHelpOpen(false), [])

  // What the four glyphs along the foot of the board are called, on a hold.
  const { tip, holdToAsk, wasHeld } = useHoldTip()

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api) return
    acted()
    // Unmodified, because Net's arrows carry the origin and the source under
    // Shift and Ctrl and leave the cursor where it was. See CURSOR_LIFE.
    const plain = !e.shiftKey && !e.ctrlKey
    if (plain && wakesCursor(name, e.key)) setAwake(true)
    if (plain && opens(name, e.key, labelsRef.current)) setOpened(e.key)
    // And the copy of Map's cursor follows a physical arrow as readily as one of
    // ours: this is the only other place a key reaches the back end.
    if (grid && plain) spot.current = stepCursor(spot.current, e.key, grid)
    /*
     * Guess's write head does too. A reader with a keyboard has real arrows and
     * no need of our backspace, but the count must not be left saying something
     * false if they use both — and the arithmetic is upstream's own: Left and
     * Right move the head (guess.c:925) and a digit places and moves it on
     * (946). Nothing is capped up here; `advances` does that on the way in, and
     * a count that has run past the row only means one wasted press.
     */
    if (plain && heads(name)) {
      if (e.key === 'ArrowLeft') setTyped((n) => Math.max(n - 1, 0))
      else if (e.key === 'ArrowRight' || /^[0-9]$/.test(e.key)) setTyped((n) => n + 1)
    }
    if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
      e.preventDefault()
    // Some of what the board takes changes a preference — undead's `a` — and
    // it says nothing when it does, so a puzzle whose keypad follows one is
    // asked again after every press. Which key it was is undead.c's business,
    // not ours, and asking is cheap: one config box, built and freed.
    if (READS_PREFS.has(name)) readPrefs()
  }, [acted, grid, name, readPrefs])

  // Shortcuts on the page rather than the board, so they work wherever focus
  // is. Skipped while a dialog is up or a field has focus.
  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Escape dismisses whatever is on top, wherever focus is — including a
      // control inside the sheet, which is where it will be after a preset.
      // The dialogs answer it themselves (see Dialog); these are the sheets,
      // which are not dialogs and have no such component to inherit it from.
      if (e.key === 'Escape') {
        // Not a layer of its own: the parameters are part of the sheet, so
        // the sheet is what closes, and closing it answers the config box.
        if (typesOpen) closeTypes()
        else if (menuOpen) closeMenu()
        else return
        e.preventDefault()
        return
      }
      if (dialog || helpOpen || typesOpen) return
      /*
       * The board had it first and spent it. Undo, redo and new game are the
       * back end's own one-key shortcuts, so with the board focused the press
       * has already been acted on by the time it reaches the window — and
       * acting on it a second time here is what made one press of `u` undo two
       * moves, one `r` redo two, and one `n` deal two games and show the
       * second. Measured on Net by the midend's own STATEPOS.
       */
      if (e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
      const api = apiRef.current
      if (!api) return
      if (!SHORTCUT_KEYS.test(e.key)) return
      /*
       * Handed over as the keypress it is, rather than run as the action it
       * usually means, so that these three keys say the same thing off the
       * board as on it: nothing, for a reader who has turned the shortcuts
       * off, and a move rather than a shortcut in a game that wants the letter
       * for itself. Calling undo() here would speak over both.
       */
      acted()
      if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
        e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    ready,
    dialog,
    menuOpen,
    typesOpen,
    closeTypes,
    closeMenu,
    helpOpen,
    acted,
  ])

  /*
   * The three keys the back end is not asked about.
   *
   * What a square can still hold is worked out here, and applied by handing the
   * back end a save file with the moves already in it — the only way to give it
   * a move it could not have been gestured into. See engine/marks, which also
   * says why a refusal is silent: it means either that there was nothing to do,
   * or that the board was not one we could read with enough confidence to write
   * to, and there is nothing the reader could do about either.
   *
   * The last move is held back and pressed home with redo(), which is what makes
   * a board finished by a key flash like one finished by hand — see `pending`.
   * Both calls are in this one handler, so the position between them is never
   * rendered and never written down.
   */
  const markAction = useCallback(
    (action: KeyAction) => {
      const api = apiRef.current
      if (!api) return
      const next = ACTIONS[action](api.saveGame())
      if (!next) return
      acted()
      // If the save we just wrote cannot be read back for this, apply it whole:
      // the flash is worth a great deal less than the moves are.
      const held = pending(next)
      api.loadGame(held ?? next)
      if (held) api.redo()
    },
    [acted],
  )

  /*
   * Whether a keypad key is drawn out, which two keys can now be.
   *
   * Both are Guess's and both say the same kind of thing — this key has one job
   * and cannot do it yet — but they read it from different places. The tick
   * takes it from the back end's own word for its Enter key (`needs`); the
   * backspace takes it from the count of what has been typed, because the back
   * end will not say where the write head is. See `behind` and `advances`.
   */
  const dead = useCallback(
    (key: KeyLabel) =>
      (key.needs !== undefined && labels.enter !== key.needs) ||
      (key.behind !== undefined && typed === 0) ||
      // And Map's palette, which acts where the cursor is and so has nothing to
      // act on while the reader cannot see where that is. Same sentence as the
      // key beside the arrows that empties a region.
      (key.paints !== undefined && !awake),
    [awake, labels.enter, typed],
  )

  /*
   * Paint the region the cursor is on, which is the one thing on this screen
   * that is answered here and acts somewhere the reader chose. See engine/map,
   * which does the work and puts the cursor back where it found it.
   *
   * Shared by the palette and by the key beside the arrows that empties a
   * region, because they are the same act with different arguments.
   */
  const paint = useCallback((p: Paint) => {
    const api = apiRef.current
    if (!api || !awake) return
    const at = spot.current
    paintRegion(api, at, p)
    spot.current = at
    setAwake(true)
    // A modifier is spent by the press it modified, whether or not the board
    // took the move: it said what the *next* colour would do, and that was it.
    setMaybe(false)
  }, [awake])

  const pressKey = useCallback((key: KeyLabel) => {
    const api = apiRef.current
    if (!api) return
    if (key.action) {
      markAction(key.action)
      canvasRef.current?.focus()
      return
    }
    acted()
    /*
     * A key that paints a region: Map's palette, and the second thing to go
     * through the save file — see engine/map for why it has to.
     *
     * The wake comes first and is upstream's own answer to a select key pressed
     * on a hidden cursor (map.c:2515): show it, and stop. These act where the
     * cursor is, and acting where the reader cannot see is the fault this shape
     * exists to avoid — Slant's three absolute keys are dimmed for the same
     * reason, and Map's copy of the flag is in CURSOR_LIFE.
     *
     * Then the load, which rebuilds the ui and puts the cursor back at the
     * origin with it (midend.c:2623, and `onPermalinks` below, which is where
     * this side hears about it). So the walk out to where it was is not
     * housekeeping, it is the second half of the press: one clamped arrow to
     * bring it back on screen, then the distance. All of it inside this handler,
     * so the browser composites once and the walk is not seen — the same trade
     * `aims` makes on Guess — and none of it is a move, since `move_cursor`
     * answers MOVE_UI_UPDATE.
     */
    if (key.paints) {
      paint(key.paints)
      canvasRef.current?.focus()
      return
    }
    const send = (sent: string, code = 0) => {
      // A keypad key can show the cursor, on the one puzzle where the two
      // blocks overlap: every one of Guess's keys acts where the cursor is, and
      // even `H` reveals it on the hinter's way past (guess.c:799). Without
      // this the mirror would sleep through a press the back end acted on, and
      // the two keys beside the arrows would sit grey next to a cursor the
      // board is drawing. See CURSOR_LIFE.
      if (wakesCursor(name, sent)) setAwake(true)
      return api.key(code, sent, '', 0, 0, 0)
    }
    /*
     * A key that erases backwards, which is two presses: step, then clear. See
     * `behind` in engine/types for what it means and keys.ts for who asks and
     * for the measurement that made the step unconditional.
     *
     * `typed` is what keeps it from running off the start of the row. Nothing
     * else can: the step clamps silently, so without this the clear would land
     * on the first peg — which after a hold is a peg nobody typed. The key is
     * drawn out at zero as well, so this guard is the same answer said twice
     * rather than a second rule.
     *
     * Sent under the name `Backspace` rather than as its character because the
     * midend folds 8, 127 and `\b` into the same button anyway (midend.c:1261)
     * and the name is what emcc.c matches first.
     */
    if (key.behind) {
      if (typed > 0) {
        send(key.behind.step)
        send('Backspace', 8)
        setTyped((n) => Math.max(n - 1, 0))
      }
      canvasRef.current?.focus()
      return
    }
    /*
     * And a key that aims before it fires: Guess's colours walk the board's own
     * ring onto themselves first, so that the two things naming a chosen colour
     * agree. See `aims` in engine/types for why this can be done without ever
     * reading where the ring is.
     *
     * All of it inside one handler, so the browser composites once and the walk
     * is not seen. None of these presses is a move — `move_cursor` answers
     * MOVE_UI_UPDATE, which the midend redraws without pushing a state — so the
     * undo history is untouched. Measured at 1.7-6.1ms for six colours.
     */
    if (key.aims) {
      for (let i = 0; i < key.aims.span; i++) send(key.aims.home)
      for (let i = 0; i < key.aims.at; i++) send(key.aims.step)
    }
    // Every puzzle that requests keys requests ASCII ones, so the ordinary
    // key path carries them: a one-character string is taken as the button
    // itself.
    send(String.fromCharCode(key.button))
    // And the write head moves on with it, for the one puzzle that keeps a
    // count of where it is. Held to the same ceiling the back end holds it to.
    if (key.advances !== undefined) setTyped((n) => Math.min(n + 1, key.advances!))
    // And a key that ends the row puts it back to nothing.
    if (key.restarts) setTyped(0)
    canvasRef.current?.focus()
  }, [acted, markAction, name, paint, typed])

  /*
   * A key from the block around the arrows, sent as the keypress it is — the
   * four directions, and the one or two beside them that act where the arrows
   * have got to.
   *
   * The focus call is the whole reason this is not just `api.key`. Pressing a
   * button moves focus to that button, and the board reads the keyboard from
   * itself — so without this, one tap on an arrow would leave every *physical*
   * arrow press going to a button that does nothing with it. Giving the board
   * its focus back after each press is what lets the two be used in the same
   * sitting, which on a laptop is exactly how they will be. Preventing the
   * default on mousedown stops the focus leaving in the first place; both,
   * because between them they also cover the case this feature exists for —
   * a board that never had focus, because on a touch device nothing has.
   */
  const sendKey = useCallback(
    (key: string, where = 0, mod?: { shift?: true; ctrl?: true }) => {
      const api = apiRef.current
      if (!api) return
      acted()
      // A modified arrow still moves the cursor — every one of these puzzles
      // calls move_cursor first and paints afterwards — so it wakes like a bare
      // one. What it must not do is open a second level: `opens` is about the
      // select keys, and none of them is ever sent modified.
      if (wakesCursor(name, key)) setAwake(true)
      if (!mod && opens(name, key, labelsRef.current)) setOpened(key)
      if (grid) spot.current = stepCursor(spot.current, key, grid)
      api.key(0, key, '', where, mod?.shift ? 1 : 0, mod?.ctrl ? 1 : 0)
      canvasRef.current?.focus()
    },
    [acted, grid, name],
  )

  /*
   * Tents' two, which are switches: the key goes out as itself, and if the
   * square already held what it sets, the press is taken back and the square
   * emptied. It cannot be decided beforehand — nothing the back end reports
   * tells a tent from grass — so it is decided from the move that was just
   * made. See engine/tents.
   *
   * Its own callback rather than a branch inside `sendKey` because none of what
   * that does applies: this puzzle is not in `CURSOR_LIFE`, has no second level
   * to open, and keeps no cursor copy — the coordinates come out of the engine's
   * own move string instead.
   */
  const toggleSquare = useCallback((key: string) => {
    const api = apiRef.current
    if (!api) return
    acted()
    setOrClear(api, key)
    canvasRef.current?.focus()
  }, [acted])

  /*
   * No cursor to act on, so nothing on this row can act — the arrows are the
   * only thing left that works, since an arrow is the only way to make one.
   *
   * Pattern's, and only Pattern's: for it, both keys reporting nothing means a
   * hidden cursor and can mean nothing else. Every other puzzle already reaches
   * the same place through `wouldSend`; this is here because Pattern's three
   * are `lit`, which was written to keep them through the *idempotent* null and
   * kept them through this one too.
   */
  const asleep = silent(labels)
  /** The stroke mode as it is actually behaving, which needs somewhere to paint. */
  const painting = sweeping && !asleep

  return (
    /* The flag goes here rather than on the row that grows, because two rows
       answer to it: the four buttons pair off into a 2×2 to make room for the
       cross beside them, and in the landscape rail the keys above go from three
       across to six — which is exactly the width the 2×2 and the cross come to
       together. See the arithmetic in index.css. */
    <div className="play" data-ready={ready} data-arrows={arrows ? 'true' : undefined}>
      <header className="play-bar">
        {/* The name is the way to the other thirty-nine, and the only way off
            this screen. There is no back arrow because there is nothing behind
            here: the gallery is the app's other screen, not its parent, so
            this is a place to go rather than a thing to close. It is what you
            would point at to say "not this one", and it costs the bar nothing
            it was not already spending. */}
        <h1>
          <button
            type="button"
            className="play-title"
            onClick={showGallery}
            aria-label={`${title} — ${t.play.switcher}`}
          >
            <span>{title}</span>
            <Icon name="caret" size={18} />
          </button>
        </h1>
        {/* A pill only once there is something in it, so an empty status bar
            leaves no empty box behind. Tabular figures keep a running clock
            from shuffling the text beside it.

            Held to be read in full, on the same popup the buttons below use.
            The pill has to be narrow — it shares the bar with a title and two
            icons — so on a phone the longer things a back end says ("Active:
            4/25", a clock and a count together) reach the ellipsis. A screen
            reader was never short of it: `aria-live` announces the whole
            string, and the truncation is only ever on the glass. Offered
            whenever there is text rather than only when it is actually cut off:
            measuring every render to hide an affordance that costs nothing when
            it is redundant is a bad trade. */}
        <span
          className="play-status"
          data-filled={!!status}
          aria-live="polite"
          {...(status ? holdToAsk(status) : {})}
        >
          {status}
        </span>
        {/* Light and dark, back on this screen after an argument that has
            expired. It came off because the setting had three states and a
            press cannot mean three things, so it went where three could be
            shown. There are two now, so a press is the whole control, and it
            belongs in the two bars a reader is actually looking at rather than
            two taps into a dialog. */}
        <ThemeToggle className="play-icon" />
        <button
          type="button"
          className="play-icon"
          aria-label={t.play.help}
          aria-haspopup="dialog"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen(true)}
        >
          <Icon name="help" />
        </button>
      </header>

      <div className="play-board" ref={areaRef}>
        {/* Over the board rather than above it: a row of its own would take
            that row off the board for as long as the message stood, and this
            one stands for four seconds. Positioned from the top of this area,
            so the gap it keeps from the bar is a gap and not an arithmetic of
            the bar's height and the notch. */}
        {error && (
          <ErrorNote
            floating
            text={error === START_FAILED ? t.play.error : error}
          />
        )}
        {/* The two want the same place, and a refusal is the more urgent of
            them: it answers the press that has just happened, and it leaves on
            its own three seconds later — whereupon this comes back, still
            unread and still waiting to be closed. */}
        {intro && !error && (
          <Introduction
            text={objective}
            onClose={() => {
              // Spent here and not when it appeared: closing it is the only
              // thing that ends it, so it is the only thing that can mean it
              // has been read. See owesIntroduction.
              markIntroduced(name)
              setIntro(false)
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          onPointerDownCapture={() => {
            acted()
            // A press on the board puts the cursor away, wherever it lands —
            // net.c:2172 does it before it checks the press was on the grid.
            setAwake(false)
            // And whatever it does in Guess — drag a peg, mark the guess by
            // pressing the feedback area (guess.c:915) — the row is no longer
            // only what was typed, so the count starts again.
            setTyped(0)
          }}
          className="host-board"
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          {...pointer}
        />
      </div>

      <PuzzleKeypad
        keys={keys}
        left={left}
        swatches={swatches}
        dead={dead}
        onPress={pressKey}
      />

      {/* Four, and each of them a glyph. Undo and Redo are the two arrows
          everything else in the world uses for the same thing; the grid and
          the three lines say the rest. Words here would only push them apart
          and make where each one sits depend on how long they are in the
          reader's language — so the words come on a long press instead, the
          same way the keys above answer the same question. */}
      <nav className="play-actions">
        {/* A group of their own, so the arrows can sit beside them as a second
            one. In a row of four this changes nothing; once there is a cross to
            its right it is what pairs them off two by two, and the order they
            are written in is the order they fill it — undo and redo above, the
            two that open something below. A puzzle whose back end offers no
            presets has no Type, and then the lower row is Menu alone, on the
            left, rather than a gap kept for a button that does not exist. */}
        <div className="play-acts">
          <button
            type="button"
            aria-label={t.play.undo}
            disabled={!undoRedo.undo}
            {...holdToAsk(t.play.undo)}
            onClick={() => {
              if (wasHeld()) return
              act((a) => a.undo())
            }}
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            aria-label={t.play.redo}
            disabled={!undoRedo.redo}
            {...holdToAsk(t.play.redo)}
            onClick={() => {
              if (wasHeld()) return
              act((a) => a.redo())
            }}
          >
            <Icon name="redo" />
          </button>
          {/* Its own way in, beside the menu rather than inside it: how big a
              board you want is asked far more often than anything the menu
              holds, and on some puzzles the list of answers is longer than the
              menu itself. */}
          {presets && (
            <button
              type="button"
              aria-label={t.types.title}
              aria-haspopup="dialog"
              aria-expanded={typesOpen}
              {...holdToAsk(t.types.title)}
              onClick={() => {
                if (wasHeld()) return
                closeMenu()
                setTypesOpen(true)
              }}
            >
              <Icon name="type" />
            </button>
          )}
          {/* The one press in this row the puzzle has never heard of: undo and
              redo are the midend's own, the type list is its parameters, and
              this opens a sheet that is entirely ours. So it takes the filled
              step of the ladder the keypad already climbs — see index.css. */}
          <button
            type="button"
            data-whose="ours"
            aria-label={t.play.menu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            {...holdToAsk(t.play.menu)}
            onClick={() => {
              if (wasHeld()) return
              closeTypes()
              // Whatever the back end said about a typed id was said to a sheet
              // that is no longer up. Opening a fresh one starts clean.
              setTextError(null)
              setMenuOpen(true)
            }}
          >
            <Icon name="menu" />
          </button>
        </div>

        {/*
          The four the puzzle never asks for and almost always takes.

          No hold tip, alone among the buttons on this screen, and that is
          deliberate twice over. An arrow is the one glyph that needs no word —
          it points — so there is nothing a tip would add; and an arrow is also
          the one button here anybody would press by holding it down, which is
          exactly the gesture a tip steals. Held keys still get their name, in
          `aria-label`, where it is read out rather than shown.
        */}
        {arrows && (
          <div
            className="play-arrows"
            /* Three rows instead of two, and the corners filled. Only Inertia
               has anywhere to go in them — see movesEightWays, which is also
               where the puzzle that looks like it should is written down. */
            data-ways={movesEightWays(name) ? '8' : undefined}
            /* And three rows the other way round: a full row of keys with the
               cross under it, for the puzzles whose keys are three or four. */
            data-keys={acts.length >= 3 ? String(acts.length) : undefined}
            role="group"
            aria-label={t.play.arrows.group}
          >
            {[...ARROWS, ...(movesEightWays(name) ? DIAGONALS : [])].map((arrow) => {
              /*
               * What this arrow paints on its way, or nothing.
               *
               * Gated on `painting` rather than the bit, because Pattern's
               * paint branch does not check `cur_visible` itself: with the
               * cursor hidden it would move from wherever it was last left and
               * paint the pair, which is the trap the dimming exists for
               * elsewhere. So while it is hidden the arrows go out bare — the
               * first one wakes the cursor, and the painting comes back with
               * it.
               */
              const stroke = painting ? acts[brush]?.brush : undefined
              // Sixteen's arrows have two jobs, and which one is running is
              // invisible on its board — so they carry it here, glyph and name
              // both. See shovesTiles; nowhere else does this fire.
              const { dir, key, where } = arrow
              // Narrowed to the four rather than tested as a boolean, so the
              // shoving name is looked up under a direction that has one — the
              // diagonals are Inertia's and never shove.
              const shoving =
                'shove' in arrow && shovesTiles(name, labels) ? arrow : null
              const icon = shoving ? shoving.shove : arrow.icon
              return (
              <button
                key={dir}
                type="button"
                data-dir={dir}
                // Upstream's, every one of them: CURSOR_UP and its neighbours
                // are keys the back end has always read and never offered a
                // button for. Same step of the ladder as M, H and J above.
                data-whose="upstream"
                aria-label={shoving ? t.play.arrows.shove[shoving.dir] : t.play.arrows[dir]}
                // Cube's, and no other puzzle's — see engine/cube for the line
                // that keeps it there. A null answer leaves every arrow live,
                // which is what the other thirty-nine get.
                disabled={rolling ? !rolling.has(key) : undefined}
                // Keep focus on the board, the same way the keypad does.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => sendKey(key, where, stroke)}
              >
                <Icon name={icon} />
              </button>
              )
            })}

            {/*
              And what to do where the arrows have got to, in the two cells the
              cross leaves empty either side of the up key. Nothing is wider or
              taller for them — a cross is three across and its top row was
              carrying one key.

              These do get a hold tip, unlike the arrows above. A padlock is a
              picture of a thing, not of an action: it says "lock" but not
              "lock what", and in Net the answer — a tile you have finished
              turning — is worth a word. Nobody holds one down to repeat it,
              either, so there is no gesture for the tip to steal.

              And they go out when the back end says they would do nothing,
              which the arrows beside them do only in Cube. Not because an arrow
              always has somewhere to go — it very often does not, and pressing
              a cursor into the edge of any bounded grid is nothing at all — but
              because everywhere else the board is already saying so: the cursor
              is drawn, the edge is drawn, and a reader looking at the two knows
              which way is shut. Cube is the one puzzle that hides its own
              answer under the piece. See engine/cube.

              Dimmed the same way Undo is, since it is the same sentence: the
              button is still what it was, there is just nothing for it to do
              yet.

              Which key a press sends is `wouldSend`'s answer and not the one in
              the table: a button named for a result asks which key reaches it
              from where the cursor is, and that is not always the same key.
            */}
            {acts.map((cursor, i) => {
              /*
               * Map's two first, because they are not the back end's keys and
               * none of the machinery below applies to them: there is no word to
               * look up, no key to work out, and nothing to ask about which of
               * two the press should send. One paints, the other arms the
               * palette, and both are answered here. See `paints` and `arms` on
               * CursorKey.
               */
              /*
               * The stroke mode, which is the only button on this screen that
               * changes what a *different* button does. Pattern's; see `sweeps`.
               *
               * Out with the rest of the row while there is no cursor. It was
               * live at first, on the argument that a mode is not an act and
               * could be armed before there was anywhere to paint. That does
               * not survive the row: with no cursor the three keys beside it
               * are out and the arrows are the only thing that works, so one
               * lit button among four dark ones says the opposite of the truth.
               * The bit is kept while it is out, so a cursor that comes back
               * finds the mode where it was left.
               */
              if (cursor.sweeps) {
                return (
                  <button
                    key={cursor.icon}
                    type="button"
                    data-act={ACT[i]}
                    // Ours, like Map's arming key: the modifier it stands for is
                    // upstream's, but no back end has ever been given a way to
                    // hold one down, so the holding is this side's invention.
                    data-whose="ours"
                    data-on={painting || undefined}
                    aria-pressed={painting}
                    disabled={asleep}
                    aria-label={t.play.cursor[cursor.says]}
                    onMouseDown={(e) => e.preventDefault()}
                    {...holdToAsk(t.play.cursor[cursor.says])}
                    onClick={() => {
                      if (wasHeld()) return
                      acted()
                      setSweeping((was) => !was)
                      canvasRef.current?.focus()
                    }}
                  >
                    <Icon name={cursor.icon} />
                  </button>
                )
              }
              if (cursor.paints || cursor.arms) {
                const on = cursor.arms ? maybe : false
                return (
                  <button
                    key={cursor.icon}
                    type="button"
                    data-act={ACT[i]}
                    // The third step of the ladder, the same as the three on the
                    // keypad: a key no back end has heard of, answered through
                    // the save file.
                    data-whose="ours"
                    data-on={on || undefined}
                    aria-pressed={cursor.arms ? on : undefined}
                    aria-label={t.play.cursor[cursor.says]}
                    // Emptying acts where the cursor is and so goes out with it,
                    // exactly as the palette does. Arming does not: it says what
                    // the *next* colour will mean, which is worth saying before
                    // the cursor is anywhere.
                    disabled={cursor.paints !== undefined && !awake}
                    onMouseDown={(e) => e.preventDefault()}
                    {...holdToAsk(t.play.cursor[cursor.says])}
                    onClick={() => {
                      if (wasHeld()) return
                      acted()
                      if (cursor.paints) paint(cursor.paints)
                      else setMaybe((was) => !was)
                      canvasRef.current?.focus()
                    }}
                  >
                    <Icon name={cursor.icon} />
                  </button>
                )
              }
              // The list is slots rather than buttons, and a slot is empty while
              // its level is not the one running. Filtered here rather than
              // before the map so `i` stays the slot's own number: the keys that
              // are always there keep their places when a neighbour empties.
              // See `level` in engine/keys.
              if (!inMenu(name, cursor, labels, awake)) return null
              // What the key is right now, which for two puzzles is not what it
              // was a press ago: Sixteen's turn into the mode they have switched
              // on, Rectangles' into Done and Cancel once a drag is open. See
              // faceOf, and `faces` in keys.ts for why the back end decides it.
              const { icon, says, on } = faceOf(name, cursor, { ...labels, opened: opened ?? undefined }, awake)
              const said = t.play.cursor[says]
              const key = wouldSend(name, cursor, { ...labels, opened: opened ?? undefined }, awake)
              return (
                <button
                  // The key it sends, not the word it is showing: two of these
                  // change face as the puzzle goes along, and Rectangles' pair
                  // can be showing the *same* word — a drag that has been opened
                  // and not moved says "Cancel" on both — so a face-derived key
                  // would collide and React would keep a stale button.
                  //
                  // The result it is named for comes first, for the puzzle whose
                  // three buttons are three colours: two of them fall back to
                  // `Enter` and the key alone would no longer be unique.
                  key={cursor.does ?? cursor.key}
                  type="button"
                  data-act={ACT[i]}
                  // Enter and Space, which the back end reads as CURSOR_SELECT
                  // and CURSOR_SELECT2 — upstream's keys like the arrows they
                  // stand among, whatever each puzzle spends them on.
                  data-whose="upstream"
                  // Held down, where the face says so — for a mode the board
                  // draws nowhere, and for a drag that is waiting to be closed.
                  data-on={on || undefined}
                  /*
                   * And separately: the colour the arrows are painting with.
                   *
                   * Its own attribute rather than `data-on`, because it is not
                   * the same claim. A held-down key is one that has been
                   * pressed and stayed down; this one is *chosen among three*,
                   * and it is chosen the moment the mode goes on whether or not
                   * anybody pressed it. Sharing the attribute meant sharing the
                   * look, and the held-down look — one step of surface — is the
                   * app's quietest, which is right for a state the board also
                   * shows and wrong for the only place this one is written
                   * down. Measured by a reader: with the mode on and black
                   * chosen, they could not tell which colour was chosen.
                   */
                  data-brush={
                    painting && cursor.brush && i === brush ? 'true' : undefined
                  }
                  aria-pressed={
                    cursor.faces ? !!on : cursor.brush ? painting && i === brush : undefined
                  }
                  aria-label={said}
                  /*
                   * Pattern's three stay lit with nothing to send, which the
                   * click below handles by doing nothing — but only for the
                   * null that means "the square is already this colour". With
                   * no cursor there is no square, nothing is idempotent, and
                   * the exemption has nothing to stand on: they go out with
                   * everything else. See `lit` in engine/keys, and `asleep`.
                   */
                  disabled={key === null && (!cursor.lit || asleep)}
                  {...holdToAsk(said)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (wasHeld()) return
                    // Which colour the arrows paint in is a choice about the
                    // arrows, not a move on this square, so it lands before the
                    // press can be refused. That matters: `does` answers null on
                    // a square that already has this colour, which is exactly
                    // where one run ends and the next one starts.
                    if (cursor.brush) setBrush(i)
                    if (key === null) return
                    if (cursor.toggles) toggleSquare(key)
                    else sendKey(key)
                  }}
                >
                  <Icon name={icon} />
                </button>
              )
            })}
          </div>
        )}
      </nav>

      {/* Outside the row it belongs to, and it has to be: `.play-actions` is a
          stacking context of its own, so a tip rendered inside it was pinned to
          that row's level however high its own z-index went — under the
          introduction, which is two levels up in this one. See HoldTip. */}
      <HoldTip tip={tip} />

      {helpOpen && (
        /* A corner cross rather than a button in a row of buttons, because
           closing is not one of the things this dialog is for — it is how you
           leave, and this dialog has nothing else to press. Passing `title` is
           what asks Dialog for that pair. */
        <Dialog
          label={`${t.play.help} — ${title}`}
          title={t.play.help}
          onClose={closeHelp}
          className="dialog-help"
        >
          {/*
            What the puzzle looks like when it is done, before a word of it is
            read. Whoever opens this is looking at a board they do not yet
            understand, and a finished one answers "what am I aiming at" in
            the time it takes to glance — which no paragraph can, and which is
            the whole reason the covers are crops of a real position rather
            than drawings.

            Not lazy and not preloaded: the dialog is only rendered while it
            is open, so the fetch happens when it is asked for, and the worker
            keeps it afterwards — a puzzle whose help you have read once is
            still illustrated on a plane.
          */}
          <img
            className="help-art"
            src={`/howto/${name}-${theme}.png`}
            alt={t.play.picture(title)}
            draggable={false}
          />
          <div className="dialog-prose">
            {/* Upstream's own words. Fetched when the puzzle loads, so this
                is all but always the full blurb by the time it is asked for;
                the one-liner covers the case where it is not. */}
            {help ? (
              <div dangerouslySetInnerHTML={{ __html: help }} />
            ) : (
              <p>{objective}</p>
            )}
            {/* The blurb is a paragraph; the manual is the chapter. So the
                way to the chapter is the last line of the paragraph — a link
                in the prose, where a reader who has read to the end already
                is, rather than a button in a row, which is a thing to be
                pressed and made this dialog look like it wanted something.

                No fragment. The page is this puzzle's chapter entire, so
                `#name` could only aim at its own first heading — which
                bought nothing and cost the top of the page: the contents,
                the index, and the way to the neighbouring chapters, all
                scrolled off before the reader arrived.

                A tab of its own: this app is one page, and leaving it would
                unload the board, the sheet this link is in, and everything
                else held in memory. The glyph says so, which inside a
                sentence is worth the room it takes. */}
            <p className="prose-more">
              <a
                href={docHref(lang, `${name}.html`)}
                target="_blank"
                rel="noreferrer"
              >
                {t.play.fullInstructions}
                <Icon name="external" size={14} />
              </a>
            </p>
          </div>
        </Dialog>
      )}

      {typesOpen && presets && (
        <PuzzleTypes
          presets={presets}
          selected={selected}
          standard={standard}
          custom={inline?.kind === 'custom' ? inline.spec : null}
          customError={inlineError}
          onSelectPreset={(value) => {
            // Stays open. Everything in this sheet takes effect where it is
            // pressed, and a sheet that shuts itself on one of those and not
            // the others is telling you they are different things.
            setSelected(value)
            act((a) => a.selectPreset(value))
          }}
          onOpenCustom={() => openInline('custom')}
          onCloseCustom={closeInline}
          onCommitCustom={commitInline}
          onClose={closeTypes}
        />
      )}

      {menuOpen && (
        <PuzzleMenu
          canSolve={canSolve}
          permalink={permalink}
          prefs={inline?.kind === 'prefs' ? inline.spec : null}
          prefsError={inlineError}
          arrows={arrows}
          onToggleArrows={() => toggleArrows(name)}
          onOpenPrefs={() => openInline('prefs')}
          onCommitPrefs={commitInline}
          textError={textError}
          onSubmitText={submitText}
          onAction={(action) => {
            // The back end will do nothing else while it is sitting in the
            // preferences; answer that first.
            if (inlineRef.current) apiRef.current?.dialogCancel()
            act((a) => a[action]())
            setMenuOpen(false)
          }}
          onClose={closeMenu}
        />
      )}

      {dialog && apiRef.current && (
        <PuzzleDialog
          spec={dialog}
          onOk={() => apiRef.current?.dialogOk()}
          onCancel={() => apiRef.current?.dialogCancel()}
        />
      )}
    </div>
  )
}
