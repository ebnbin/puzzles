import type { KeyIcon } from '../Icon'

export interface Preset {
  name: string
  value: number | null
  submenu?: Preset[]
}

export type DialogControl =
  | { kind: 'string'; label: string; value: string }
  | { kind: 'choices'; label: string; choices: string[]; value: number }
  | { kind: 'boolean'; label: string; value: boolean }

export interface DialogSpec {
  title: string
  // 与 C 共享的活对象:dialogOk 时 puzzle-lib 的闭包从原对象上读回 value,
  // 编辑必须原地赋 control.value;拷贝或重建会让对话框永远提交初始值。
  controls: DialogControl[]
}

export interface PuzzleApi {
  mousedown(x: number, y: number, button: number): boolean
  mousemove(x: number, y: number, buttons: number): boolean
  mouseup(x: number, y: number, button: number): boolean
  key(
    keyCode: number,
    key: string,
    char: string,
    location: number,
    shift: number,
    ctrl: number,
  ): boolean

  resize(w: number, h: number): void
  restoreSize(): void
  rescale(): void

  enterGameId(): void
  enterSeed(): void
  selectPreset(n: number): void
  newGame(): void
  restart(): void
  undo(): void
  redo(): void
  solve(): void
  preferences(): void

  dialogOk(): void
  dialogCancel(): void

  saveGame(): string
  loadGame(text: string): void

  tick(seconds: number): void

  // 丢弃 puzzle 前必须调用:wasm 没有 teardown,计时中的 rAF 链会抓着死实例永远跑。
  stopTimer(): void

  // 以下五个是后开的洞(见 scripts/build-games.sh 的 EXPORTS)。全部可选,因为
  // sw.js 对 /engine/** 是 stale-while-revalidate:老用户第一次访问跑的是上一版
  // 引擎,那时它们不存在。每个调用点都要能降级,不能假设有。
  status?(): number
  requestKeys?(): { button: number; label: string | null }[]
  freezeTimer?(proportion: number): void
}

export type KeyAction = 'possible' | 'single' | 'blank'

// 区域 A 的键属于哪一类。判据是 docs/keys.md 那条,不是「常不常用」:
//   need 没有它这一局玩不完(擦不掉写错的数就填不完)
//   aid  它做的事都能一步一步用别的方式做到(提示、铺标记、高亮)
// 方向键方案的那一类(三类)一个都不在这里,全在 pad.ts。样式只看它,所以是
// 必填——漏标一个 tsc 就会说话。
export type KeyKind = 'need' | 'aid'

export interface KeyLabel {
  kind: KeyKind
  button: number
  action?: KeyAction
  label?: string
  value?: number
  icon?: KeyIcon
  whose?: 'upstream' | 'ours'
}

export interface PuzzleCallbacks {
  onReady(presets: Preset[] | null, api: PuzzleApi): void
  onError(message: string): void
  onStatus(text: string | null): void
  onUndoRedo(undo: boolean, redo: boolean): void
  onKeyLabels(lsk: string, csk: string): void
  onPermalinks(desc: string, seed: string | null): void
  onPresetSelected(index: number): void
  onSolveRemoved(): void
  onDialog(spec: DialogSpec | null): void
  onTimer(running: boolean): void
}

declare global {
  interface Window {
    // package.json 之外的脚本(build-tiles/howto/art、check-*.mjs)经 playwright
    // 靠这两个全局驱动引擎:app 内没有读者,但不是死代码。
    __puzzle?: PuzzleApi
    __animating?: boolean
  }
}
