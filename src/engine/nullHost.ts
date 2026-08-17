import type { DialogSpec, PuzzleApi } from './types'

const NOOP = () => {}

// engine/puzzle-lib.js 里 PZ.draw.* 的全集,一个都不能少:C 是无条件调的,缺一个
// 就在用到它的游戏上抛 TypeError。net 不画字所以察觉不到,pattern 会当场炸。
// 那边加了新调用,这里要跟着加;scripts/check-generate.mjs 是这条约束的哨兵。
const nullDraw = {
  startDraw: NOOP,
  endDraw: NOOP,
  drawUpdate: NOOP,
  rect: NOOP,
  line: NOOP,
  poly: NOOP,
  circle: NOOP,
  text: NOOP,
  clip: NOOP,
  unclip: NOOP,
  newBlitter: NOOP,
  freeBlitter: NOOP,
  blitterSave: NOOP,
  blitterLoad: NOOP,
  setColour: NOOP,
  defaultColour: () => null,
  setSize: NOOP,
  preferredSize: () => null,
  fontMidpoint: (height: number) => height / 2,
}

export interface NullHost {
  api: PuzzleApi | null
  dialog: DialogSpec | null
  errors: string[]
}

// 只出题、不画画的宿主:createPuzzle 那套的影子版本,喂给同一个 wasm 工厂。
export function nullHost(): NullHost & Record<string, unknown> {
  const host = {
    gameId: '',
    draw: nullDraw,
    selectedPreset: 0,
    dialogTitle: '',
    api: null as PuzzleApi | null,
    dialog: null as DialogSpec | null,
    errors: [] as string[],

    attach(bound: PuzzleApi) {
      host.api = bound
    },
    onReady: NOOP,
    onError(message: string) {
      host.errors.push(message)
    },
    onDialog(spec: DialogSpec | null) {
      host.dialog = spec
    },
    onStatus: NOOP,
    onUndoRedo: NOOP,
    onKeyLabels: NOOP,
    onPermalinks: NOOP,
    onPresetSelected: NOOP,
    onSolveRemoved: NOOP,
    onTimer: NOOP,
    focusCanvas: NOOP,
    // worker 里没有 localStorage;偏好只进 game_ui,不参与出题,给 null 就行。
    loadPrefs: () => null,
    savePrefs: NOOP,
  }
  return host
}
