/**
 * The contract between the compiled puzzle and its host.
 *
 * `PuzzleApi` is what the C code exposes: every way the interface can act on
 * the game. `PuzzleCallbacks` is the other direction: everything the game
 * wants shown, delivered as data rather than as DOM. Together they are the
 * whole of what upstream's emccpre.js and emcclib.js used to do to the page.
 */

export interface Preset {
  name: string
  /** Null for a submenu heading, which carries `submenu` instead. */
  value: number | null
  submenu?: Preset[]
}

export type DialogControl =
  | { kind: 'string'; label: string; value: string }
  | { kind: 'choices'; label: string; choices: string[]; value: number }
  | { kind: 'boolean'; label: string; value: boolean }

export interface DialogSpec {
  title: string
  /**
   * Live objects — the C side reads `value` back off them when the dialog is
   * accepted, so an editor must assign to it rather than copy.
   */
  controls: DialogControl[]
}

/** Everything the interface may ask of the running game. */
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

  /** Stop the frame timer. Must be called when the puzzle is discarded. */
  stopTimer(): void
}

/** Everything the running game wants the interface to show. */
export interface PuzzleCallbacks {
  /** Presets are null when the back end offers neither presets nor configuration. */
  onReady(presets: Preset[] | null, api: PuzzleApi): void
  onError(message: string): void
  onStatus(text: string | null): void
  onUndoRedo(undo: boolean, redo: boolean): void
  onKeyLabels(lsk: string, csk: string): void
  onPermalinks(desc: string, seed: string | null): void
  onPresetSelected(index: number): void
  onSolveRemoved(): void
  onDialog(spec: DialogSpec | null): void
}
