/* Card Table service worker — precache shell + runtime cache for assets */
const CACHE = 'cardtable-v4'
const PRECACHE = ['./', './index.html', './manifest.webmanifest']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  const isAppShell =
    request.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html')

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (isAppShell) {
        try {
          const fresh = await fetch(request)
          if (fresh.ok) cache.put(request, fresh.clone())
          return fresh
        } catch {
          const cached = await cache.match(request)
          if (cached) return cached
          if (request.mode === 'navigate') {
            const fallback = await cache.match('./index.html')
            if (fallback) return fallback
          }
          throw new Error('offline')
        }
      }

      const cached = await cache.match(request)
      try {
        const fresh = await fetch(request)
        if (fresh.ok) cache.put(request, fresh.clone())
        return fresh
      } catch {
        if (cached) return cached
        throw new Error('offline')
      }
    }),
  )
})