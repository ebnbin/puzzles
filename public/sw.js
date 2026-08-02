/*
 * Offline support.
 *
 * Documents are fetched from the network first, so a deploy is picked up on
 * the next online visit rather than being pinned by whatever was cached.
 *
 * Everything else is served from the cache and filled in as it is first used,
 * which is what makes a puzzle you have played once playable on a plane.
 *
 * That used to be all: a cache hit was returned and nothing was fetched. It
 * rested on a claim in this comment — that every file here changes its URL
 * when it changes its contents — and the claim was false. Vite hashes the
 * bundles, and the wasm is rebuilt rarely and deliberately, but /doc.css is
 * one file at one address regenerated on every change to the manual's
 * styling. So a reader who had once opened the manual kept that stylesheet
 * for good: new pages, and the rules that were supposed to lay them out from
 * five deploys ago. The light-and-dark button showed both of its faces
 * because the markup carrying two of them arrived to a stylesheet that had
 * never heard of hiding one.
 *
 * So the hit is still returned at once — nothing gets slower, and offline is
 * unaffected — and a fetch goes out behind it to refresh the entry for next
 * time. Hashed URLs cost nothing extra: the request is answered by the
 * browser's own HTTP cache, /engine/ being served `immutable` for a year.
 * Bounded staleness, one visit deep, rather than none.
 *
 * The manual's stylesheet is versioned as well now — build-doc.mjs stamps the
 * digest of its contents into the link — so that page is right on the first
 * visit and not the second. Belt and braces, and the belt is the one that
 * should have been there.
 */

/* Bumped to v2 to throw away the entries pinned under the old rule. */
const CACHE = 'puzzles-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/icon.svg', '/manifest.webmanifest']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        // Offline: the page itself, or failing that the launcher, which is
        // enough to reach any puzzle already cached.
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match('/'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const fresh = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      // The cached copy answers now; the fetch runs on regardless, and its
      // job is the next visit. Offline, there is no next visit to spoil, so
      // the rejection is swallowed where nothing is waiting for it.
      if (!hit) return fresh
      event.waitUntil(fresh.catch(() => {}))
      return hit
    }),
  )
})
