import { useCallback, useEffect, useRef, useState } from 'react'
import PuzzleDialog from './PuzzleDialog'
import { createPuzzle } from './engine/createPuzzle'
import type { CanvasRenderer } from './engine/renderer'
import type { DialogSpec, Preset, PuzzleApi } from './engine/types'

/**
 * A compiled puzzle, hosted entirely by React.
 *
 * The C code no longer reaches for the page: it hands over presets, status
 * text, undo state and dialogs as data, and everything below is ordinary
 * React. What remains of upstream's front end is the canvas — the back end
 * draws in immediate mode, so the board is painted by our renderer rather
 * than composed of elements.
 */
export default function PuzzleHost({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // The module cannot be torn down or instantiated twice into the same
    // canvas, and StrictMode runs effects twice in development.
    if (startedRef.current) return
    startedRef.current = true

    const canvas = canvasRef.current
    if (!canvas) return

    let live = true
    createPuzzle({
      name,
      canvas,
      // Permalinks put the game id in the fragment, the same as upstream.
      gameId: decodeURIComponent(window.location.hash.replace(/^#/, '')),
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
        onPermalinks: (desc, seed) => setPermalink({ desc, seed }),
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
      // The frame timer re-arms itself, and would otherwise go on calling
      // into an instance nothing can reach any more.
      apiRef.current?.stopTimer()
    }
  }, [name])

  // --- input --------------------------------------------------------------
  // Physical button -> logical button, so a move or release is reported with
  // the same button the press was, and so a drag with no button held is not
  // reported at all. Shift and Ctrl stand in for the middle and right buttons.

  const heldRef = useRef<(number | null)[]>([null, null, null])

  const coords = (e: React.MouseEvent) =>
    rendererRef.current?.eventCoords(e.nativeEvent) ?? { x: 0, y: 0 }

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api || e.button >= 3) return
    const logical = e.shiftKey ? 1 : e.ctrlKey ? 2 : e.button
    const { x, y } = coords(e)
    if (api.mousedown(x, y, logical)) e.preventDefault()
    heldRef.current[e.button] = logical
  }, [])

  // Keep receiving move and release events if the pointer leaves the board
  // mid-drag, which several puzzles rely on.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api) return
    const mask = heldRef.current.reduce<number>(
      (acc, logical) => (logical === null ? acc : acc | (1 << logical)),
      0,
    )
    if (!mask) return
    const { x, y } = coords(e)
    if (api.mousemove(x, y, mask)) e.preventDefault()
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api || e.button >= 3) return
    const logical = heldRef.current[e.button]
    if (logical === null) return
    const { x, y } = coords(e)
    if (api.mouseup(x, y, logical)) e.preventDefault()
    heldRef.current[e.button] = null
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const api = apiRef.current
    if (!api) return
    if (
      api.key(e.keyCode, e.key, '', e.location, e.shiftKey ? 1 : 0, e.ctrlKey ? 1 : 0)
    )
      e.preventDefault()
  }, [])

  // --- interface ----------------------------------------------------------

  const api = apiRef.current
  const act = (fn: (api: PuzzleApi) => void) => () => {
    // A dialog is modal to the game: while one is up the C side is waiting
    // for its answer and will not accept anything else.
    if (!apiRef.current || dialog) return
    fn(apiRef.current)
    canvasRef.current?.focus()
  }

  return (
    <div className="host" data-ready={ready}>
      {error && <p className="host-error">{error}</p>}

      <canvas
        ref={canvasRef}
        className="host-board"
        tabIndex={0}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onKeyDown={onKeyDown}
      />

      {status !== null && <p className="host-status">{status}</p>}

      <div className="host-controls">
        <button type="button" onClick={act((a) => a.newGame())}>New game</button>
        <button type="button" onClick={act((a) => a.restart())}>Restart</button>
        <button type="button" disabled={!undoRedo.undo} onClick={act((a) => a.undo())}>
          Undo
        </button>
        <button type="button" disabled={!undoRedo.redo} onClick={act((a) => a.redo())}>
          Redo
        </button>
        {canSolve && (
          <button type="button" onClick={act((a) => a.solve())}>Solve</button>
        )}
        <button type="button" onClick={act((a) => a.enterGameId())}>Game ID…</button>
        <button type="button" onClick={act((a) => a.enterSeed())}>Seed…</button>
        <button type="button" onClick={act((a) => a.preferences())}>Preferences…</button>
      </div>

      {presets && (
        <PresetList
          presets={presets}
          selected={selected}
          onSelect={(value) => {
            setSelected(value)
            api?.selectPreset(value)
          }}
        />
      )}

      {permalink && (
        <p className="host-permalinks">
          Link to this puzzle: <a href={`#${permalink.desc}`}>by game ID</a>
          {permalink.seed && (
            <>
              {' '}
              <a href={`#${permalink.seed}`}>by random seed</a>
            </>
          )}
        </p>
      )}

      {dialog && api && (
        <PuzzleDialog
          spec={dialog}
          onOk={() => api.dialogOk()}
          onCancel={() => api.dialogCancel()}
        />
      )}
    </div>
  )
}

/** Presets can nest one or more levels; render the tree as grouped radios. */
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
