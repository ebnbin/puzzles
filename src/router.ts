import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

// Minimal history router. Two routes today (the launcher and a game), so a
// library would be more machinery than the app needs — swap it out when the
// TypeScript rewrite makes real demands of routing.

const POP = 'popstate'

/**
 * Where the launcher was scrolled to when a game was opened from it.
 *
 * The launcher unmounts while a puzzle is up, and with it goes the page
 * height, so the browser clamps the scroll to zero and has nothing left to
 * restore — by the back button or any other way back. The one place the
 * position still exists is the moment of leaving, so it is taken down here
 * and the launcher asks for it when it returns.
 */
let launcherScroll = 0
/** The path in force, kept so a popstate can know what is being left. */
let current = window.location.pathname

// Ours to do: the browser's own restoration has nothing to work with (see
// above), and half-working is worse than declared-off.
if ('scrollRestoration' in window.history)
  window.history.scrollRestoration = 'manual'

export function takeLauncherScroll(): number {
  return launcherScroll
}

/** Note a path change, from either direction, before React hears of it. */
function leave(to: string) {
  // At this instant the old page is still on screen, so the position is
  // still real; a moment later the launcher unmounts and it clamps to zero.
  if (current === '/' && to !== '/') launcherScroll = window.scrollY
  current = to
}

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const sync = () => {
      leave(window.location.pathname)
      setPath(window.location.pathname)
    }
    window.addEventListener(POP, sync)
    return () => window.removeEventListener(POP, sync)
  }, [])
  return path
}

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown
}

/**
 * Swap routes, through a view transition where the browser has one.
 *
 * The history entry is pushed first and outside the transition: the callback
 * runs a frame or two after the click, and the address should not lag the
 * click that changed it.
 *
 * `flushSync` is what makes the rest work: the transition captures the page,
 * runs the callback, and captures it again, so the render has to have happened
 * by the time the callback returns rather than in React's own good time.
 *
 * Skipped when the browser cannot do it, and when the reader has asked for
 * less movement.
 */
export function navigate(to: string) {
  if (to === window.location.pathname) return

  window.history.pushState(null, '', to)
  const render = () => window.dispatchEvent(new PopStateEvent(POP))

  const start = (document as WithViewTransition).startViewTransition
  if (!start || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    render()
    return
  }
  start.call(document, () => flushSync(render))
}

/**
 * Click handler for in-app links. Falls through to the browser for anything
 * the router should not own — modified clicks, other origins, and the
 * unmodified WebAssembly game pages, which are static files outside the SPA.
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
