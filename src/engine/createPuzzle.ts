import type { Dark } from './palette'
import { CanvasRenderer } from './renderer'
import type { Preset, PuzzleApi, PuzzleCallbacks } from './types'

export async function createPuzzle(options: {
  name: string
  canvas: HTMLCanvasElement
  gameId?: string
  dark?: boolean
  spec?: Dark
  defaults?: Readonly<Record<string, string>>
  forced?: Readonly<Record<string, string>>
  callbacks: PuzzleCallbacks
}): Promise<{ api: PuzzleApi; renderer: CanvasRenderer }> {
  const { name, canvas, gameId = '', dark = false, spec, defaults, forced, callbacks } = options
  const renderer = new CanvasRenderer(canvas, spec)
  renderer.setDark(dark)

  let api: PuzzleApi | null = null
  const prefsKey = `puzzles.prefs.${name}`

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

    // 三层,上游逐行赋值、后写的盖先写的,所以位置就是语义:申报的默认值垫在
    // 存档下面(用户改得动),全局的强制值压在存档上面(用户改不动)。整份只要有
    // 一行解析不了,上游把它全丢掉(midend.c:3223),所以行只许在这里拼。
    loadPrefs(): string | null {
      const lines = (from: Readonly<Record<string, string>> | undefined) =>
        Object.entries(from ?? {})
          .map(([kw, value]) => `${kw}=${value}\n`)
          .join('')
      const under = lines(defaults)
      const over = lines(forced)
      let stored = ''
      try {
        stored = window.localStorage.getItem(prefsKey) ?? ''
      } catch {
      }
      // 存档少了收尾的换行就会和压顶那行黏成一个认不出的关键字,补一个。
      if (stored && !stored.endsWith('\n')) stored += '\n'
      return under + stored + over || null
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
