import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { readPlaying, readRecent, setPlaying } from './engine/saves'
import games from './games.json'
import './index.css'
import { start } from './view'

/*
 * Settle the first view before React exists, once per document.
 *
 * Nothing in the address says what to open — there is only one address — so a
 * cold start or a refresh comes back to the puzzle it was left in, which is
 * also what makes the gallery a place you choose to be rather than a toll gate.
 * Two facts, and both have to hold: which puzzle was last played, and whether
 * the app was still in it. Leaving one for the gallery clears the second and
 * keeps the first, which is what the gallery marks its tile with.
 *
 * A remembered name that is no longer a puzzle — upstream dropped it, or the
 * store was edited — is stale, and the flag goes rather than being left to
 * strand every start on the not-found view. The name itself can stay: no tile
 * matches it, so nothing is marked, and the next puzzle opened overwrites it.
 */
{
  const playing = readPlaying()
  const recent = readRecent()
  const target =
    playing && recent && games.some((g) => g.name === recent) ? recent : null
  if (playing && !target) setPlaying(false)
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

    /*
     * The forty thumbnails used to be fetched at idle into a cache called
     * `puzzles-v1`, so the gallery would not pay a round trip apiece the first
     * time it drew them.
     *
     * It had stopped working. The worker's cache was renamed to `puzzles-v2`
     * and this name was left behind, so the warm-up filled a cache nothing
     * read — and the worker's `activate`, which deletes every cache but its
     * own, threw it away on each start, whereupon this put it back. Forty
     * fetches a visit, into a bucket with a hole in it, for a year.
     *
     * There is nothing to replace it with. The worker no longer answers for
     * pictures at all (see sw.js): they are the browser's now, and the browser
     * fetches and keeps them without being asked.
     */
  })
}
