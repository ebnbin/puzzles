// 改了缓存规则、或 public/ 里有东西改名:CACHE 必须升版本,老条目比部署活得久。
const CACHE = 'puzzles-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll 名单少一条就整个 reject,worker 永不激活,离线支持一起没。
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

  // 放行的三个目录和 vercel.json 给它们发缓存头的那条是一对,两处一起改。
  if (/^\/(tiles|howto|art)\//.test(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
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
      // 命中也要让 fresh 在后面刷新条目:/engine/** 是同地址换内容的 URL,
      // 纯 cache-first 会把旧引擎永久钉死;这样陈旧度被限成「一次访问深」。
      if (!hit) return fresh
      event.waitUntil(fresh.catch(() => {}))
      return hit
    }),
  )
})
