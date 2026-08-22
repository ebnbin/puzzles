// 生成用的引擎实例:跑在 worker 里,只为了不让 new_desc 冻住主线程。
// 上游没有任何中断/进度机制(midend_new_game 一路同步),所以「取消」只能是
// terminate 这个 worker——主线程那个引擎全程没被碰过,取消等于什么都没发生。
//
// 这里的引擎不画画:三十几个 js_canvas_* 最终都转发给宿主的 draw 对象
// (engine/puzzle-lib.js),给一份空操作就够,不需要 OffscreenCanvas。
import type { DialogSpec, PuzzleApi } from './types'

// 编出来的胶水只用到 window 的这三样(rAF / cancelAF / devicePixelRatio),
// worker 里没有 window,垫上。根治要改 engine/puzzle-lib.js 用 globalThis,
// 但那要重编 40 个引擎(emsdk),不值得为这三行动生成物。
;(globalThis as unknown as { window: unknown }).window = {
  requestAnimationFrame: (f: (t: number) => void) =>
    setTimeout(() => f(performance.now()), 16) as unknown as number,
  cancelAnimationFrame: (t: number) => clearTimeout(t),
  devicePixelRatio: 1,
}

// 自定义参数那条路要选的「预设」,和 useConfigBox 里的同一个约定值。
const CUSTOM_PRESET = -1

export type Deal =
  | { how: 'id'; text: string } // 参数串 / params#seed / params:desc
  | { how: 'preset'; index: number }
  | { how: 'config'; values: readonly (string | number | boolean)[] }

export type Ask = { name: string; deal: Deal }
export type Told = { save: string } | { failed: string }

const nothing = () => {}
const draw = {
  startDraw: nothing, endDraw: nothing, drawUpdate: nothing,
  rect: nothing, clip: nothing, unclip: nothing, line: nothing,
  poly: nothing, circle: nothing, text: nothing,
  setColour: nothing, setSize: nothing,
  newBlitter: nothing, freeBlitter: nothing,
  blitterSave: nothing, blitterLoad: nothing,
  fontMidpoint: () => 0,
  preferredSize: () => null,
  defaultColour: () => null,
}

self.onmessage = async (event: MessageEvent<Ask>) => {
  const { name, deal } = event.data
  let api: PuzzleApi | null = null
  let box: DialogSpec | null = null
  // 参数非法时上游走 error box 而不是抛异常,得从这里接住。
  let failed: string | null = null

  const host = {
    gameId: deal.how === 'id' ? deal.text : '',
    draw,
    selectedPreset: 0,
    attach(bound: PuzzleApi) {
      api = bound
    },
    onReady: nothing,
    onError(message: string) {
      failed = message
    },
    onStatus: nothing,
    onUndoRedo: nothing,
    onKeyLabels: nothing,
    onPermalinks: nothing,
    onPresetSelected: nothing,
    onSolveRemoved: nothing,
    onDialog(spec: DialogSpec | null) {
      box = spec
    },
    onTimer: nothing,
    focusCanvas: nothing,
    // 偏好不影响生成:new_desc 的签名里没有 game_ui,而偏好住在 game_ui。
    loadPrefs: () => null,
    savePrefs: nothing,
  }

  const answer = (told: Told) => postMessage(told)
  try {
    const factory = (await import(/* @vite-ignore */ `/engine/${name}.js`)).default
    await factory({ puzzle: host })
    const engine = api as PuzzleApi | null
    if (!engine) {
      answer({ failed: 'engine did not attach' })
      return
    }
    if (deal.how === 'preset') {
      engine.selectPreset(deal.index)
    } else if (deal.how === 'config') {
      // 照主线程那条路重放一遍:开自定义参数 box、逐格填值、提交。
      // box 的控件是与 C 共享的活对象,必须原地写。
      engine.selectPreset(CUSTOM_PRESET)
      const open = box as DialogSpec | null
      if (!open) {
        answer({ failed: 'custom parameters dialog did not open' })
        return
      }
      open.controls.forEach((control, i) => {
        const value = deal.values[i]
        if (value !== undefined) (control as { value: unknown }).value = value
      })
      engine.dialogOk()
    }
    if (failed) answer({ failed })
    else answer({ save: engine.saveGame() })
  } catch (error) {
    answer({ failed: error instanceof Error ? error.message : String(error) })
  }
}
