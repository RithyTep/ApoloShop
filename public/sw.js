// ApoloShop Service Worker for PWA Offline Support
const CACHE_NAME = 'apoloshop-v1'
const STATIC_CACHE = 'apoloshop-static-v1'
const DYNAMIC_CACHE = 'apoloshop-dynamic-v1'
const PRODUCT_CACHE = 'apoloshop-products-v1'

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/shop',
  '/offline',
  '/icons/icon-512x512.svg',
  '/apple-icon.png',
  '/placeholder.svg',
  '/placeholder.jpg',
]

// Cache strategies
const CACHE_STRATEGIES = {
  networkFirst: ['api'],
  cacheFirst: ['_next/static', 'icons', 'fonts'],
  staleWhileRevalidate: ['images', 'products'],
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('api')))
    })
  )
  self.skipWaiting()
})

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== PRODUCT_CACHE)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Helper to determine cache strategy
function getCacheStrategy(url) {
  const pathname = new URL(url).pathname

  if (pathname.includes('/api/')) {
    return 'networkFirst'
  }
  if (pathname.includes('/_next/static') || pathname.includes('/icons/') || pathname.includes('/fonts/')) {
    return 'cacheFirst'
  }
  if (pathname.includes('/shop/product/') || pathname.includes('/api/products')) {
    return 'staleWhileRevalidate'
  }
  return 'networkFirst'
}

// Network first strategy - try network, fallback to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }
    throw error
  }
}

// Cache first strategy - try cache, fallback to network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    throw error
  }
}

// Stale while revalidate - return cached, fetch in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(PRODUCT_CACHE)
  const cachedResponse = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => cachedResponse)

  return cachedResponse || fetchPromise
}

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return
  }

  const strategy = getCacheStrategy(request.url)

  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirst(request))
      break
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request))
      break
    default:
      event.respondWith(networkFirst(request))
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-wishlist') {
    event.waitUntil(syncWishlist())
  }
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart())
  }
})

// Sync wishlist when back online
async function syncWishlist() {
  try {
    const pendingWishlist = await getFromIndexedDB('pending-wishlist')
    if (pendingWishlist && pendingWishlist.length > 0) {
      for (const item of pendingWishlist) {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
      }
      await clearFromIndexedDB('pending-wishlist')
    }
  } catch (error) {
    console.error('Failed to sync wishlist:', error)
  }
}

// Sync cart when back online
async function syncCart() {
  // Cart is stored locally, no sync needed
  // But could be used for analytics or server-side cart persistence
}

// IndexedDB helpers for offline data
function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('apoloshop-offline', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        resolve([])
        return
      }
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const getRequest = store.getAll()
      getRequest.onsuccess = () => resolve(getRequest.result)
      getRequest.onerror = () => reject(getRequest.error)
    }
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

function clearFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('apoloshop-offline', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        resolve()
        return
      }
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => resolve()
      clearRequest.onerror = () => reject(clearRequest.error)
    }
  })
}

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-512x512.svg',
    badge: '/apple-icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/shop',
    },
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ApoloShop', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/shop'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_PRODUCTS') {
    event.waitUntil(cacheProducts(event.data.products))
  }
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches())
  }
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Cache products for offline viewing
async function cacheProducts(products) {
  const cache = await caches.open(PRODUCT_CACHE)
  for (const product of products) {
    // Cache product data as JSON
    const response = new Response(JSON.stringify(product), {
      headers: { 'Content-Type': 'application/json' },
    })
    await cache.put(`/api/products/${product.id}`, response)

    // Cache product image if available
    if (product.imageUrl) {
      try {
        const imgResponse = await fetch(product.imageUrl)
        if (imgResponse.ok) {
          await cache.put(product.imageUrl, imgResponse)
        }
      } catch (e) {
        // Ignore image caching errors
      }
    }
  }
}

// Clear all caches
async function clearAllCaches() {
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}
