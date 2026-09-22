export interface Preset {
  name: string
  value: number
}

export type DialogControl =
  | { kind: 'string'; label: string; value: string }
  | { kind: 'choices'; label: string; choices: string[]; value: number }
  | { kind: 'boolean'; label: string; value: boolean }

export interface DialogSpec {
  title: string
  // 与 C 共享的活对象,dialogOk 从原对象读回 value,只能原地改。
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

  // 这三个是后开的洞(build-games.sh 的 EXPORTS 为此多导出 midend_status / midend_request_keys /
  // free_keys / midend_freeze_timer)。全部可选:sw.js 对 /engine/** 是 stale-while-revalidate,老用户
  // 第一次访问跑的是上一版引擎;每个调用点都要能降级。
  status?(): number
  requestKeys?(): { button: number; label: string | null }[]
  freezeTimer?(proportion: number): void
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
