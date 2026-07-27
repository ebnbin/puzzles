import { useEffect, useState } from 'react'

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

export function navigate(to: string) {
  if (to === window.location.pathname) return
  window.history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent(POP))
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
