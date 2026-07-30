import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { clearLast, readLast } from './engine/saves'
import games from './games.json'
import './index.css'
import { installHistory } from './router'

/*
 * Settle the history before React exists, once per document.
 *
 * Where to end up: the address that was loaded — unless it is the root and a
 * last game is remembered, in which case reopen that instead. A remembered
 * name that is not a game is stale and cleared, rather than left to strand
 * every cold start on the not-found page.
 *
 * installHistory then plants the launcher behind whatever game this resolves
 * to, so Back always has a gallery to return to. See router.
 */
{
  let target = window.location.pathname
  if (target === '/') {
    const last = readLast()
    if (last && games.some((g) => g.name === last)) target = `/${last}`
    else if (last) clearLast()
  }
  installHistory(target)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Only in a build: in development a service worker would serve stale modules
// back over Vite's.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Offline is a bonus; the site is fine without it.
      console.warn('service worker registration failed', error)
    })

    // The gallery's forty thumbnails, put into the worker's cache before they
    // are asked for. The worker only keeps what has been fetched at least
    // once, and the server answers with no-cache — so without this, every
    // thumbnail the lazy gallery never reached costs a visible round trip
    // the first time it appears. Only what is missing is fetched, at idle,
    // so a warm start costs nothing.
    const warm = async () => {
      if (!('caches' in window)) return
      try {
        const cache = await caches.open('puzzles-v1')
        await Promise.all(
          games.map(async ({ name }) => {
            const url = `/icons/${name}.png`
            if (!(await cache.match(url))) await cache.add(url)
          }),
        )
      } catch {
        // Same standing as the worker itself: a faster gallery is a bonus.
      }
    }
    if ('requestIdleCallback' in window) requestIdleCallback(() => void warm())
    else setTimeout(() => void warm(), 2000)
  })
}
