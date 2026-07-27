import { useCallback, useEffect, useRef, useState } from 'react'
import PuzzleDialog from './PuzzleDialog'
import PuzzleKeypad from './PuzzleKeypad'
import { createPuzzle } from './engine/createPuzzle'
import { keysFor } from './engine/keys'
import type { CanvasRenderer } from './engine/renderer'
import type { DialogSpec, KeyLabel, Preset, PuzzleApi } from './engine/types'
import { usePuzzleFit } from './usePuzzleFit'
import { usePuzzlePointer } from './usePuzzlePointer'

/**
 * A compiled puzzle, hosted entirely by React.
 *
 * The C code hands over presets, status text, undo state and dialogs as data;
 * everything below is ordinary React. The board is a canvas because the back
 * end draws in immediate mode, and our renderer paints it.
 */
export default function PuzzleHost({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<PuzzleApi | null>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)
  const startedRef = useRef(false)

  const [status, setStatus] = useState<string | null>(null)
  const [presets, setPresets] = useState<Preset[] | null>(null)
  const [selected, setSelected] = useState(0)
  const [canSolve, setCanSolve] = useState(true)
  const [undoRedo, setUndoRedo] = useState({ undo: false, redo: false })
  const [dialog, setDialog] = useState<DialogSpec | null>(null)
  const [permalink, setPermalink] = useState<{ desc: string; seed: string | null }>()
  const [keys, setKeys] = useState<KeyLabel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [showMore, setShowMore] = useState(false)

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
      // Start at the size it will settle at, rather than resizing on the
      // first frame.
      available: area.getBoundingClientRect(),
      callbacks: {
        onReady(list, api) {
          apiRef.current = api
          if (!live) return api.stopTimer()
          setPresets(list)
          setReady(true)
        },
        onError: setError,
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
        onDialog: setDialog,
      },
    })
      .then(({ renderer }) => {
        rendererRef.current = renderer
      })
      .catch((err) => {
      if (!live) return
      console.error(`could not start ${name}`, err)
      setError('Could not start the puzzle. See the console.')
    })

    return () => {
      live = false
      apiRef.current?.stopTimer()
    }
  }, [name])

  usePuzzleFit(areaRef, apiRef, ready)
  const pointer = usePuzzlePointer(apiRef, rendererRef)

  const act = useCallback(
    (fn: (api: PuzzleApi) => void) => () => {
      // A dialog is modal to the game: the C side is waiting for its answer
      // and will not accept anything else meanwhile.
      if (!apiRef.current || dialog) return
      fn(apiRef.current)
      canvasRef.current?.focus()
    },
    [dialog],
  )

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api) return
    if (api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0))
      e.preventDefault()
  }, [])

  // Desktop shortcuts, on the page rather than the board so they work
  // wherever focus is. Skipped while a dialog is up or a field has focus.
  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (dialog || e.metaKey || e.ctrlKey || e.altKey) return
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
  }, [ready, dialog])

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
    <div className="host" data-ready={ready}>
      {error && <p className="host-error">{error}</p>}

      <div className="host-board-area" ref={areaRef}>
        <canvas
          ref={canvasRef}
          className="host-board"
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          {...pointer}
        />
      </div>

      <p className="host-status" aria-live="polite">{status}</p>

      <PuzzleKeypad keys={keys} onPress={pressKey} />

      <div className="host-controls">
        <button type="button" onClick={act((a) => a.newGame())}>New</button>
        <button type="button" disabled={!undoRedo.undo} onClick={act((a) => a.undo())}>
          Undo
        </button>
        <button type="button" disabled={!undoRedo.redo} onClick={act((a) => a.redo())}>
          Redo
        </button>
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
        >
          More…
        </button>
      </div>

      {showMore && (
        <div className="host-more">
          <div className="host-controls">
            <button type="button" onClick={act((a) => a.restart())}>Restart</button>
            {canSolve && (
              <button type="button" onClick={act((a) => a.solve())}>Solve</button>
            )}
            <button type="button" onClick={act((a) => a.enterGameId())}>Game ID…</button>
            <button type="button" onClick={act((a) => a.enterSeed())}>Seed…</button>
            <button type="button" onClick={act((a) => a.preferences())}>
              Preferences…
            </button>
          </div>

          {presets && (
            <PresetList
              presets={presets}
              selected={selected}
              onSelect={(value) => {
                setSelected(value)
                apiRef.current?.selectPreset(value)
              }}
            />
          )}

          {permalink && (
            <p className="host-permalinks">
              Link to this puzzle: <a href={`#${permalink.desc}`}>by game ID</a>
              {permalink.seed && (
                <>
                  {' · '}
                  <a href={`#${permalink.seed}`}>by random seed</a>
                </>
              )}
            </p>
          )}
        </div>
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

/** Presets can nest; render the tree as grouped radios. */
function PresetList({
  presets,
  selected,
  onSelect,
}: {
  presets: Preset[]
  selected: number
  onSelect: (value: number) => void
}) {
  return (
    <ul className="host-presets">
      {presets.map((preset, i) => (
        <li key={i}>
          {preset.submenu ? (
            <>
              <span className="host-preset-group">{preset.name}</span>
              <PresetList
                presets={preset.submenu}
                selected={selected}
                onSelect={onSelect}
              />
            </>
          ) : (
            <label>
              <input
                type="radio"
                name="preset"
                checked={selected === preset.value}
                onChange={() => preset.value !== null && onSelect(preset.value)}
              />
              {preset.name}
            </label>
          )}
        </li>
      ))}
    </ul>
  )
}
