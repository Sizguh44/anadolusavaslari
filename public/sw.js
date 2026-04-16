const STATIC_CACHE = 'anadolu-static-v4-map-runtime-fix'
const APP_SHELL_PATH = new URL('./', self.registration.scope).pathname

const CORE_ASSETS = ['.', 'favicon.svg', 'manifest.webmanifest', 'maps/tr-cities.geojson', 'icons/pwa-any.svg', 'icons/pwa-maskable.svg'].map((path) =>
  new URL(path, self.registration.scope).pathname,
)

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  const networkResponse = await fetch(request)
  if (networkResponse && networkResponse.ok) {
    const responseClone = networkResponse.clone()
    caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone))
  }
  return networkResponse
}

async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse && networkResponse.ok) {
      const responseClone = networkResponse.clone()
      caches.open(STATIC_CACHE).then((cache) => cache.put(APP_SHELL_PATH, responseClone))
    }
    return networkResponse
  } catch {
    return (await caches.match(APP_SHELL_PATH)) ?? new Response('Offline', { status: 503 })
  }
}

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin
}

function shouldUseNetworkFirstAsset(request) {
  if (!isSameOrigin(request)) {
    return false
  }

  const url = new URL(request.url)
  const scopePath = new URL('./', self.registration.scope).pathname
  const relativePath = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : url.pathname

  return (
    relativePath.startsWith('assets/') ||
    relativePath.startsWith('maps/') ||
    relativePath === 'manifest.webmanifest' ||
    /\.(?:js|css|json|geojson)$/i.test(relativePath)
  )
}

async function networkFirstAsset(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse && networkResponse.ok) {
      const responseClone = networkResponse.clone()
      caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone))
    }
    return networkResponse
  } catch {
    return (await caches.match(request)) ?? new Response('Asset unavailable offline', { status: 503 })
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request))
    return
  }

  if (shouldUseNetworkFirstAsset(event.request)) {
    event.respondWith(networkFirstAsset(event.request))
    return
  }

  event.respondWith(
    cacheFirst(event.request).catch(() => new Response('Asset unavailable offline', { status: 503 })),
  )
})
