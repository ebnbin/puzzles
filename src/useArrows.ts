import { useSyncExternalStore } from 'react'

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
