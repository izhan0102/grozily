/**
 * Grozily Service Worker
 * This service worker enables notifications on mobile devices
 */

// Service Worker Version
const SW_VERSION = '1.0.0';

// Log when service worker is installed
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing Service Worker v' + SW_VERSION);
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
});

// Log when service worker is activated
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating Service Worker v' + SW_VERSION);
  
  // Claim clients to ensure the service worker controls all pages
  event.waitUntil(self.clients.claim());
  
  return self.clients.claim();
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received:', event.notification.tag);
  
  // Close the notification
  event.notification.close();
  
  // Handle different notification tags
  if (event.notification.tag === 'welcome-notification') {
    // Open the homepage
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.notification.tag === 'cart-notification') {
    // Open the cart page
    event.waitUntil(
      clients.openWindow('/cart.html')
    );
  } else if (event.notification.tag === 'order-notification') {
    // Open the orders page
    event.waitUntil(
      clients.openWindow('/orders.html')
    );
  } else {
    // Default action: Focus or open the app
    event.waitUntil(
      clients.matchAll({
        type: 'window'
      })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Handle notification close event
self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
});

// Handle push messages (for future implementation)
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);
  
  let title = 'Grozily Notification';
  let options = {
    body: 'New update from Grozily!',
    icon: 'images/notifications/offer-notification.svg',
    badge: 'images/logo-badge.png',
    vibrate: [200, 100, 200]
  };
  
  // Check if there's a payload
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = {...options, ...data.options};
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Optional: Handle fetch events for offline capabilities
self.addEventListener('fetch', function(event) {
  // Just pass through for now
  event.respondWith(fetch(event.request));
}); 