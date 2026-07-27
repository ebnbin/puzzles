/*
 * Offline support.
 *
 * Everything here is a static file that never changes without its URL
 * changing — Vite hashes the bundles, and the puzzles are rebuilt rarely and
 * deliberately — so there is no precache manifest to keep in step. Assets are
 * served from the cache and filled in as they are first used, which also means
 * a puzzle you have played once is playable on a plane.
 *
 * Documents are fetched from the network first, so a deploy is picked up on
 * the next online visit rather than being pinned by whatever was cached.
 */

const CACHE = 'puzzles-v1'

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
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
