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
   * The value this key puts in a square, as the game numbers it.
   *
   * Not the same as the character on the key, which is why it is carried rather
   * than read off `label`: Unequal draws 1..order as 0..order-1 once order
   * passes nine, so its `0` key places a 1. Only the puzzle that owns the
   * encoding can say, and keys.ts is where that lives.
   *
   * Absent on a key that puts nothing in a square — every aid, and Dominosa's
   * digits, which light dominoes up rather than filling anything in.
   */
  value?: number
  /**
   * The glyph to show instead, named as `Icon` knows it. A key whose
   * character means nothing to anyone who has never seen the keyboard —
   * backspace, or M for "fill in the pencil marks" — is a picture, and what
   * it does is said in words on a long press.
   */
  icon?: KeyIcon
  /**
   * Set on a key that acts on the whole board rather than on one square, and
   * saying whose idea the key is.
   *
   * Absent is the ordinary key: a digit, a monster, clear. `upstream` is a
   * letter the back end already reads and has never offered a button for — M,
   * H, J — which exists here only because a touch device cannot type it.
   * `ours` is a key no back end has heard of, answered on this side through
   * the save file; there are three, and engine/marks is all of them.
   *
   * It is three values rather than a flag because it is three things on the
   * screen: the keypad draws each kind differently, and the reader is owed the
   * difference between a key the game has always had and one this front end
   * made up. See index.css, where the ladder is set out.
   */
  aid?: 'upstream' | 'ours'
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
