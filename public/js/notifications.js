/**
 * Web Push Notifications for Grozily
 * This file handles web push notifications using the Notification API
 */

console.log('========= NOTIFICATIONS SYSTEM LOADING =========');

// Check if notifications are supported
if (!('Notification' in window)) {
    console.error('This browser does not support desktop notification');
} else {
    console.log('Notifications are supported! Current permission:', Notification.permission);
}

// Check if the browser supports notifications
const NotificationHandler = {
    // Store notification permission status
    permission: 'default',
    
    // Notification icon paths
    icons: {
        default: 'images/logo.png',
        badge: 'images/logo-badge.png',
        cart: 'images/notifications/cart-notification.svg',
        order: 'images/notifications/order-notification.svg',
        offer: 'images/notifications/offer-notification.svg',
        welcome: 'images/welcome-banner.jpg'
    },
    
    // Initialize notification system
    init: function() {
        console.log('[NotificationHandler] Initializing notification system');
        
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.log('[NotificationHandler] This browser does not support notifications');
            return false;
        }
        
        // Get current permission status
        this.permission = Notification.permission;
        console.log('[NotificationHandler] Current notification permission:', this.permission);
        
        // Check if user is logged in with Firebase
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    console.log('[NotificationHandler] User is logged in, saving user data');
                    // Save user data to localStorage for personalized notifications
                    this.saveUserData(user);
                    
                    // Ask for permission if not already granted or denied
                    if (this.permission === 'default') {
                        // Delay asking for permission to avoid overwhelming the user
                        setTimeout(() => this.requestPermission(), 3000);
                    }
                }
            });
        }
        
        return true;
    },
    
    // Save user data to localStorage for personalized notifications
    saveUserData: function(user) {
        try {
            if (user) {
                // Save user name
                const userName = user.displayName || '';
                if (userName) {
                    localStorage.setItem('userName', userName);
                    console.log('[NotificationHandler] Saved user name to localStorage:', userName);
                }
                
                // Save user ID
                localStorage.setItem('userId', user.uid);
                
                // If we have an email, save it
                if (user.email) {
                    localStorage.setItem('userEmail', user.email);
                }
                
                // Try to get additional profile data from the database
                if (firebase.database) {
                    firebase.database().ref(`users/${user.uid}`).once('value')
                        .then(snapshot => {
                            const userData = snapshot.val();
                            if (userData) {
                                // If name is available in the database, use it (it might be more up-to-date)
                                if (userData.name) {
                                    localStorage.setItem('userName', userData.name);
                                    console.log('[NotificationHandler] Updated user name from database:', userData.name);
                                }
                                
                                // Save phone number if available
                                if (userData.phoneNumber) {
                                    localStorage.setItem('userPhone', userData.phoneNumber);
                                }
                            }
                        })
                        .catch(error => {
                            console.error('[NotificationHandler] Error fetching user data:', error);
                        });
                }
            }
        } catch (error) {
            console.error('[NotificationHandler] Error saving user data:', error);
        }
    },
    
    // Request notification permission
    requestPermission: function() {
        console.log('[NotificationHandler] Requesting notification permission');
        
        Notification.requestPermission()
            .then(permission => {
                this.permission = permission;
                console.log('[NotificationHandler] Permission status:', permission);
                
                if (permission === 'granted') {
                    // Save permission status in localStorage
                    localStorage.setItem('notificationPermission', 'granted');
                } else {
                    console.log('[NotificationHandler] Permission not granted');
                    localStorage.setItem('notificationPermission', permission);
                }
            })
            .catch(error => {
                console.error('[NotificationHandler] Error requesting permission:', error);
            });
    },
    
    // Track sent notifications in localStorage to prevent duplicates
    saveNotificationSent: function(notificationType, id = null) {
        try {
            const sentNotifications = JSON.parse(localStorage.getItem('sentNotifications') || '{}');
            const now = new Date().toISOString();
            
            // Create a unique key for this notification type and optional ID
            const key = id ? `${notificationType}_${id}` : notificationType;
            
            // Save to localStorage
            sentNotifications[key] = now;
            localStorage.setItem('sentNotifications', JSON.stringify(sentNotifications));
            
            // Clean up old notifications (older than 30 days)
            this.cleanUpOldNotifications();
        } catch (error) {
            console.error('[NotificationHandler] Error saving notification status:', error);
        }
    },
    
    // Check if notification has been sent before
    hasNotificationBeenSent: function(notificationType, id = null) {
        try {
            const sentNotifications = JSON.parse(localStorage.getItem('sentNotifications') || '{}');
            const key = id ? `${notificationType}_${id}` : notificationType;
            
            return !!sentNotifications[key];
        } catch (error) {
            console.error('[NotificationHandler] Error checking notification status:', error);
            return false;
        }
    },
    
    // Clean up old notifications from localStorage to prevent it from growing too large
    cleanUpOldNotifications: function() {
        try {
            const sentNotifications = JSON.parse(localStorage.getItem('sentNotifications') || '{}');
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            let changed = false;
            
            // Remove notifications older than 30 days
            for (const key in sentNotifications) {
                const sentDate = new Date(sentNotifications[key]);
                if (sentDate < thirtyDaysAgo) {
                    delete sentNotifications[key];
                    changed = true;
                }
            }
            
            // Save back to localStorage if changes were made
            if (changed) {
                localStorage.setItem('sentNotifications', JSON.stringify(sentNotifications));
            }
        } catch (error) {
            console.error('[NotificationHandler] Error cleaning up old notifications:', error);
        }
    },
    
    // Send a custom notification
    sendNotification: function(title, options = {}) {
        if (this.permission !== 'granted') {
            console.log('[NotificationHandler] Cannot send notification: permission not granted');
            return false;
        }
        
        try {
            // Check if we're on mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile && 'serviceWorker' in navigator) {
                // Use service worker for mobile
                navigator.serviceWorker.register('service-worker.js')
                .then(function(registration) {
                    // Show notification via service worker
                    registration.showNotification(title, {
                        ...options,
                        icon: options.icon || this.icons.default,
                        badge: options.badge || this.icons.badge,
                        vibrate: options.vibrate || [100, 50, 100]
                    });
                    
                    console.log('[NotificationHandler] Service Worker notification sent');
                })
                .catch(function(error) {
                    console.error('[NotificationHandler] Service Worker registration failed:', error);
                    return false;
                });
                
                return true;
            } else {
                // Set default options
                const defaultOptions = {
                    icon: this.icons.default,
                    badge: this.icons.badge,
                    vibrate: [100, 50, 100]
                };
                
                // Merge default options with custom options
                const notificationOptions = { ...defaultOptions, ...options };
                
                // Create and show notification
                const notification = new Notification(title, notificationOptions);
                
                // Notification click event
                notification.onclick = function(event) {
                    event.preventDefault();
                    
                    // Check if action button was clicked
                    if (event.action && options.actions) {
                        // Find the matching action
                        const action = options.actions.find(a => a.action === event.action);
                        if (action && action.url) {
                            window.open(action.url, '_blank');
                        }
                    } else if (options.url) {
                        window.open(options.url, '_blank');
                    } else if (window.focus) {
                        window.focus();
                    }
                    
                    notification.close();
                };
                
                // Track notification
                if (options.tag) {
                    this.saveNotificationSent(options.tag, options.id);
                }
                
                return true;
            }
        } catch (error) {
            console.error('[NotificationHandler] Error sending notification:', error);
            return false;
        }
    },
    
    // Send a cart notification
    sendCartNotification: function(product) {
        if (this.permission !== 'granted') {
            return false;
        }
        
        // Avoid duplicate notifications for the same product
        if (this.hasNotificationBeenSent('cart_add', product.id)) {
            return false;
        }
        
        // Use custom icon for cart notifications
        const iconUrl = product.imageURL || this.icons.cart || this.icons.default;
        
        // Get user's name if available
        const userName = localStorage.getItem('userName') || '';
        const personalizedTitle = userName ? 
            `${userName}, an item was added to your cart!` : 
            'Item Added to Your Cart';
        
        return this.sendNotification(personalizedTitle, {
            body: `${product.name} has been added to your cart.`,
            icon: iconUrl,
            tag: `cart_add_${product.id}`,
            id: product.id,
            requireInteraction: false,
            silent: true, // No sound for cart notifications to avoid annoying users
            actions: [
                {
                    action: 'view_cart',
                    title: 'View Cart',
                    url: 'cart.html'
                }
            ]
        });
    },
    
    // Send an order status notification
    sendOrderStatusNotification: function(orderData) {
        const { orderId, status, items } = orderData;
        
        // Don't send duplicate notifications
        if (this.hasNotificationBeenSent('order_status', orderId)) {
            console.log('[NotificationHandler] Order status notification already sent for:', orderId);
            return false;
        }
        
        let title = 'Order Update';
        let body = 'Your order status has changed.';
        let icon = this.icons.order || this.icons.default;
        
        // Customize based on status
        switch (status) {
            case 'confirmed':
                title = 'Order Confirmed!';
                body = `Your order #${orderId.slice(-5)} has been confirmed and is being processed.`;
                break;
            case 'preparing':
                title = 'Order Being Prepared';
                body = `Your order #${orderId.slice(-5)} is being prepared.`;
                break;
            case 'out-for-delivery':
                title = 'Out for Delivery';
                body = `Your order #${orderId.slice(-5)} is out for delivery and will arrive soon!`;
                break;
            case 'delivered':
                title = 'Order Delivered';
                body = `Your order #${orderId.slice(-5)} has been delivered. Enjoy!`;
                break;
            case 'cancelled':
                title = 'Order Cancelled';
                body = `Your order #${orderId.slice(-5)} has been cancelled.`;
                break;
        }
        
        return this.sendNotification(title, {
            body,
            icon,
            tag: `order_${orderId}`,
            id: orderId,
            requireInteraction: true,
            actions: [
                {
                    action: 'view_order',
                    title: 'View Order',
                    url: `orders.html?id=${orderId}`
                }
            ]
        });
    },
    
    // Send a special offer notification
    sendSpecialOfferNotification: function(offerData) {
        const { offerId, title, description, discount, expiry } = offerData;
        
        // Don't send duplicate notifications
        if (this.hasNotificationBeenSent('special_offer', offerId)) {
            console.log('[NotificationHandler] Special offer notification already sent for:', offerId);
            return false;
        }
        
        return this.sendNotification(title || `Special Offer: ${discount}% Off!`, {
            body: description || `Limited time offer! Get ${discount}% off on your next order. Expires soon.`,
            icon: this.icons.offer || this.icons.default,
            image: offerData.imageUrl || this.icons.welcome,
            tag: `offer_${offerId}`,
            id: offerId,
            requireInteraction: true,
            actions: [
                {
                    action: 'view_offer',
                    title: 'See Offer',
                    url: offerData.url || 'explore.html'
                }
            ]
        });
    }
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('[NotificationHandler] Document ready, initializing notification system');
    NotificationHandler.init();
});

// Expose globally for direct access
window.NotificationHandler = NotificationHandler; 