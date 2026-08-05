import { useSyncExternalStore } from 'react'

/**
 * Light or dark. Two states, and nothing else.
 *
 * There used to be a third — follow the machine — and it was the default. It
 * has gone, and with it the distinction between what the reader chose and what
 * that came to: one value, one answer, and the control that sets it is a single
 * press. `useTheme` gives that value; there is no second hook to ask what is
 * actually on the screen, because the question no longer has two answers.
 *
 * What it costs is real and worth stating: a reader arriving for the first time
 * on a phone that is set to dark now gets a light app until they press the
 * button. Nothing follows the machine any more — not this, and not the manual,
 * which resolves the same key its own way in build-doc.mjs and stopped
 * following it at the same time.
 *
 * ---------------------------------------------------------------------------
 * ANYTHING THAT IS NOT `dark` IS LIGHT, AND IS WRITTEN BACK AS SUCH
 * ---------------------------------------------------------------------------
 *
 * The stored key is unchanged, so every reader keeps their choice: `dark` is
 * still dark. What is gone is `system`, which some readers have stored
 * explicitly and which everyone who never chose has by absence — both now read
 * as light.
 *
 * They are also written back as `light`, once, on the way past. Not tidiness:
 * the manual is a second page reading the same key, and leaving `system` or
 * nothing in there would have it resolving to whatever this reader's machine
 * says while the app shows light. One write settles both.
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

/** What the reader has, which is all there is to have. */
export type Theme = 'light' | 'dark'

/**
 * The name kept for what is on the screen, which is now the same thing.
 *
 * Left as an alias rather than replaced everywhere: the callers that ask for it
 * are asking "what am I drawing against", and that is a different question from
 * "what is the setting" even when the two cannot disagree.
 */
export type Resolved = Theme

const KEY = 'puzzles.theme'
const BAR = { light: '#fafaf9', dark: '#101013' }

/** Only `dark` is dark. Absent, `system`, or anything else is light. */
function read(): Theme {
  try {
    return window.localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function write(theme: Theme) {
  try {
    window.localStorage.setItem(KEY, theme)
  } catch {
    // Private browsing or a blocked store — the choice just won't persist.
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BAR[theme])
}

let theme = read()
apply(theme)

/*
 * Say it out loud if the store was holding something else — `system`, or
 * nothing at all. See the note above: the manual reads this key too, and until
 * it says `light` the two pages can disagree about a reader who has never
 * pressed anything.
 */
try {
  if (window.localStorage.getItem(KEY) !== theme) write(theme)
} catch {
  // Nothing to normalise if nothing can be read.
}

const listeners = new Set<() => void>()

function settle(next: Theme) {
  if (next === theme) return
  theme = next
  apply(next)
  for (const listener of listeners) listener()
}

/*
 * The manual is a second tab — the settings open it in one — and two tabs
 * sharing one setting have to agree about it. Turn the lights off in the
 * manual, come back to the app, and without this the app is still light and its
 * button is offering to do what the reader has just done.
 *
 * `storage` fires in every other document of the origin and never in the one
 * that wrote, which is exactly the shape of the problem. The manual has the
 * same listener, in its own few lines, in build-doc.mjs.
 */
window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== KEY) return
  settle(read())
})

export function setTheme(next: Theme) {
  if (next === theme) return
  write(next)
  settle(next)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const take = () => theme

/** The setting, and what is on the screen: one value now. */
export function useTheme(): [Theme, (next: Theme) => void] {
  return [useSyncExternalStore(subscribe, take, take), setTheme]
}

/** What is being drawn against. Same answer, asked for a different reason. */
export function useResolvedTheme(): Resolved {
  return useSyncExternalStore(subscribe, take, take)
}
