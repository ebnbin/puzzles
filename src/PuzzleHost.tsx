import { useCallback, useEffect, useRef, useState } from 'react'
import ErrorNote from './ErrorNote'
import Icon from './Icon'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleTypes from './PuzzleTypes'
import TuningPanel from './TuningPanel'
import { createPuzzle } from './engine/createPuzzle'
import { keysFor } from './engine/keys'
import {
  clearSave,
  readSave,
  takeIntroduction,
  writeCurrent,
  writeLast,
  writeSave,
} from './engine/saves'
import type { CanvasRenderer } from './engine/renderer'
import type { DialogSpec, KeyLabel, Preset, PuzzleApi } from './engine/types'
import { docHref, useLang, useStrings } from './i18n'
import { showGallery } from './view'
import { useHelp } from './useHelp'
import { useNoPullToRefresh } from './useNoPullToRefresh'
import { useTheme } from './useTheme'
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

/** Enough of a dialog to tell whether anything in it was changed. */
const values = (spec: DialogSpec) =>
  JSON.stringify(spec.controls.map((c) => c.value))

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
  const [keys, setKeys] = useState<KeyLabel[]>([])
  // A message from the back end, or the sentinel for the one failure that is
  // ours to describe. Kept as a sentinel rather than as the sentence itself so
  // that it is still in the reader's language if they change it afterwards.
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

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
  const [theme, setTheme] = useTheme()
  const dark = theme === 'dark'
  const t = useStrings()
  const [lang] = useLang()
  // Read inside the start-up effect without making it a dependency: the puzzle
  // is created once, and the theme it is created with has to be the one in
  // force at that moment.
  const themeRef = useRef(theme)
  themeRef.current = theme
  useNoPullToRefresh()

  /*
   * Progress, kept as it is made.
   *
   * The midend announces every change of state through post_move — each move,
   * each undo, each redo, each new deal — so that one callback is where the
   * game is serialised and put away. Writes from one gesture coalesce into a
   * microtask.
   *
   * Armed only by an actual act of playing. Everything before that — the
   * starting deal, a restored save, a shared link being looked at — saves
   * nothing, so opening a link never costs a saved game until the reader
   * plays into it.
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
   * the one the gallery marks, which is a different fact: `last` is a screen and
   * is dropped as soon as the gallery is the screen, while the mark has to
   * survive being left.
   */
  useEffect(() => {
    writeLast(name)
    writeCurrent(name)
  }, [name])

  /*
   * A puzzle you have not met before says what it is, once.
   *
   * Forty boards and no two are played the same way; arriving at one of them
   * cold, the first question is always "what am I looking at", and the answer
   * was behind a button in the corner that you had to know to press. So it is
   * offered rather than waited for — and only ever once per puzzle, because
   * the second time you are here you came on purpose.
   *
   * After `ready` and not on mount: the dialog is mostly the picture of a
   * finished board, and putting it over a board that has not been dealt yet
   * would mean closing it to find out whether the puzzle even started. By the
   * time this runs the blurb is usually here too — the fetch was started when
   * the puzzle was — and if it is not, the dialog opens on the one-line
   * objective and fills in.
   *
   * Asking marks it read, rather than closing it doing so. The promise is one
   * unbidden dialog per puzzle, not that anybody looked: a reload while it is
   * open is a reader who has had it and has moved on.
   */
  useEffect(() => {
    if (ready && takeIntroduction(name)) setHelpOpen(true)
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
          }
          setPresets(list)
          setReady(true)
        },
        onError: (message) => {
          if (restoring.current) {
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
          // The keypad follows the game id: it is where the grid size lives,
          // and it is reissued whenever the preset changes.
          setKeys(keysFor(name, decodeURIComponent(desc)))
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
            inlineBaseline.current = values(spec)
            setInlineError(null)
            setInline({ kind, spec })
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

  /**
   * Same two steps, for the tuning panel: it edits the constants the rules
   * read, which changes the answer for a board that has not moved. `setDark`
   * would decline — the theme it would be handed is the one already in force —
   * so the renderer is told to run the rules again outright.
   */
  const applyTuning = useCallback(() => {
    rendererRef.current?.recolour()
    apiRef.current?.rescale()
  }, [])

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
    if (values(open.spec) === inlineBaseline.current) return
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

  const closeTypes = useCallback(() => {
    if (inlineRef.current) apiRef.current?.dialogCancel()
    setTypesOpen(false)
  }, [])

  const closeMenu = useCallback(() => {
    if (inlineRef.current) apiRef.current?.dialogCancel()
    setMenuOpen(false)
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api) return
    acted()
    if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
      e.preventDefault()
  }, [acted])

  // Shortcuts on the page rather than the board, so they work wherever focus
  // is. Skipped while a dialog is up or a field has focus.
  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Escape dismisses whatever is on top, wherever focus is — including a
      // control inside the sheet, which is where it will be after a preset.
      if (e.key === 'Escape') {
        if (helpOpen) setHelpOpen(false)
        // Not a layer of its own: the parameters are part of the sheet, so
        // the sheet is what closes, and closing it answers the config box.
        else if (typesOpen) closeTypes()
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

  const pressKey = useCallback((key: KeyLabel) => {
    const api = apiRef.current
    if (!api) return
    acted()
    // Every puzzle that requests keys requests ASCII ones, so the ordinary
    // key path carries them: a one-character string is taken as the button
    // itself, and the midend folds 8 and 127 together into backspace.
    api.key(0, String.fromCharCode(key.button), '', 0, 0, 0)
    canvasRef.current?.focus()
  }, [])

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
        {/* The board turns over with the page, and this is the shortest way
            to see it do so — one press, no dialog. It commits to a side
            rather than toggling within "system": having asked for a specific
            appearance, a reader should get it until they say otherwise. */}
        <button
          type="button"
          className="play-icon"
          aria-label={dark ? t.play.toLight : t.play.toDark}
          onClick={() => setTheme(dark ? 'light' : 'dark')}
        >
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
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
          reader's language. */}
      <nav className="play-actions">
        <button
          type="button"
          aria-label={t.play.undo}
          disabled={!undoRedo.undo}
          onClick={() => act((a) => a.undo())}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          aria-label={t.play.redo}
          disabled={!undoRedo.redo}
          onClick={() => act((a) => a.redo())}
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
            onClick={() => {
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
          onClick={() => {
            closeTypes()
            // Whatever the back end said about a typed id was said to a sheet
            // that is no longer up. Opening a fresh one starts clean.
            setTextError(null)
            setMenuOpen(true)
          }}
        >
          <Icon name="menu" />
        </button>
      </nav>

      {/* Temporary, and deliberately always there: judging a palette constant
          means moving it back and forth over a live board, and a dialog
          charges for every trip. The stylesheet gives it a rail of its own
          past 64em and nothing below that. Meant to come out once the values
          are judged. */}
      <TuningPanel onApply={applyTuning} dark={dark} />

      {helpOpen && (
        <div className="dialog-dimmer" onClick={() => setHelpOpen(false)}>
          <div
            className="dialog dialog-help"
            role="dialog"
            aria-modal="true"
            aria-label={`${t.play.help} — ${title}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* The title and the way out, on one line and staying on it: the
                blurb scrolls under them rather than taking them with it. A
                corner cross rather than a button in a row of buttons, because
                closing is not one of the things this dialog is for — it is how
                you leave, and this dialog has nothing else to press. */}
            <div className="dialog-head">
              <h2>{t.play.help}</h2>
              <button
                type="button"
                className="dialog-close"
                aria-label={t.play.close}
                onClick={() => setHelpOpen(false)}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
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
              src={`/solved/${name}.png`}
              alt={t.play.picture(title)}
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
          </div>
        </div>
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
