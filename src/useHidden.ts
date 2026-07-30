import { useSyncExternalStore } from 'react'

/**
 * The games the reader has put away.
 *
 * Hidden, not gone: they keep their saves, they can still be opened by
 * address, and they wait in a folded-up section at the foot of the launcher.
 * Nothing here records *when* anything was hidden, deliberately — the
 * collection's order is fixed, and a game comes back to exactly the place it
 * has always had, whichever order things were hidden and shown in.
 *
 * A module-level store, like the theme and the language: the launcher and the
 * switcher both ask, and must get the same answer.
 */

const KEY = 'puzzles.hidden'

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

export function toggleHidden(name: string) {
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

export function useHidden(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
