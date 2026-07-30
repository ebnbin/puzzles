import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

/*
 * What the app is showing, held in memory.
 *
 * This app is one page. There are two things it can show — the gallery, and a
 * puzzle over it — and which one is a variable here, not an address. That is
 * the whole of the change from the router this replaces, and most of what used
 * to be difficult goes with it: no path to parse, no view to resolve out of a
 * URL, no launcher to plant behind a deep link, no rewrite rule to make
 * `/solo` reach the app at all.
 *
 * ---------------------------------------------------------------------------
 * THE ADDRESS IS ALWAYS THE SAME ONE
 * ---------------------------------------------------------------------------
 *
 * `/`, whatever is open. Nothing about the view is written into it, and any
 * other path a reader arrives on is normalised to it.
 *
 * There was a hash here for a while — `/#solo`, a mirror of the open puzzle —
 * on the grounds that it let a refresh come back to the same puzzle and let a
 * tile be middle-clicked into a tab of its own. The first of those was free
 * already: `puzzles.last` is written when a puzzle opens and cleared when the
 * gallery is reached, so it says exactly what the hash said, and the reload
 * path reads it either way. The second was real and is given up.
 *
 * What it cost was worth more. `/#solo` is half a share link: copy it out of
 * the bar, send it, and it opens Solo without the position — which is exactly
 * the confusion between "the app" and "a puzzle worth sending to somebody"
 * that keeping those two apart is meant to prevent. One fixed address means
 * every link copied out of the app is unambiguously the app, and a position
 * gets its own shape.
 *
 * A consequence, stated plainly: the app is now effectively single-tab. Two
 * tabs share one `puzzles.last`, so reloading either lands on whichever wrote
 * last. Multiple tabs were what the middle click was for, so this is the same
 * trade and not a second one.
 *
 * ---------------------------------------------------------------------------
 * WHAT BACK DOES, AND HOW IT KNOWS
 * ---------------------------------------------------------------------------
 *
 * Opening a puzzle from the gallery pushes one history entry, so the browser's
 * own Back — and Android's gesture — return to the gallery rather than leaving.
 * That is the only push in the app.
 *
 * Whether that entry exists is remembered here, in `pushed`, by the document
 * that pushed it. The router before this asked `history.state` instead, and a
 * mark in `history.state` is not the same fact: it survives into a document
 * whose back entries do not, which is a tab the browser discarded and rebuilt,
 * and there Back went somewhere else entirely. So the mark is not consulted
 * for that. It is read for one narrower purpose — which puzzle a forward entry
 * names — where it is the only place that could say.
 *
 * The bar's own arrow does not need any of this: it calls `showGallery`, which
 * changes a variable. It cannot fail, whatever the history behind it looks
 * like. A puzzle reached by refreshing has no pushed entry, so the browser's
 * Back leaves the app there while the arrow still works — the one case where
 * the two disagree, and the cheap side of a trade that removes a class of bug.
 */

const POP = 'popstate'

/** The open puzzle's name, or null for the gallery. */
let view: string | null = null

/** True when *this* document pushed the entry the puzzle is showing on. */
let pushed = false

/**
 * Where the gallery was scrolled to when a puzzle was opened from it.
 *
 * The gallery stops being rendered while a puzzle is up, so the browser has
 * nothing to restore and clamps the position to zero. The one moment it still
 * exists is on the way out.
 */
let galleryScroll = 0

const listeners = new Set<() => void>()

if ('scrollRestoration' in window.history)
  window.history.scrollRestoration = 'manual'

export function takeGalleryScroll(): number {
  return galleryScroll
}

/** The app's one address. Passed to every history call, so any other path a
 *  reader arrives on — an old `/solo` link, a typo — is normalised away. */
const HERE = '/'

function announce() {
  for (const listener of listeners) listener()
}

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown
}

/**
 * Apply the change through a view transition where the browser has one and the
 * reader has not asked for less movement. `flushSync` puts the render inside
 * the captured frame rather than in React's own time, so the transition has a
 * real before and after to cross-fade.
 */
function show(name: string | null) {
  if (view === name) return
  // The old view is still on screen at this instant, so its scroll is real.
  if (view === null && name !== null) galleryScroll = window.scrollY
  view = name

  const start = (document as WithViewTransition).startViewTransition
  if (!start || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    announce()
    return
  }
  start.call(document, () => flushSync(announce))
}

/**
 * Settle the first view, before React exists. Runs once, from main.tsx.
 *
 * `name` is the puzzle to open, which main.tsx takes from `puzzles.last`.
 */
export function start(name: string | null) {
  view = name
  pushed = false
  window.history.replaceState(name ? { game: name } : null, '', HERE)
}

/** The gallery opening a puzzle: one level down, and the app's only push. */
export function openGame(name: string) {
  if (name === view) return
  if (view === null) {
    window.history.pushState({ game: name }, '', HERE)
    pushed = true
  } else {
    // Sideways, from the switcher: the same level, a different puzzle, so Back
    // still means the gallery rather than a trail of the puzzles seen before.
    window.history.replaceState({ game: name }, '', HERE)
  }
  show(name)
}

/**
 * Back to the gallery. A real pop where there is an entry of ours to pop, so
 * the forward button still works; otherwise just the variable.
 */
export function showGallery() {
  if (view === null) return
  if (pushed) {
    // The popstate handler does the rest, and clears `pushed` with it.
    window.history.back()
    return
  }
  window.history.replaceState(null, '', HERE)
  show(null)
}

export function useView(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => view,
  )
}

window.addEventListener(POP, () => {
  // Which puzzle a forward entry names is only recorded in its state; there is
  // nowhere else it could come from. Sitting on an entry we arrived at by
  // popping means there is history either side of it, so `pushed` follows.
  const name = (window.history.state as { game?: string } | null)?.game ?? null
  pushed = name !== null
  show(name)
})
