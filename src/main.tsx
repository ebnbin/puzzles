import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { clearLast, readLast } from './engine/saves'
import games from './games.json'
import './index.css'
import { start } from './view'

/*
 * Settle the first view before React exists, once per document.
 *
 * Nothing in the address says what to open — there is only one address — so the
 * last puzzle played is what a cold start or a refresh comes back to, which is
 * also what makes the gallery a place you choose to be rather than a toll gate.
 * A remembered name that is not a puzzle is stale and cleared, rather than left
 * to strand every start on the not-found view.
 */
{
  const last = readLast()
  const target = last && games.some((g) => g.name === last) ? last : null
  if (last && !target) clearLast()
  start(target)
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
