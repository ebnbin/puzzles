import { useSyncExternalStore } from 'react'

/**
 * Whether the reader wants the arrow-key scheme: the on-screen cross, the keys
 * beside it, and the two keypads that only aim through it (Map's swatches) or
 * stand in for it (Guess's whole row — see `padIsArrows` in engine/keys).
 *
 * One answer for the whole app, where it used to be one per puzzle. The
 * per-puzzle shape was built on "which puzzle deserves a row taken off its
 * board is the reader's call", and that reasoning still holds — what it missed
 * is what the row *is*. The arrows are one of three ways of playing (mouse and
 * keyboard, touch, arrows), and which of those suits someone is a fact about
 * their hands and their screen, not about Cube versus Solo. Forty copies of
 * the same answer were forty chances to be surprised that a setting made in
 * one game did nothing in the next.
 *
 * The key survives from the per-puzzle era and the value's meaning changed
 * under it, the same move puzzles.theme made when its third state was
 * retired: only the string 'true' means on, and everything else — including
 * the arrays of game names the old code stored here — reads as off, which is
 * the default. So old values expire silently, and neither direction can
 * throw: this read does not parse, and the old read wrapped its parse in a
 * try/catch and fell back to nothing chosen.
 */
const KEY = 'puzzles.arrows'

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

let current = read()

const listeners = new Set<() => void>()

export function setArrows(on: boolean) {
  current = on
  try {
    window.localStorage.setItem(KEY, String(on))
  } catch {
    // Private browsing or a blocked store — the choice just won't persist.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => current

export function useArrows(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
