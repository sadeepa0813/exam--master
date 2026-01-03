// ==========================================
// EXAM MASTER - SERVICE WORKER
// Advanced PWA Features with Offline Support
// ==========================================

const CACHE_NAME = 'exam-master-v3.0';
const CACHE_VERSION = '3.0.0';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/admin.css',
  '/app.js',
  '/admin.js',
  '/manifest.json',
  
  // External assets
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap',
  
  // Fallback images
  'https://api.dicebear.com/7.x/shapes/svg?seed=exammaster&backgroundColor=667eea&shapeColor=764ba2'
];

// ==================== INSTALL EVENT ====================
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(PRECACHE_ASSETS)
          .then(() => {
            console.log('[Service Worker] All assets cached');
          })
          .catch(error => {
            console.error('[Service Worker] Cache failed:', error);
          });
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// ==================== ACTIVATE EVENT ====================
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// ==================== FETCH EVENT ====================
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Otherwise, fetch from network
        return fetch(event.request)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the new response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] Caching new resource:', event.request.url);
              });
            
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            
            // If offline and requesting a page, show offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
            
            // For API requests, return error response
            if (event.request.url.includes('supabase')) {
              return new Response(
                JSON.stringify({ 
                  error: 'Network error',
                  message: 'You are offline. Please check your connection.'
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
            
            // For images, return a fallback
            if (event.request.destination === 'image') {
              return caches.match('https://api.dicebear.com/7.x/shapes/svg?seed=exammaster&backgroundColor=667eea&shapeColor=764ba2');
            }
            
            throw error;
          });
      })
  );
});

// ==================== BACKGROUND SYNC ====================
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Sync pending comments
async function syncComments() {
  console.log('[Service Worker] Syncing comments...');
  
  try {
    const cache = await caches.open('pending-comments');
    const keys = await cache.keys();
    
    for (const request of keys) {
      const comment = await cache.match(request);
      if (comment) {
        // Try to send to server
        const response = await fetch('/api/comments', {
          method: 'POST',
          body: await comment.json(),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          await cache.delete(request);
          console.log('[Service Worker] Comment synced successfully');
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
  }
}

// Sync notification reads
async function syncNotifications() {
  console.log('[Service Worker] Syncing notifications...');
  
  try {
    const cache = await caches.open('notification-reads');
    const keys = await cache.keys();
    
    for (const request of keys) {
      const data = await cache.match(request);
      if (data) {
        // Mark notification as read on server
        const response = await fetch('/api/notifications/read', {
          method: 'POST',
          body: await data.json()
        });
        
        if (response.ok) {
          await cache.delete(request);
          console.log('[Service Worker] Notification sync successful');
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Notification sync error:', error);
  }
}

// ==================== PUSH NOTIFICATIONS ====================
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {
    title: 'Exam Master SL',
    body: 'නව යාවත්කාලීනයක් ලැබුණි!',
    icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=exammaster&backgroundColor=667eea&shapeColor=764ba2',
    badge: 'https://api.dicebear.com/7.x/shapes/svg?seed=badge&backgroundColor=667eea',
    tag: 'exammaster-notification',
    data: {
      url: '/'
    }
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.log('Push data parsing error:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'විවෘත කරන්න'
      },
      {
        action: 'close',
        title: 'වසන්න'
      }
    ],
    requireInteraction: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ==================== NOTIFICATION CLICK ====================
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(clientList => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ==================== BACKGROUND PERIODIC SYNC ====================
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-content') {
    console.log('[Service Worker] Periodic sync for content updates');
    event.waitUntil(updateContent());
  }
});

async function updateContent() {
  try {
    // Update exams
    const examsResponse = await fetch('/api/exams');
    if (examsResponse.ok) {
      const exams = await examsResponse.json();
      const cache = await caches.open(CACHE_NAME);
      cache.put('/api/exams', new Response(JSON.stringify(exams)));
    }
    
    // Update notifications
    const notifsResponse = await fetch('/api/notifications');
    if (notifsResponse.ok) {
      const notifications = await notifsResponse.json();
      const cache = await caches.open(CACHE_NAME);
      cache.put('/api/notifications', new Response(JSON.stringify(notifications)));
    }
    
    console.log('[Service Worker] Content updated successfully');
  } catch (error) {
    console.error('[Service Worker] Periodic sync error:', error);
  }
}

// ==================== MESSAGE HANDLING ====================
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_ASSETS') {
    cacheAdditionalAssets(event.data.urls);
  }
});

async function cacheAdditionalAssets(urls) {
  const cache = await caches.open(CACHE_NAME);
  return Promise.all(
    urls.map(url => 
      fetch(url)
        .then(response => cache.put(url, response))
        .catch(error => console.error('Failed to cache:', url, error))
    )
  );
}

// ==================== OFFLINE FALLBACK ====================
// This would be an offline.html file in your project
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="si">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Exam Master SL</title>
    <style>
        body {
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
            color: #e2e8f0;
            font-family: 'Poppins', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
            padding: 20px;
        }
        .container {
            max-width: 500px;
        }
        h1 {
            color: #667eea;
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        p {
            color: #94a3b8;
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .icon {
            font-size: 4rem;
            color: #667eea;
            margin-bottom: 20px;
        }
        button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.3s;
        }
        button:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📶</div>
        <h1>ඔබ ඔෆ්ලයින් වී ඇත</h1>
        <p>කරුණාකර ඔබගේ අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න. ඔබට දැනටමත් සුරක්ෂිත කර ඇති අන්තර්ගතය පමණක් ප්‍රවේශ විය හැකිය.</p>
        <button onclick="location.reload()">නැවත උත්සාහ කරන්න</button>
    </div>
</body>
</html>
`;

// Cache the offline page on install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.put(OFFLINE_URL, new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html' }
      }));
    })
  );
});
