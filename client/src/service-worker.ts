/// <reference lib="webworker" />

const CACHE_NAME = 'paw-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/',
  '/css/',
  '/js/'
];

// Cache API responses
const API_CACHE = {
  children: new Map<string, Response>(),
  screenings: new Map<string, Response>()
};

self.addEventListener('install', (event: ExtendableMessageEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});

async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cacheKey = `${request.method}:${url.pathname}${url.search}`;
  const entityType = url.pathname.split('/')[2]; // 'children' or 'screenings'

  // For GET requests, try to return cached response if offline
  if (request.method === 'GET') {
    if (!navigator.onLine) {
      const cachedResponse = API_CACHE[entityType]?.get(cacheKey);
      if (cachedResponse) {
        return cachedResponse.clone();
      }
    }

    try {
      const response = await fetch(request);
      if (response.ok) {
        const responseToCache = response.clone();
        API_CACHE[entityType]?.set(cacheKey, responseToCache);
      }
      return response;
    } catch (error) {
      // If offline and no cache, return a network error
      if (!navigator.onLine) {
        return new Response(JSON.stringify({ 
          error: 'Network error',
          offline: true,
          message: 'You are currently offline. Changes will be synced when you are back online.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw error;
    }
  }

  // For POST/PUT/DELETE requests
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Update cache for GET requests of the same entity
      const getCacheKey = `GET:${url.pathname}`;
      API_CACHE[entityType]?.delete(getCacheKey);
    }
    return response;
  } catch (error) {
    // If offline, return a network error
    if (!navigator.onLine) {
      return new Response(JSON.stringify({ 
        error: 'Network error',
        offline: true,
        message: 'You are currently offline. Changes will be synced when you are back online.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}

self.addEventListener('activate', (event: ExtendableMessageEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-pending-operations') {
    event.waitUntil(syncPendingOperations());
  }
});

async function syncPendingOperations() {
  // This will be handled by the sync service in the main thread
  // The service worker just triggers the sync
  return Promise.resolve();
} 