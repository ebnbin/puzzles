import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleSwitcher from './PuzzleSwitcher'
import PuzzleTypes from './PuzzleTypes'
import { createPuzzle } from './engine/createPuzzle'
import { keysFor } from './engine/keys'
import { clearSave, readSave, writeLast, writeSave } from './engine/saves'
import type { CanvasRenderer } from './engine/renderer'
import type { DialogSpec, KeyLabel, Preset, PuzzleApi } from './engine/types'
import { docHref, useLang, useStrings } from './i18n'
import { onBackClick } from './router'
import { useHelp } from './useHelp'
import { useNoPullToRefresh } from './useNoPullToRefresh'
import { useResolvedTheme } from './useResolvedTheme'
import { setTheme } from './useTheme'
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
  const titleRef = useRef<HTMLButtonElement>(null)

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
  const [switcherOpen, setSwitcherOpen] = useState(false)

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
  const arm = useCallback(() => {
    armed.current = true
  }, [])
  const queueSave = useCallback(() => {
    if (!armed.current || savePending.current) return
    savePending.current = true
    queueMicrotask(() => {
      savePending.current = false
      const api = apiRef.current
      if (api) writeSave(name, api.saveGame())
    })
  }, [name])

  /* This is now the game to come back to, from the moment it is opened. */
  useEffect(() => {
    writeLast(name)
  }, [name])

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

    // An id in the address is an explicit ask and wins over the save: a
    // shared link must open the game it names, not the reader's own past.
    const gameId = decodeURIComponent(window.location.hash.replace(/^#/, ''))
    const saved = gameId ? null : readSave(name)

    createPuzzle({
      name,
      canvas,
      gameId,
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

  /** A dialog is modal to the game; the C side is waiting for its answer. */
  const act = useCallback(
    (fn: (api: PuzzleApi) => void) => {
      if (!apiRef.current || dialog) return
      arm()
      fn(apiRef.current)
      canvasRef.current?.focus()
    },
    [dialog, arm],
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
    arm()
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
    arm()
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
    arm()
    if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
      e.preventDefault()
  }, [arm])

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
        else if (switcherOpen) setSwitcherOpen(false)
        // Not a layer of its own: the parameters are part of the sheet, so
        // the sheet is what closes, and closing it answers the config box.
        else if (typesOpen) closeTypes()
        else if (menuOpen) closeMenu()
        else return
        e.preventDefault()
        return
      }
      if (dialog || helpOpen || switcherOpen || typesOpen) return
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
      const api = apiRef.current
      if (!api) return
      const shortcut: Record<string, () => void> = {
        u: () => api.undo(),
        r: () => api.redo(),
        n: () => api.newGame(),
      }
      const run = shortcut[e.key.toLowerCase()]
      if (!run) return
      run()
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
    switcherOpen,
  ])

  const pressKey = useCallback((key: KeyLabel) => {
    const api = apiRef.current
    if (!api) return
    arm()
    // Every puzzle that requests keys requests ASCII ones, so the ordinary
    // key path carries them: a one-character string is taken as the button
    // itself, and the midend folds 8 and 127 together into backspace.
    api.key(0, String.fromCharCode(key.button), '', 0, 0, 0)
    canvasRef.current?.focus()
  }, [])

  return (
    <div className="play" data-ready={ready}>
      <header className="play-bar">
        <a
          className="play-back"
          href="/"
          onClick={onBackClick}
          aria-label={t.play.back}
        >
          <Icon name="back" />
        </a>
        {/* The name is also the way to the other thirty-nine: it is what you
            would point at to say "not this one", and it costs the bar
            nothing it was not already spending. */}
        <h1>
          <button
            ref={titleRef}
            type="button"
            className="play-title"
            aria-haspopup="dialog"
            aria-expanded={switcherOpen}
            onClick={() => setSwitcherOpen(true)}
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

      {error && (
        <p className="play-error">
          {error === START_FAILED ? t.play.error : error}
        </p>
      )}

      <div className="play-board" ref={areaRef}>
        <canvas
          ref={canvasRef}
          onPointerDownCapture={arm}
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
        <button
          type="button"
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

      {helpOpen && (
        <div className="dialog-dimmer" onClick={() => setHelpOpen(false)}>
          <div
            className="dialog dialog-help"
            role="dialog"
            aria-modal="true"
            aria-label={`${t.play.help} — ${title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t.play.help}</h2>
            {/* Upstream's own words. Fetched when the puzzle loads, so this is
                all but always the full blurb by the time it is asked for; the
                one-liner covers the case where it is not. */}
            {help ? (
              <div
                className="dialog-prose"
                dangerouslySetInnerHTML={{ __html: help }}
              />
            ) : (
              <div className="dialog-prose">
                <p>{objective}</p>
              </div>
            )}
            {/* The blurb is a paragraph; the manual is the chapter. A new
                tab, because leaving the page would abandon the position. */}
            <div className="dialog-buttons">
              <a
                className="dialog-more"
                href={docHref(lang, `${name}.html#${name}`)}
                target="_blank"
                rel="noreferrer"
              >
                {t.play.fullInstructions}
                <Icon name="external" size={16} />
              </a>
              <button type="button" onClick={() => setHelpOpen(false)}>
                {t.play.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {switcherOpen && (
        <PuzzleSwitcher
          current={name}
          anchor={titleRef}
          onClose={() => setSwitcherOpen(false)}
        />
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
