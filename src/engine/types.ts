/**
 * The contract between the compiled puzzle and its host.
 *
 * `PuzzleApi` is what the C code exposes: every way the interface can act on
 * the game. `PuzzleCallbacks` is the other direction: everything the game
 * wants shown, delivered as data rather than as DOM. Together they are the
 * whole of what upstream's emccpre.js and emcclib.js used to do to the page.
 */
import type { KeyIcon } from '../Icon'

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

  /**
   * Upstream's own entry point for "the room has changed", and the one thing
   * here nothing calls: its guard compares device pixels against logical ones
   * and is wrong exactly where this app asks the question. `rescale` reaches
   * the same midend_size without it. The reasoning, and the symptom it caused,
   * are at the call site in usePuzzleFit.
   */
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

  /**
   * Advance the animation clock by hand, in seconds. Only meaningful once
   * stopTimer has taken the frame loop away from requestAnimationFrame.
   */
  tick(seconds: number): void

  /** Stop the frame timer. Must be called when the puzzle is discarded. */
  stopTimer(): void
}

/**
 * The keys the interface answers itself, because the back end has none to be
 * given: the marks a square can still take, the value where only one is left,
 * and taking every mark off again. See engine/marks for why that arithmetic
 * cannot be asked of the C — and why the first two point opposite ways.
 */
export type KeyAction = 'possible' | 'single' | 'blank'

export interface KeyLabel {
  /**
   * Midend button value. Every puzzle that asks for keys asks only for
   * ASCII ones, so this reaches the game as a one-character `key` string.
   *
   * Zero for a key that carries an `action` instead: there is no button to
   * send, and no button value means none is sent by accident.
   */
  button: number
  /**
   * Answered here rather than forwarded. The board still ends up changed —
   * through the save file, which is the only door a move can be put through
   * without the back end having interpreted a gesture into it.
   */
  action?: KeyAction
  /** What to show on the key, for the ones that are a character. */
  label?: string
  /**
   * The glyph to show instead, named as `Icon` knows it. A key whose
   * character means nothing to anyone who has never seen the keyboard —
   * backspace, or M for "fill in the pencil marks" — is a picture, and what
   * it does is said in words on a long press.
   */
  icon?: KeyIcon
  /**
   * Two kinds of key. One puts something in a square, which is how the
   * puzzle is played; the other asks the puzzle to do something to the
   * board, and exists on this side only because a touch device has no way
   * to type the letter that does it.
   */
  aid?: boolean
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
  /** The puzzle has started or finished animating. */
  onTimer(running: boolean): void
}

declare global {
  interface Window {
    /** The running puzzle, for the icon build and the browser tests. */
    __puzzle?: PuzzleApi
    /** Whether the puzzle is mid-animation. */
    __animating?: boolean
  }
}
