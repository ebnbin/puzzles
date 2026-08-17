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

// 按钮一共五类,判据和逐游戏的归属在 docs/keys.md。**不要用编号称呼它们**,用名字:
//   act    undo / redo / type / menu。作用于这一局,不作用于棋盘;下方区域,总在
//   need   写进格子的符号(数字、⌫、怪物)。没有它这一局玩不完
//   arrow  方向键本体和它的伴生键。存在的理由是有个光标;下方区域,跟 puzzles.arrows
//   pick   往光标那儿放什么(Map 的区域色、Guess 的颜色钉)。同样跟 puzzles.arrows
//   aid    提示、铺标记、重排、高亮。它做的事都能一步一步用别的方式做到
// act 和 arrow 各自独占一个容器(.play-acts / .play-arrows),类别由结构决定,不存;
// 剩下三类挤在同一个 .keypad 里,所以只有它们要写在 KeyLabel.kind 上。
// **这个联合的顺序就是上方区域的排列顺序**,keysFor 按它稳定排序。
export type KeyKind = 'need' | 'pick' | 'aid'

export interface KeyLabel {
  kind: KeyKind
  button: number
  action?: KeyAction
  label?: string
  value?: number
  icon?: KeyIcon
  // 颜色钉:引擎调色板的下标,不是 CSS 颜色——颜色要等 renderer 翻完主题才有。
  slot?: number
  ink?: number
  dotted?: boolean
  // map:这个键往光标那个区域涂什么。走存档门,不发按键。
  paints?: { colour: number; pencil?: boolean }
  // guess:先把调色板光标顶到这个颜色,再按 Enter——上游「上下选色 + 确认」那一串。
  reach?: { home: string; step: string; span: number; at: number }
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
