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
   * Absent on a key that puts nothing in a square — everything with a `whose`,
   * and Dominosa's digits, which light dominoes up rather than filling anything
   * in.
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
   * The board's own colour number this key is a picture of, and the number to
   * draw its rim and its digit in — for the keys that put a colour rather than
   * a symbol into a square. Guess's pegs are all of them.
   *
   * Numbers rather than colour strings, because the string is not knowable
   * here: what the board draws with is the game's own palette put through the
   * dark-board rewrite, and only the renderer holds the result. PuzzleHost
   * looks these up and PuzzleKeypad paints them, so a swatch cannot agree with
   * the board in one theme and disagree in the other.
   *
   * Which slot is which is the game's business, so it is stated in keys.ts
   * beside the rule that builds these keys.
   */
  slot?: number
  ink?: number
  /**
   * Turns a key that clears what is *under* the cursor into one that clears
   * what is *behind* it, which is what a key drawn as a backspace has to mean.
   *
   * `step` is the arrow that means "behind". The press is tried where the
   * cursor is first and the step only happens if it was wasted, so a reader
   * who has walked the cursor onto something and pressed this still takes that
   * one — the two readings only differ on an empty cell, where upstream's does
   * nothing at all. `notAt` lists the labels at which the cursor is not on
   * anything this key may touch, and there the step comes first instead.
   *
   * PuzzleHost is where this is carried out, and where the one back end
   * message that makes it possible is written down.
   */
  behind?: { step: string; notAt?: readonly string[] }
  /**
   * Whose key this is, which is what tells the three looks apart.
   *
   * Absent is the ordinary key: a digit, a monster, clear. `upstream` is a
   * letter the back end already reads and has never offered a button for — M,
   * H, J — which exists here only because a touch device cannot type it.
   * `ours` is a key no back end has heard of, answered on this side through
   * the save file; there are three, and engine/marks is all of them.
   *
   * It is three values rather than a flag because it is three things on the
   * screen, and the same three are now spent on the row of buttons below the
   * keypad as well — see index.css, where the ladder is set out once for both.
   *
   * It was called `aid` while the keypad was the only place it applied, and
   * that word meant "acts on the whole board rather than on one square". True
   * of M and of H; false of an arrow key and false of the menu, both of which
   * wear the same two looks down there. What is left once those arrived is the
   * axis the two rows really share, which is whose the press is — and which
   * this field was already sorting by.
   */
  whose?: 'upstream' | 'ours'
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
