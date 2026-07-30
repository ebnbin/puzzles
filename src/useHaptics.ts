import { useSyncExternalStore } from 'react'

/**
 * A tick of vibration when a long press fires.
 *
 * A long press has no downstroke of its own — the finger is already down
 * when it happens — so a small buzz is the only way the hand hears "that
 * took". On by default where the device can do it at all; iOS Safari has no
 * vibration API, so there the setting does not even appear.
 *
 * A module store, like the theme: the launcher's tiles and the keypad both
 * ask, and the switch lives in the settings dialog.
 */

const KEY = 'puzzles.haptics'

export const canBuzz = () => typeof navigator.vibrate === 'function'

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

let current = read()

const listeners = new Set<() => void>()

export function setHaptics(next: boolean) {
  current = next
  try {
    window.localStorage.setItem(KEY, next ? 'on' : 'off')
  } catch {
    // Private browsing or a blocked store — the choice just won't persist.
  }
  for (const listener of listeners) listener()
}

/** The tick itself. A no-op when turned off or not supported. */
export function buzz() {
  if (current && canBuzz()) navigator.vibrate(15)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => current

export function useHaptics(): [boolean, (next: boolean) => void] {
  return [useSyncExternalStore(subscribe, snapshot, snapshot), setHaptics]
}
