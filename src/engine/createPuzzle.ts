import type { Dark } from './palette'
import { CanvasRenderer } from './renderer'
import type { Preset, PuzzleApi, PuzzleCallbacks } from './types'

export async function createPuzzle(options: {
  name: string
  canvas: HTMLCanvasElement
  gameId?: string
  dark?: boolean
  spec?: Dark
  seed?: Readonly<Record<string, string>>
  callbacks: PuzzleCallbacks
}): Promise<{ api: PuzzleApi; renderer: CanvasRenderer }> {
  const { name, canvas, gameId = '', dark = false, spec, seed, callbacks } = options
  const renderer = new CanvasRenderer(canvas, spec)
  renderer.setDark(dark)

  let api: PuzzleApi | null = null
  const prefsKey = `puzzles.prefs.${name}`
  const seeded = Object.entries(seed ?? {})
    .map(([kw, value]) => `${kw}=${value}\n`)
    .join('')

  const host = {
    gameId,
    draw: renderer,

    // C 侧经 js_get_selected_preset 同步读回,必须在 command(2) 前就位;
    // TS 侧没有读者,但不是死字段。
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
    onTimer: callbacks.onTimer,

    focusCanvas() {
      canvas.focus()
    },

    // 种子垫在存档下面:上游逐行赋值,后写的盖先写的,于是用户存过的那几条赢、
    // 没存过的落到种子。整份只要有一行解析不了,上游就把它全丢掉(midend.c:3223),
    // 所以行只许在这里拼。
    loadPrefs(): string | null {
      try {
        return (seeded + (window.localStorage.getItem(prefsKey) ?? '')) || null
      } catch {
        return seeded || null
      }
    },

    savePrefs(data: string) {
      try {
        window.localStorage.setItem(prefsKey, data)
      } catch (error) {
        console.warn('could not save preferences', error)
      }
    },
  }

  const factory = (await import(/* @vite-ignore */ `/engine/${name}.js`)).default
  await factory({ puzzle: host })

  if (!api) throw new Error('puzzle did not attach')
  return { api, renderer }
}
