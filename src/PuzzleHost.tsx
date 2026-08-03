import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Dialog from './Dialog'
import ErrorNote from './ErrorNote'
import Icon from './Icon'
import Introduction from './Introduction'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleTypes from './PuzzleTypes'
import { createPuzzle } from './engine/createPuzzle'
import { keysFor, READS_PREFS } from './engine/keys'
import { clearMarks, fillMarks, pending, placeSingles } from './engine/marks'
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

/** Enough of a set of controls to tell whether anything in it was changed. */
const values = (controls: readonly DialogControl[]) =>
  JSON.stringify(controls.map((c) => c.value))

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
  const [canSolve, setCanSolve] = useState(true)
  const [undoRedo, setUndoRedo] = useState({ undo: false, redo: false })
  const [dialog, setDialog] = useState<DialogSpec | null>(null)
  const [permalink, setPermalink] = useState<{ desc: string; seed: string | null }>()
  /**
   * The preferences, as the back end last described them. Only the keypad
   * reads them, and only one puzzle's keypad does — see READS_PREFS.
   */
  const [prefs, setPrefs] = useState<readonly DialogControl[]>([])
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
          queueSave()
        },
        onKeyLabels: () => {},
        onPermalinks: (desc, seed) => {
          setPermalink({ desc, seed })
          queueSave()
        },
        onPresetSelected: setSelected,
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
  const keys = useMemo(
    () => (permalink ? keysFor(name, decodeURIComponent(permalink.desc), prefs) : []),
    [name, permalink, prefs],
  )

  // The parameters, which is the part of the game id before the colon: a new
  // grid is a new natural size, and nothing else about the id changes it.
  usePuzzleFit(
    areaRef,
    apiRef,
    rendererRef,
    ready,
    permalink?.desc.split(':')[0] ?? '',
  )
  const pointer = usePuzzlePointer(apiRef, rendererRef)

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

  /** A dialog is modal to the game; the C side is waiting for its answer. */
  const act = useCallback(
    (fn: (api: PuzzleApi) => void) => {
      if (!apiRef.current || dialog) return
      acted()
      fn(apiRef.current)
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
    if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
      e.preventDefault()
    // Some of what the board takes changes a preference — undead's `a` — and
    // it says nothing when it does, so a puzzle whose keypad follows one is
    // asked again after every press. Which key it was is undead.c's business,
    // not ours, and asking is cheap: one config box, built and freed.
    if (READS_PREFS.has(name)) readPrefs()
  }, [acted, name, readPrefs])

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

  const pressKey = useCallback((key: KeyLabel) => {
    const api = apiRef.current
    if (!api) return
    if (key.action) {
      markAction(key.action)
      canvasRef.current?.focus()
      return
    }
    acted()
    // Every puzzle that requests keys requests ASCII ones, so the ordinary
    // key path carries them: a one-character string is taken as the button
    // itself, and the midend folds 8 and 127 together into backspace.
    api.key(0, String.fromCharCode(key.button), '', 0, 0, 0)
    canvasRef.current?.focus()
  }, [acted, markAction])

  return (
    <div className="play" data-ready={ready}>
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
            from shuffling the text beside it. */}
        <span
          className="play-status"
          data-filled={!!status}
          aria-live="polite"
        >
          {status}
        </span>
        {/* No light-and-dark button here. It was the shortest way to turn the
            board over, and the board is the last place that needs one: this
            screen is a puzzle and two controls, and a third that changes how
            the app looks rather than what the game does was the odd one out.
            The setting is in the settings, where all three of its states can
            be shown at once, and the manual keeps its own press because it is
            a page of prose with nowhere else to put one. */}
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
          onPointerDownCapture={acted}
          className="host-board"
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          {...pointer}
        />
      </div>

      <PuzzleKeypad keys={keys} onPress={pressKey} />

      {/* Four, and each of them a glyph. Undo and Redo are the two arrows
          everything else in the world uses for the same thing; the grid and
          the three lines say the rest. Words here would only push them apart
          and make where each one sits depend on how long they are in the
          reader's language — so the words come on a long press instead, the
          same way the keys above answer the same question. */}
      <nav className="play-actions">
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
        {/* The one in the row that opens something rather than doing something,
            drawn in the accent to say so — the same distinction the keypad makes
            between a key that fills a square and a key that acts on the board. */}
        <button
          type="button"
          className="is-menu"
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
        <HoldTip tip={tip} />
      </nav>

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
