import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { clearLast, readLast } from './engine/saves'
import games from './games.json'
import './index.css'

/*
 * Back into the game that was up when the app was left.
 *
 * Decided here, before React exists, because it must happen exactly once per
 * document: a cold start at the root goes straight to the last game, but
 * navigating to the launcher from inside the app never bounces back — the
 * launcher deletes the key as it mounts. replaceState, so the history holds
 * the game and not a launcher nobody saw.
 */
if (window.location.pathname === '/') {
  const last = readLast()
  if (last) {
    if (games.some((g) => g.name === last))
      window.history.replaceState(null, '', `/${last}`)
    // A name that is not a game would trap every cold start on the
    // not-found page, with the launcher deleting nothing.
    else clearLast()
  }
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
