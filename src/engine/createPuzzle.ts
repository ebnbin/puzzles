import { CanvasRenderer } from './renderer'
import type { Preset, PuzzleApi, PuzzleCallbacks } from './types'

/**
 * Load a compiled puzzle and attach it to a canvas.
 *
 * The module is built with MODULARIZE, so each call is an independent
 * instance with its own closure — nothing lands in global scope, and a puzzle
 * can be started again after being discarded. The object passed in as
 * `puzzle` is what puzzle-pre.js and puzzle-lib.js talk to.
 */
export async function createPuzzle(options: {
  name: string
  canvas: HTMLCanvasElement
  /** Game id to restore, as it appears after the # in a permalink. */
  gameId?: string
  callbacks: PuzzleCallbacks
}): Promise<{ api: PuzzleApi; renderer: CanvasRenderer }> {
  const { name, canvas, gameId = '', callbacks } = options
  const renderer = new CanvasRenderer(canvas)

  let api: PuzzleApi | null = null
  const prefsKey = `puzzles.prefs.${name}`

  const host = {
    gameId,
    draw: renderer,

    /** Tracked here because the C side reads it back synchronously. */
    selectedPreset: 0,

    attach(bound: PuzzleApi) {
      api = bound
    },

    onReady(presets: Preset[] | null) {
      if (!api) throw new Error('puzzle became ready before it attached')
      callbacks.onReady(presets, api)
    },

    onError: callbacks.onError,
    onStatus: callbacks.onStatus,
    onUndoRedo: callbacks.onUndoRedo,
    onKeyLabels: callbacks.onKeyLabels,
    onPermalinks: callbacks.onPermalinks,
    onPresetSelected: callbacks.onPresetSelected,
    onSolveRemoved: callbacks.onSolveRemoved,
    onDialog: callbacks.onDialog,

    focusCanvas() {
      canvas.focus()
    },

    loadPrefs(): string | null {
      try {
        return window.localStorage.getItem(prefsKey)
      } catch {
        return null
      }
    },

    savePrefs(data: string) {
      try {
        window.localStorage.setItem(prefsKey, data)
      } catch (error) {
        // Private browsing, or the store is full. The game is still playable;
        // the settings just will not outlive the session.
        console.warn('could not save preferences', error)
      }
    },
  }

  const factory = (await import(/* @vite-ignore */ `/engine/${name}.js`)).default
  await factory({ puzzle: host })

  if (!api) throw new Error('puzzle did not attach')
  return { api, renderer }
}
