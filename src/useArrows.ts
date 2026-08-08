import { useSyncExternalStore } from 'react'

/**
 * The puzzles the reader has asked for a set of arrow keys on.
 *
 * Every one of these games moves a cursor around its board with the arrow keys
 * — see `readsArrows` in engine/keys.ts for the one that does not — and until
 * now that was reachable only from a keyboard. A phone has none, so the whole
 * of the keyboard half of thirty-nine puzzles was off the table on the device
 * most of them are played on.
 *
 * Off by default, and per puzzle rather than once for all of them. The four
 * keys are not free: they take a row from the board in portrait and a third of
 * the width of the rail in landscape, and that is a bad trade in Solo, where
 * the digits do the work, and a good one in Cube, where the arrows *are* the
 * game. Which of those a puzzle is, is the reader's call and not ours to
 * average.
 *
 * A set of names under one key, the way the put-away games are kept: presence
 * is the flag, so an absent name and a fresh install say the same thing. A
 * module-level store rather than a context, like the theme, the language and
 * the hidden games — the menu writes it and the board reads it, and the two
 * must agree within the frame.
 */

const KEY = 'puzzles.arrows'

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

export function toggleArrows(name: string) {
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

export function useArrows(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
