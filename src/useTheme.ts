import { useSyncExternalStore } from 'react'

/**
 * Light, dark, or whatever the system says.
 *
 * The choice is resolved to a concrete value here and written to the root as
 * `data-theme`, so the stylesheet never has to ask the system anything: one set
 * of tokens, one attribute, no duplicated dark block. The same six lines run
 * inline in the document head before first paint, which is what stops a dark
 * reader being shown a white page for a frame.
 *
 * The browser's own chrome is told too. A page that forces dark while the
 * system is light would otherwise keep a white address bar.
 *
 * Held in a module rather than in a component, the way the language is: the
 * setting outlives every screen, and two screens asking for it must get the
 * same answer. The system is followed for as long as the app is running, so a
 * change made while a puzzle is open is noticed wherever the switch happens to
 * live.
 */

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'puzzles.theme'
const DARK = '(prefers-color-scheme: dark)'
const BAR = { light: '#fafaf9', dark: '#101013' }

function read(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function apply(theme: Theme) {
  const dark =
    theme === 'dark' || (theme !== 'light' && window.matchMedia(DARK).matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? BAR.dark : BAR.light)
}

let current = read()
apply(current)

const listeners = new Set<() => void>()

window.matchMedia(DARK).addEventListener('change', () => {
  // Only worth acting on while it is being followed.
  if (current === 'system') apply(current)
})

export function setTheme(next: Theme) {
  if (next === current) return
  current = next
  apply(next)
  try {
    window.localStorage.setItem(KEY, next)
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

export function useTheme(): [Theme, (next: Theme) => void] {
  return [useSyncExternalStore(subscribe, snapshot, snapshot), setTheme]
}
