import { useSyncExternalStore } from 'react'

/**
 * The puzzles the reader has asked for the ordinary keys on.
 *
 * "Ordinary" is `KeyLabel.whose` being absent: the keys that put something in a
 * square, as against the letters the back end reads and never offered a button
 * for. In most puzzles those are the only way in — a phone cannot type a digit
 * into Solo — and in a few they are a shortcut for something the board already
 * takes by touch. `offersKeys` in engine/keys is the list of the few, and Guess
 * is the whole of it so far: every colour can be dragged from the bar the board
 * draws, and a peg comes off the same way, so the row of swatches saves a drag
 * rather than making one possible.
 *
 * Off by default, and per puzzle, exactly as the arrows are. A row of keys is
 * not free — it is height taken from the board — and whether the trade is worth
 * it depends on how the reader plays, which is not ours to average. Turning this
 * on is additive: nothing goes away, the row appears.
 *
 * A set of names under one key, presence being the flag, which is the shape
 * `puzzles.arrows` and `puzzles.hidden` are already in. Three copies of it now
 * exist; they are three because each has its own reasons to record and no line
 * of behaviour in common, but a shared factory would be a fair thing to want.
 *
 * The key holds what is *on* rather than what is off, so that an absent name
 * and a fresh install say the same thing. That is only possible because the
 * default is off; a setting that shipped on would have had to store its
 * exceptions and be named for them.
 */

const KEY = 'puzzles.keys'

function read(): Set<string> {
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(stored) ? stored.filter((n) => typeof n === 'string') : [])
  } catch {
    return new Set()
  }
}

let current = read()

const listeners = new Set<() => void>()

export function toggleKeys(name: string) {
  // A fresh Set, because the old one has been handed out as a snapshot.
  const next = new Set(current)
  if (!next.delete(name)) next.add(name)
  current = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next]))
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

export function useKeys(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
