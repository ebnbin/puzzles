import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

// Minimal history router. Two routes today (the launcher and a game), so a
// library would be more machinery than the app needs — swap it out when the
// TypeScript rewrite makes real demands of routing.

const POP = 'popstate'

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
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
