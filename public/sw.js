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
 * bundles, and the wasm is rebuilt rarely and deliberately, but /doc/doc.css
 * is one file at one address regenerated on every change to the manual's
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

/* Bumped when a rule here changes, so the entries stored under the old one go:
   v2 threw away what the cache-first rule had pinned, v3 the pictures this
   worker no longer answers for, v4 the ones it went on answering for anyway
   under their new names. */
const CACHE = 'puzzles-v4'

/*
 * `addAll` is all or nothing: one entry that 404s rejects the whole promise,
 * `install` fails, and the worker never activates — so this list is exactly
 * three things that certainly exist, and anything renamed has to be renamed
 * here too. `/icon.svg` sat here after it was replaced by the PNGs, which would
 * have taken offline support down with it.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/icon-192.png', '/manifest.webmanifest']))
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

  /*
   * The pictures are the browser's business, not ours.
   *
   * Answering a request here means calling `respondWith`, and a request
   * answered here is one the browser did not answer from its own memory cache
   * — every `<img>` load in a controlled page comes to this worker instead,
   * and a worker's answer arrives a task later than the frame that wanted it.
   * The gallery is where that shows: going into a puzzle destroys forty `<img>`
   * elements, and coming back builds forty new ones that all have to ask. All
   * forty asked; none was ready for the first frame; the grid painted its grey
   * plates and filled in around 200ms later.
   *
   * Measured with this worker taken out of the way: no requests at all, all
   * forty ready on the first frame, no flash. Measured with the worker in and
   * every cache header tried — a year and `immutable`, a day, `no-cache`, and
   * with the images held open by a live `Image` apiece — forty requests every
   * time. The header is not the variable; the interception is.
   *
   * So these three directories are left to the browser, which caches them under
   * the `Cache-Control` vercel.json gives them and can serve them off its own
   * disk with no network — which is the offline story they had here, kept, and
   * a first frame with pictures in it, which they did not.
   *
   * The list is the same three vercel.json names, and has to stay that way: one
   * grants the cache this relies on, the other steps out of its light. They were
   * `solved` and `monsters` until the sets were renamed, and this half of the
   * pair was left behind — so the help picture and the key art went back to
   * being answered here, silently, with nothing to fail.
   */
  if (/^\/(icons|howto|art)\//.test(url.pathname)) return

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
