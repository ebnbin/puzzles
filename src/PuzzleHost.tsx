import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import PuzzleMenu from './PuzzleMenu'
import PuzzleSwitcher from './PuzzleSwitcher'
import PuzzleTypes from './PuzzleTypes'
import { createPuzzle } from './engine/createPuzzle'
import { keysFor } from './engine/keys'
import type { CanvasRenderer } from './engine/renderer'
import type { DialogSpec, KeyLabel, Preset, PuzzleApi } from './engine/types'
import { docHref, useLang, useStrings } from './i18n'
import { onNavClick } from './router'
import { useFullscreen } from './useFullscreen'
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
   * The parameters, while they are open inside the type sheet.
   *
   * To the back end this is the same modal config box as Game ID or
   * Preferences — it starts one, then waits for an answer — so it arrives
   * through the same callback as those, and the only thing that tells them
   * apart is that we asked for this one. Hence the flag, set immediately
   * before asking. Both are mirrored in refs because the callbacks that read
   * them were handed to the back end once, at startup, and close over nothing
   * that re-renders.
   */
  const [custom, setCustom] = useState<DialogSpec | null>(null)
  const [customError, setCustomError] = useState<string | null>(null)
  const customPending = useRef(false)
  const customRef = useRef<DialogSpec | null>(null)

  const fullscreen = useFullscreen()
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

  useEffect(() => {
    // No teardown exists, and StrictMode runs effects twice in development.
    if (startedRef.current) return
    startedRef.current = true

    const canvas = canvasRef.current
    const area = areaRef.current
    if (!canvas || !area) return

    let live = true
    createPuzzle({
      name,
      canvas,
      gameId: decodeURIComponent(window.location.hash.replace(/^#/, '')),
      // No room stated, so the first board the back end lays out is the one it
      // would have chosen on its own. usePuzzleFit takes it from there, and
      // whichever frame lands first is a board at a size the game asked for —
      // handing over the whole area instead would flash a full-window board
      // for the frame before the cap is worked out.
      dark: themeRef.current === 'dark',
      callbacks: {
        onReady(list, api) {
          apiRef.current = api
          if (!live) return api.stopTimer()
          // A handle on the running puzzle, for the icon build and the
          // browser tests: both need to drive a puzzle from outside React.
          window.__puzzle = api
          setPresets(list)
          setReady(true)
        },
        onError: (message) => {
          // A refused set of parameters belongs against the fields that were
          // refused, not under the title bar behind the sheet showing them.
          if (customRef.current) setCustomError(message)
          else setError(message)
        },
        onStatus: setStatus,
        onUndoRedo: (undo, redo) => setUndoRedo({ undo, redo }),
        onKeyLabels: () => {},
        onPermalinks: (desc, seed) => {
          setPermalink({ desc, seed })
          // The keypad follows the game id: it is where the grid size lives,
          // and it is reissued whenever the preset changes.
          setKeys(keysFor(name, decodeURIComponent(desc)))
        },
        onPresetSelected: setSelected,
        onSolveRemoved: () => setCanSolve(false),
        onDialog: (spec) => {
          if (spec && customPending.current) {
            customPending.current = false
            customRef.current = spec
            setCustomError(null)
            setCustom(spec)
            return
          }
          // Closing, and it was ours: the back end has finished with it,
          // whether it was accepted or cancelled.
          if (!spec && customRef.current) {
            customRef.current = null
            setCustomError(null)
            setCustom(null)
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
        if (!live) return
        console.error(`could not start ${name}`, err)
        setError(START_FAILED)
      })

    return () => {
      live = false
      apiRef.current?.stopTimer()
      delete window.__puzzle
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
      fn(apiRef.current)
      canvasRef.current?.focus()
    },
    [dialog],
  )

  /*
   * The parameters, which the back end offers as a preset with a negative
   * index where the real ones have their own. Asking for it starts a config
   * box that will sit there until it is answered, so every way out of the
   * fields — the Apply button, pressing Custom again, closing the sheet,
   * picking a preset instead — has to answer it.
   */
  const openCustom = useCallback(() => {
    const api = apiRef.current
    if (!api || dialog) return
    customPending.current = true
    api.selectPreset(CUSTOM_PRESET)
  }, [dialog])

  const closeCustom = useCallback(() => {
    apiRef.current?.dialogCancel()
  }, [])

  const applyCustom = useCallback(() => {
    setCustomError(null)
    apiRef.current?.dialogOk()
    // Accepted: the back end closed the box on its way out, and the sheet has
    // done what it was opened for. Refused: it is still open, now with a
    // sentence to read.
    if (!customRef.current) setTypesOpen(false)
  }, [])

  const closeTypes = useCallback(() => {
    if (customRef.current) apiRef.current?.dialogCancel()
    setTypesOpen(false)
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api) return
    if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
      e.preventDefault()
  }, [])

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
        // The fields collapse first and the sheet stays: they are a layer
        // inside it, and the press that opened them is the one being undone.
        else if (custom) closeCustom()
        else if (typesOpen) setTypesOpen(false)
        else if (menuOpen) setMenuOpen(false)
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
        f: () => fullscreen.toggle(),
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
    custom,
    closeCustom,
    helpOpen,
    switcherOpen,
    fullscreen,
  ])

  const pressKey = useCallback((key: KeyLabel) => {
    const api = apiRef.current
    if (!api) return
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
          onClick={onNavClick}
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
          className="host-board"
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          {...pointer}
        />
      </div>

      <PuzzleKeypad keys={keys} onPress={pressKey} />

      <nav className="play-actions">
        <button
          type="button"
          disabled={!undoRedo.undo}
          onClick={() => act((a) => a.undo())}
        >
          <Icon name="undo" />
          {t.play.undo}
        </button>
        <button
          type="button"
          disabled={!undoRedo.redo}
          onClick={() => act((a) => a.redo())}
        >
          <Icon name="redo" />
          {t.play.redo}
        </button>
        {fullscreen.supported && (
          <button
            type="button"
            className="play-icon"
            aria-label={
              fullscreen.active ? t.play.exitFullscreen : t.play.fullscreen
            }
            aria-pressed={fullscreen.active}
            onClick={fullscreen.toggle}
          >
            <Icon name={fullscreen.active ? 'fullscreenExit' : 'fullscreen'} />
          </button>
        )}
        {/* Its own way in, beside the menu rather than inside it: how big a
            board you want is asked far more often than anything the menu
            holds, and on some puzzles the list of answers is longer than the
            menu itself. */}
        {presets && (
          <button
            type="button"
            className="play-icon"
            aria-label={t.types.title}
            aria-haspopup="dialog"
            aria-expanded={typesOpen}
            onClick={() => {
              setMenuOpen(false)
              setTypesOpen(true)
            }}
          >
            <Icon name="type" />
          </button>
        )}
        <button
          type="button"
          className="play-icon"
          aria-label={t.play.menu}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => {
            closeTypes()
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
          custom={custom}
          customError={customError}
          onSelectPreset={(value) => {
            // The back end will not take a preset while its config box is
            // open, so answer that first.
            if (customRef.current) apiRef.current?.dialogCancel()
            setSelected(value)
            act((a) => a.selectPreset(value))
            setTypesOpen(false)
          }}
          onOpenCustom={openCustom}
          onCloseCustom={closeCustom}
          onApplyCustom={applyCustom}
          onClose={closeTypes}
        />
      )}

      {menuOpen && (
        <PuzzleMenu
          canSolve={canSolve}
          permalink={permalink}
          onAction={(action) => {
            act((a) => a[action]())
            setMenuOpen(false)
          }}
          onClose={() => setMenuOpen(false)}
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
