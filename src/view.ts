import { useSyncExternalStore } from 'react'
import { readScroll, writeScroll } from './engine/saves'
import { withViewTransition } from './transition'

/*
 * What the app is showing, held in memory.
 *
 * Two screens — the gallery and a puzzle — and the app is on one of them. Not
 * one over the other: there is no stack, no level, nothing opened by anything
 * else. Going from either to the other replaces it, and the one left behind
 * stops existing.
 *
 * ---------------------------------------------------------------------------
 * WHICH MEANS THERE IS NO NAVIGATION
 * ---------------------------------------------------------------------------
 *
 * One address — `/`, always — and one history entry, which nothing here ever
 * adds to. Back leaves the app, from either screen, because there is nothing
 * behind either screen to go back to. That is not a limitation worked around;
 * it is what "two alternating screens" means, said in history.
 *
 * The whole of what used to be difficult was the pretence that these two were
 * a hierarchy. A router resolved one from an address; then a mirror wrote the
 * address from one; then a pushed entry made Back mean "the other one", and
 * knowing whether that entry was really there was its own class of bug — an
 * entry can survive into a document whose history does not. None of it is here.
 * The gallery is a variable being null.
 *
 * What replaced the way back is the name in the bar: it is the gallery's own
 * button, sitting where the puzzle says what it is. Nothing is "closed" to
 * reach the gallery, and nothing is "returned to" — you go there, the same way
 * you go to a puzzle from there.
 *
 * ---------------------------------------------------------------------------
 * WHAT COMES BACK WHEN YOU DO
 * ---------------------------------------------------------------------------
 *
 * Replacing a screen throws it away, so anything worth keeping is kept
 * elsewhere: the puzzle in `puzzles.save.<name>`, written after every move, and
 * the gallery's scroll position below. Which screen the app opens on is
 * `puzzles.playing` — set while a puzzle is up, gone once the gallery is — read
 * against `puzzles.recent` for which puzzle that was, so a cold start resumes
 * whichever of the two you were last on.
 */

/** The open puzzle's name, or null for the gallery. */
let view: string | null = null

/**
 * Where the gallery was scrolled to when a puzzle replaced it.
 *
 * The gallery stops being rendered, so the browser has nothing to restore and
 * clamps the position to zero. The one moment it still exists is on the way out.
 *
 * Held here for the session and mirrored to the store, which is what carries it
 * across a cold start — and a cold start is exactly when it matters most: the
 * app comes back up inside the puzzle you were playing, so the gallery's first
 * appearance of the visit is after a reload, with nothing in memory to restore.
 */
let galleryScroll: number | null = readScroll()

const listeners = new Set<() => void>()

if ('scrollRestoration' in window.history)
  window.history.scrollRestoration = 'manual'

/** Where to open the gallery, or null if it has never said. */
export function takeGalleryScroll(): number | null {
  return galleryScroll
}

export function rememberGalleryScroll(y: number): void {
  galleryScroll = y
  writeScroll(y)
}

function announce() {
  for (const listener of listeners) listener()
}

/**
 * Swap the screen, through a view transition where there is one to be had —
 * see transition.ts, which the gallery's own moves also go through.
 */
function show(name: string | null) {
  if (view === name) return
  // The outgoing screen is still on the page at this instant, so its scroll is
  // real; a moment later it is gone and the position is clamped away.
  if (view === null && name !== null) rememberGalleryScroll(window.scrollY)
  view = name
  withViewTransition(announce)
}

/**
 * Settle the first screen, before React exists. Runs once, from main.tsx.
 *
 * The address is normalised on the way past, so an old `/solo` link or a typo
 * does not sit in the bar over a screen that has nothing to do with it. This is
 * the only history call in the app.
 *
 * Which needs the server to agree: it can only tidy an address that reached the
 * app, and `/solo` is not a file. vercel.json rewrites everything that is not
 * one to `/`, so a wrong address arrives here and is corrected rather than
 * ending at the host's own 404 — the manual and the engine are real files and
 * are matched before the rewrite is consulted. `vite preview` does the same by
 * default, which is why this was never noticed as an assumption.
 */
export function start(name: string | null) {
  view = name
  window.history.replaceState(null, '', '/')
}

/** Show a puzzle. Replaces whatever was there. */
export const openGame = (name: string) => show(name)

/** Show the gallery. Replaces whatever was there. */
export const showGallery = () => show(null)

export function useView(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => view,
  )
}
