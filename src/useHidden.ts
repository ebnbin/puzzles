import { useSyncExternalStore } from 'react'

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
  const next = new Set(current)
  if (!next.delete(name)) next.add(name)
  current = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
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
