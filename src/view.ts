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
 * THE URL IS A MIRROR, NOT A ROUTE
 * ---------------------------------------------------------------------------
 *
 * The open puzzle is still written into the address, as a hash — `/#solo` —
 * and that is all it is: a reflection, kept up to date so that a refresh comes
 * back to the same puzzle and so that a tile can still be middle-clicked into
 * a tab of its own. Nothing reads it to decide what to draw except the one
 * line in `start` that opens the app.
 *
 * A hash rather than a path, deliberately. It never reaches the server, so
 * there is nothing to configure and no address that can 404; and it does not
 * look like a page, which is honest, because it is not one. A puzzle worth
 * sending to somebody is a different thing from a puzzle you happen to have
 * open, and it will get a real address of its own.
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

/**
 * The address that mirrors a given view.
 *
 * Always the root, so the app has exactly one address and any other path a
 * reader arrives on — an old `/solo` link, a typo — is normalised away rather
 * than left sitting in the bar over a gallery.
 */
const mirror = (name: string | null) => (name ? `/#${name}` : '/')

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
 * `name` is the puzzle to open — from the address if it names one, or the last
 * one played, which the launcher hands in. The address is normalised either
 * way, so a stale or nonsense hash does not stay in the bar.
 */
export function start(name: string | null) {
  view = name
  pushed = false
  window.history.replaceState(name ? { game: name } : null, '', mirror(name))
}

/** The gallery opening a puzzle: one level down, and the app's only push. */
export function openGame(name: string) {
  if (name === view) return
  if (view === null) {
    window.history.pushState({ game: name }, '', mirror(name))
    pushed = true
  } else {
    // Sideways, from the switcher: the same level, a different puzzle, so Back
    // still means the gallery rather than a trail of the puzzles seen before.
    window.history.replaceState({ game: name }, '', mirror(name))
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
  window.history.replaceState(null, '', mirror(null))
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

/*
 * The mirror, read the other way.
 *
 * Editing the hash in the address bar is a navigation the app would otherwise
 * miss: it is same-document, so it arrives as `hashchange` and never as a
 * popstate, and `pushState`/`replaceState` do not raise it — so this cannot
 * loop with the writes above. Nothing in the app produces one; it is here so
 * that an address which says `#solo` is showing Solo however it came to say so.
 */
window.addEventListener('hashchange', () => {
  const name = window.location.hash.replace(/^#/, '') || null
  if (name === view) return
  pushed = false
  show(name)
})

/**
 * Click handler for a tile. The href is the mirror address, so a modified or
 * middle click still opens the puzzle in a tab of its own — the one thing the
 * URL is kept for besides refreshing.
 */
export function onTileClick(event: React.MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented) return
  if (event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const name = event.currentTarget.getAttribute('href')?.replace(/^#/, '')
  if (!name) return

  event.preventDefault()
  openGame(name)
}

/** The same, for a link whose job is the way back. */
export function onBackClick(event: React.MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented) return
  if (event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  event.preventDefault()
  showGallery()
}
