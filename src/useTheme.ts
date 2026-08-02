import { useSyncExternalStore } from 'react'

/**
 * Light, dark, or whichever the machine is set to.
 *
 * Three states, and the third is the default: a reader who has said nothing
 * gets what the rest of their device is doing, and a phone that turns itself
 * dark at dusk turns this over with it. Saying anything — either of the other
 * two — means saying it for good, and the system stops being consulted until
 * the reader comes back and asks for it again.
 *
 * It was two for a while, on the reasoning that the only control able to show
 * three states had gone and one press cannot mean three things. The control is
 * back, so the third state is; and the presses elsewhere have not changed
 * meaning, because none of them was ever toggling *within* system — see the
 * manual's button in build-doc.mjs. Each commits to a side.
 *
 * Which means there are two questions with different answers. What did the
 * reader choose — `useTheme`, and only the settings dialog cares — and what is
 * on the screen right now — `useResolvedTheme`, which is what anything drawing
 * has to ask. Under `system` the first is fixed and the second moves.
 *
 * The resolved answer is written to the root as `data-theme`, so the stylesheet
 * never has to ask the system anything: one set of tokens, one attribute, no
 * duplicated dark block guarded by a media query. The same resolution runs
 * inline in the document head before first paint, which is what stops a dark
 * reader being shown a white page for a frame — and the manual, which has no
 * React, has its own copy of it.
 *
 * The browser's own chrome is told as well, or a page holding dark would keep
 * a white address bar around it.
 *
 * Held in a module rather than in a component, the way the language is: the
 * setting outlives every screen, and two screens asking for it must get the
 * same answer.
 */

/** What the reader chose. */
export type Theme = 'light' | 'dark' | 'system'

/** What that comes to right now. The only thing anything drawing should read. */
export type Resolved = 'light' | 'dark'

const KEY = 'puzzles.theme'
const BAR = { light: '#fafaf9', dark: '#101013' }
const DARK = '(prefers-color-scheme: dark)'

/** Absent, or anything this version does not recognise, means system. */
function read(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

const fromSystem = (): Resolved => (window.matchMedia(DARK).matches ? 'dark' : 'light')

const resolve = (chosen: Theme): Resolved =>
  chosen === 'system' ? fromSystem() : chosen

function apply(theme: Resolved) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BAR[theme])
}

let choice = read()
let resolved = resolve(choice)
apply(resolved)

const listeners = new Set<() => void>()

/** Re-resolve, repaint if it moved, and tell the app either way. */
function settle(next: Theme) {
  choice = next
  const now = resolve(next)
  if (now !== resolved) {
    resolved = now
    apply(now)
  }
  for (const listener of listeners) listener()
}

/*
 * The system changing its mind, which matters only while the reader has left it
 * to. Listened for always rather than attached and detached along with the
 * setting: one listener for the life of the tab is cheaper than the
 * bookkeeping, and it costs nothing under the other two choices.
 */
window.matchMedia(DARK).addEventListener('change', () => {
  if (choice === 'system') settle('system')
})

/*
 * The manual is a second tab — the settings open it in one — and two tabs
 * sharing one setting have to agree about it. Turn the lights off in the
 * manual, come back to the app, and without this the app is still light and its
 * settings are offering to do what the reader has just done.
 *
 * `storage` fires in every other document of the origin and never in the one
 * that wrote, which is exactly the shape of the problem. The manual has the
 * same listener, in its own few lines, in build-doc.mjs.
 */
window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== KEY) return
  const next = read()
  if (next === choice) return
  settle(next)
})

export function setTheme(next: Theme) {
  if (next === choice) return
  try {
    // Written out rather than removed for `system`, so that the other tab's
    // `storage` listener is told, and so a stored value always says which of
    // the three it is rather than leaving absence to be interpreted.
    window.localStorage.setItem(KEY, next)
  } catch {
    // Private browsing or a blocked store — the choice just won't persist.
  }
  settle(next)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const takeChoice = () => choice
const takeResolved = () => resolved

/** The setting, for the one control that can show all three of it. */
export function useTheme(): [Theme, (next: Theme) => void] {
  return [useSyncExternalStore(subscribe, takeChoice, takeChoice), setTheme]
}

/** What is on the screen. What every other caller wants. */
export function useResolvedTheme(): Resolved {
  return useSyncExternalStore(subscribe, takeResolved, takeResolved)
}
