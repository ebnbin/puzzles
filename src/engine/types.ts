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

  stopTimer(): void
}

export type KeyAction = 'possible' | 'single' | 'blank'

export interface KeyLabel {
  button: number
  action?: KeyAction
  label?: string
  value?: number
  icon?: KeyIcon
  slot?: number
  ink?: number
  dotted?: boolean
  aimed?: boolean
  needs?: string
  paints?: { colour: number; pencil?: boolean }
  behind?: { step: string }
  advances?: number
  restarts?: boolean
  aims?: { home: string; step: string; span: number; at: number }
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
    __puzzle?: PuzzleApi
    __animating?: boolean
  }
}
