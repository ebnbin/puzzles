import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/*
 * A history of at most two entries: the launcher, and the game open over it.
 *
 * The whole app is two levels deep — a gallery, and one puzzle at a time — so
 * that is exactly what the back stack holds. The rules that keep it that shape:
 *
 *   - Opening a game from the launcher pushes it: [/] becomes [/, /game], so
 *     Back returns to the gallery.
 *   - Switching from one game to another replaces: [/, /a] becomes [/, /b],
 *     never [/, /a, /b] — Back from any game is the gallery, not a trail of
 *     the games seen before it.
 *   - Back — the bar's arrow and the browser's button alike — is a real pop,
 *     so it unwinds the stack rather than growing it.
 *   - A game entered cold (a shared link, a reload, the reopen of the last
 *     game) has the launcher planted behind it once, at startup, so Back has
 *     somewhere to go. See installHistory.
 *
 * A game entry is marked in history.state; that mark is what tells a reload
 * (already planted) from a fresh arrival (needs planting), and tells Back
 * whether a pop is safe.
 */

const POP = 'popstate'
const GAME = /^\/[a-z]+$/
export const isGamePath = (path: string) => GAME.test(path)

/**
 * Where the launcher was scrolled to when a game was opened from it.
 *
 * The launcher unmounts while a puzzle is up, and with it goes the page
 * height, so the browser clamps the scroll to zero and has nothing left to
 * restore. The one place the position still exists is the moment of leaving,
 * so it is taken down here and the launcher asks for it when it returns.
 */
let launcherScroll = 0
/** The path in force, kept so a change can know what is being left. */
let currentPath = window.location.pathname

// The browser's own restoration has nothing to work with — the launcher is
// gone while a game is up — so it is ours to do, or it half-works.
if ('scrollRestoration' in window.history)
  window.history.scrollRestoration = 'manual'

export function takeLauncherScroll(): number {
  return launcherScroll
}

/** Note a path change, from either direction, before React re-renders. */
function leave(to: string) {
  // The old page is still on screen at this instant, so its scroll is real;
  // a moment later the launcher unmounts and the position is clamped away.
  if (currentPath === '/' && to !== '/') launcherScroll = window.scrollY
  currentPath = to
}

/**
 * Plant the launcher behind a game reached cold, so Back has a gallery to
 * return to. Runs once, before React, from main.tsx.
 *
 * `target` is where the app should end up — usually the address that was
 * loaded, but the launcher may hand in the last game to reopen instead. A
 * reload of a game already planted carries the state mark and is left alone,
 * so the stack does not grow an entry per refresh.
 */
export function installHistory(target: string) {
  // A shared link carries the position in its hash (/net#…), which is not
  // part of the pathname target — keep it, and any query, whenever the game
  // being planted is the one actually loaded.
  const suffix =
    target === window.location.pathname
      ? window.location.search + window.location.hash
      : ''
  if (isGamePath(target)) {
    if (window.history.state?.game !== true) {
      // Fresh arrival — a shared link, a deep link, or the last game the
      // launcher chose to reopen. Plant the launcher, then the game on top.
      window.history.replaceState(null, '', '/')
      window.history.pushState({ game: true }, '', target + suffix)
    } else if (target + suffix !== window.location.pathname + window.location.hash) {
      // Already planted (a reload), only the address differs.
      window.history.replaceState({ game: true }, '', target + suffix)
    }
  } else if (target !== window.location.pathname) {
    window.history.replaceState(null, '', target)
  }
  currentPath = window.location.pathname
}

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown
}

/**
 * Apply a DOM change through a view transition where the browser has one and
 * the reader has not asked for less movement. `flushSync` makes the render
 * happen inside the captured frame rather than in React's own time, so the
 * transition has a real before and after to cross-fade.
 *
 * One place does this, for pushes, replaces and the browser's own back and
 * forward alike, because all of them arrive as a popstate.
 */
function render(setPath: (path: string) => void, to: string) {
  const start = (document as WithViewTransition).startViewTransition
  const run = () => setPath(to)
  if (!start || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    run()
    return
  }
  start.call(document, () => flushSync(run))
}

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const sync = () => {
      const to = window.location.pathname
      leave(to)
      render(setPath, to)
    }
    window.addEventListener(POP, sync)
    return () => window.removeEventListener(POP, sync)
  }, [])
  return path
}

/** Everything below drives that one popstate path, real or synthetic. */
const announce = () => window.dispatchEvent(new PopStateEvent(POP))

/** A new level: the launcher opening a game. */
export function navigate(to: string) {
  if (to === window.location.pathname) return
  window.history.pushState({ game: isGamePath(to) }, '', to)
  announce()
}

/** The same level, a different game: the switcher. */
export function navigateReplace(to: string) {
  if (to === window.location.pathname) return
  window.history.replaceState({ game: isGamePath(to) }, '', to)
  announce()
}

/**
 * Back to the gallery — a pop, so the game entry is unwound rather than a
 * second launcher stacked on top of it. The fallback covers the impossible
 * case of a game with nothing planted behind it.
 */
export function goBack() {
  if (window.history.state?.game === true) window.history.back()
  else navigate('/')
}

/**
 * Click handler for links the router owns. Modified clicks and middle clicks
 * are left to the browser, so a game can still be opened in a new tab.
 */
export function onNavClick(event: React.MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented) return
  if (event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const href = event.currentTarget.getAttribute('href')
  if (!href?.startsWith('/')) return

  event.preventDefault()
  navigate(href)
}

/** The same, for a link whose job is Back rather than forward — the bar's
 *  arrow and the not-found page's way out. */
export function onBackClick(event: React.MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented) return
  if (event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  event.preventDefault()
  goBack()
}
