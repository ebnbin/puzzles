import { useSyncExternalStore } from 'react'

/**
 * Light or dark. Two states, and light unless the reader has said otherwise.
 *
 * There used to be a third, "system", and it was the default. It is gone with
 * the settings dialog that was the only place able to show three states: what
 * is left is one press, on the gallery, on the puzzle screen and in the
 * manual, and one press cannot mean three things. A reader who wants the
 * system's answer can give it in a tap, and will then keep it.
 *
 * The choice is written to the root as `data-theme`, so the stylesheet never
 * has to ask the system anything: one set of tokens, one attribute, no
 * duplicated dark block. The same three lines run inline in the document head
 * before first paint, which is what stops a dark reader being shown a white
 * page for a frame — and the manual, which has no React, has them too.
 *
 * The browser's own chrome is told as well, or a page holding dark would keep
 * a white address bar around it.
 *
 * Held in a module rather than in a component, the way the language is: the
 * setting outlives every screen, and two screens asking for it must get the
 * same answer.
 */

export type Theme = 'light' | 'dark'

const KEY = 'puzzles.theme'
const BAR = { light: '#fafaf9', dark: '#101013' }

function read(): Theme {
  try {
    return window.localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BAR[theme])
}

let current = read()
apply(current)

const listeners = new Set<() => void>()

/*
 * The manual is a second tab now — the gallery's footer opens it in one — and
 * two tabs sharing one setting have to agree about it. Turn the lights off in
 * the manual, come back to the app, and without this the app is still light
 * and its button is offering to do what the reader has just done.
 *
 * `storage` fires in every other document of the origin and never in the one
 * that wrote, which is exactly the shape of the problem. The manual has the
 * same listener, in its own three lines, in build-doc.mjs.
 */
window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== KEY) return
  const next = read()
  if (next === current) return
  current = next
  apply(next)
  for (const listener of listeners) listener()
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
