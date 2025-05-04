/**
 * Product Request System for Grozily
 * 
 * This module provides a global system for:
 * 1. Submitting product requests from customers to vendors
 * 2. Notifying customers about request status changes (approved/rejected)
 * 3. Automatically adding approved products to customer carts
 */

// Firebase configuration (in case Firebase isn't initialized elsewhere)
try {
    if (!firebase.apps.length) {
        const firebaseConfig = {
            apiKey: "AIzaSyCtbwkusKvCEYNCHUytaF4tUISNywsADiM",
            authDomain: "grozily2.firebaseapp.com",
            databaseURL: "https://grozily2-default-rtdb.firebaseio.com",
            projectId: "grozily2",
            storageBucket: "grozily2.firebasestorage.app",
            messagingSenderId: "665300145710",
            appId: "1:665300145710:web:4f8d866e07fc902b1131bf",
            measurementId: "G-83S7ZWXEB9"
        };
        
        firebase.initializeApp(firebaseConfig);
        console.log('[ProductRequestSystem] Firebase initialized');
    } else {
        console.log('[ProductRequestSystem] Firebase already initialized');
    }
} catch (error) {
    console.error('[ProductRequestSystem] Error initializing Firebase:', error);
}

// Initialize the Product Request System
const ProductRequestSystem = (function() {
    // Private variables
    let currentUser = null;
    let notificationListeners = [];
    let isInitialized = false;
    let pendingNotifications = [];
    let processedNotifications = new Set(); // Track processed notification IDs
    let requestProcessedStatus = {}; // Track which requests have been processed by status
    let notificationHistoryKey = 'grozily_notification_history'; // localStorage key
    
    // DOM elements for notifications
    let notificationContainer = null;
    
    // Initialize the system
    function init() {
        if (isInitialized) return;
        
        console.log('[ProductRequestSystem] Initializing...');
        
        // Create notification container if it doesn't exist
        createNotificationContainer();
        
        // Load processed notifications from localStorage
        loadProcessedNotifications();
        
        // Clear old notifications to prevent localStorage from growing too large
        clearOldNotifications();
        
        // Check if user is logged in
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                currentUser = user;
                console.log('[ProductRequestSystem] User authenticated:', user.uid);
                
                // Listen for notifications for this user
                setupNotificationListener();
                
                // Check for any pending requests that need action
                checkPendingRequests();
            } else {
                currentUser = null;
                console.log('[ProductRequestSystem] User not authenticated');
                
                // Clear any notification listeners
                clearNotificationListeners();
            }
        });
        
        isInitialized = true;
        console.log('[ProductRequestSystem] Initialization complete');
    }
    
    // Load processed notifications from localStorage
    function loadProcessedNotifications() {
        try {
            const savedData = localStorage.getItem(notificationHistoryKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                
                // Load processed notification IDs
                if (parsedData.processedIds && Array.isArray(parsedData.processedIds)) {
                    processedNotifications = new Set(parsedData.processedIds);
                    console.log('[ProductRequestSystem] Loaded', processedNotifications.size, 'processed notification IDs from localStorage');
                }
                
                // Load request status tracking
                if (parsedData.requestStatus && typeof parsedData.requestStatus === 'object') {
                    requestProcessedStatus = parsedData.requestStatus;
                    console.log('[ProductRequestSystem] Loaded request status tracking from localStorage');
                }
            }
        } catch (error) {
            console.error('[ProductRequestSystem] Error loading processed notifications from localStorage:', error);
        }
    }
    
    // Save processed notifications to localStorage
    function saveProcessedNotifications() {
        try {
            const dataToSave = {
                processedIds: Array.from(processedNotifications),
                requestStatus: requestProcessedStatus,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(notificationHistoryKey, JSON.stringify(dataToSave));
            console.log('[ProductRequestSystem] Saved notification history to localStorage');
        } catch (error) {
            console.error('[ProductRequestSystem] Error saving processed notifications to localStorage:', error);
        }
    }
    
    // Create notification container
    function createNotificationContainer() {
        // Check if container already exists
        notificationContainer = document.getElementById('grozily-notification-container');
        if (notificationContainer) {
            console.log('[ProductRequestSystem] Notification container already exists');
            return;
        }
        
        console.log('[ProductRequestSystem] Creating notification container');
        
        // Create container
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'grozily-notification-container';
        notificationContainer.className = 'grozily-notification-container';
        document.body.appendChild(notificationContainer);
        
        // Add CSS styles directly if not already present
        if (!document.getElementById('grozily-notification-styles')) {
            const styleTag = document.createElement('style');
            styleTag.id = 'grozily-notification-styles';
            styleTag.textContent = `
                .grozily-notification-container {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    max-width: 350px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column-reverse;
                    align-items: flex-end;
                }
                .grozily-notification {
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    margin-bottom: 10px;
                    overflow: hidden;
                    width: 100%;
                    display: flex;
                    transform: translateX(120%);
                    transition: transform 0.3s ease-out;
                    max-height: 0;
                    opacity: 0;
                }
                .grozily-notification.show {
                    transform: translateX(0);
                    max-height: 400px;
                    opacity: 1;
                }
                .grozily-notification-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 50px;
                    color: white;
                    font-size: 20px;
                }
                .grozily-notification-success .grozily-notification-icon {
                    background-color: #48BB78;
                }
                .grozily-notification-error .grozily-notification-icon {
                    background-color: #F56565;
                }
                .grozily-notification-info .grozily-notification-icon {
                    background-color: #4299E1;
                }
                .grozily-notification-warning .grozily-notification-icon {
                    background-color: #ECC94B;
                }
                .grozily-notification-content {
                    flex: 1;
                    padding: 12px 15px;
                    position: relative;
                }
                .grozily-notification-title {
                    font-weight: bold;
                    margin-bottom: 5px;
                    font-size: 16px;
                }
                .grozily-notification-message {
                    font-size: 14px;
                    color: #4A5568;
                    margin-bottom: 10px;
                }
                .grozily-notification-actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 8px;
                }
                .grozily-notification-btn {
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    margin-left: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }
                .grozily-notification-primary {
                    background-color: #4299E1;
                    color: white;
                }
                .grozily-notification-primary:hover {
                    background-color: #3182CE;
                }
                .grozily-notification-secondary {
                    background-color: #E2E8F0;
                    color: #4A5568;
                }
                .grozily-notification-secondary:hover {
                    background-color: #CBD5E0;
                }
                .grozily-notification-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background-color: #EDF2F7;
                }
                .grozily-notification-progress-inner {
                    height: 100%;
                    width: 100%;
                    transform-origin: left;
                    background-color: #CBD5E0;
                    animation: grozily-notification-progress-animation linear forwards;
                }
                @keyframes grozily-notification-progress-animation {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                .custom-badge {
                    font-size: 10px;
                    background-color: #805AD5;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    margin-left: 5px;
                    display: inline-block;
                }
            `;
            document.head.appendChild(styleTag);
        }
        
        console.log('[ProductRequestSystem] Notification system ready');
    }
    
    // Show notification
    function showNotification(options) {
        console.log('[ProductRequestSystem] Showing notification:', options);
        
        if (!notificationContainer) {
            console.log('[ProductRequestSystem] Creating notification container on demand');
            createNotificationContainer();
        }
        
        const { title, message, type = 'info', duration = 5000, actions = [] } = options;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `grozily-notification grozily-notification-${type}`;
        
        // Icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'times-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        // Build notification content
        notification.innerHTML = `
            <div class="grozily-notification-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="grozily-notification-content">
                <div class="grozily-notification-title">${title}</div>
                <div class="grozily-notification-message">${message}</div>
                ${actions.length > 0 ? '<div class="grozily-notification-actions"></div>' : ''}
                <div class="grozily-notification-progress">
                    <div class="grozily-notification-progress-inner" style="animation-duration: ${duration}ms;"></div>
                </div>
            </div>
        `;
        
        // Add actions if any
        if (actions.length > 0) {
            const actionsContainer = notification.querySelector('.grozily-notification-actions');
            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `grozily-notification-btn grozily-notification-${action.type || 'primary'}`;
                button.textContent = action.text;
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // If action has onClick handler, call it
                    if (typeof action.onClick === 'function') {
                        action.onClick();
                    }
                    
                    // Close notification if closeOnClick is not explicitly set to false
                    if (action.closeOnClick !== false) {
                        closeNotification(notification);
                    }
                });
                actionsContainer.appendChild(button);
            });
        }
        
        // Add click event to the notification to close it
        notification.addEventListener('click', () => {
            closeNotification(notification);
        });
        
        // Add to container
        notificationContainer.appendChild(notification);
        console.log('[ProductRequestSystem] Notification added to container');
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
            console.log('[ProductRequestSystem] Notification animation triggered');
        }, 10);
        
        // Auto close after duration
        if (duration > 0) {
            setTimeout(() => {
                closeNotification(notification);
            }, duration);
        }
        
        return notification;
    }
    
    // Close notification
    function closeNotification(notification) {
        console.log('[ProductRequestSystem] Closing notification');
        
        // Check if notification still exists
        if (!notification || !notification.parentNode) {
            console.log('[ProductRequestSystem] Notification already removed');
            return;
        }
        
        notification.classList.remove('show');
        
        // Make sure we don't try to remove it multiple times
        if (notification.dataset.removing === 'true') {
            console.log('[ProductRequestSystem] Notification already being removed');
            return;
        }
        
        // Mark as being removed
        notification.dataset.removing = 'true';
        
        setTimeout(() => {
            // Double check that notification still exists before removing
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                console.log('[ProductRequestSystem] Notification removed from DOM');
            }
        }, 300);
    }
    
    // Setup notification listener for current user
    function setupNotificationListener() {
        if (!currentUser) {
            console.log('[ProductRequestSystem] Cannot setup notification listener: No current user');
            return;
        }
        
        console.log('[ProductRequestSystem] Setting up notification listener for user:', currentUser.uid);
        
        // Clear existing listeners first
        clearNotificationListeners();
        
        // Listen for product request notifications
        const notificationsRef = firebase.database().ref(`notifications/${currentUser.uid}`);
        console.log('[ProductRequestSystem] Listening at path:', `notifications/${currentUser.uid}`);
        
        const notificationListener = notificationsRef.on('child_added', function(snapshot) {
            const notification = snapshot.val();
            console.log('[ProductRequestSystem] New notification received:', notification);
            
            // Process notification
            processNotification(notification, snapshot.key);
        });
        
        notificationListeners.push({
            ref: notificationsRef,
            listener: notificationListener
        });
        
        console.log('[ProductRequestSystem] Notification listener setup complete');
    }
    
    // Clear notification listeners
    function clearNotificationListeners() {
        console.log('[ProductRequestSystem] Clearing notification listeners');
        notificationListeners.forEach(listener => {
            listener.ref.off('child_added', listener.listener);
        });
        notificationListeners = [];
    }
    
    // Process a notification
    function processNotification(notification, notificationId) {
        if (!notification) {
            console.log('[ProductRequestSystem] Received empty notification');
            return;
        }
        
        // Check if we've already processed this notification
        if (processedNotifications.has(notificationId)) {
            console.log('[ProductRequestSystem] Notification already processed, skipping:', notificationId);
            return;
        }
        
        console.log('[ProductRequestSystem] Processing notification:', notification);
        
        const { type, title, message, requestId, status, price } = notification;
        
        // Also check if we've already processed a notification for this request with this status
        const requestStatusKey = `${requestId}-${status}`;
        if (requestProcessedStatus[requestStatusKey]) {
            console.log('[ProductRequestSystem] Request already processed with this status, skipping:', requestStatusKey);
            processedNotifications.add(notificationId);
            
            // Save to localStorage to persist across page refreshes
            saveProcessedNotifications();
            
            // Mark notification as read without showing it again
            if (currentUser) {
                firebase.database().ref(`notifications/${currentUser.uid}/${notificationId}`).update({
                    read: true,
                    readAt: firebase.database.ServerValue.TIMESTAMP,
                    skipped: true
                });
            }
            return;
        }
        
        // Mark as processed immediately to prevent duplicates even in case of errors
        processedNotifications.add(notificationId);
        requestProcessedStatus[requestStatusKey] = true;
        
        // Save to localStorage to persist across page refreshes
        saveProcessedNotifications();
        
        // Show notification based on type
        if (type === 'product_request') {
            if (status === 'approved') {
                console.log('[ProductRequestSystem] Showing approved request notification');
                // Product request approved
                
                // Check if this notification is for a vendor (storeId === currentUser.uid)
                // If the current user is the vendor (store owner), don't show the customer notification
                if (requestId) {
                    // Get the request details to check if current user is the vendor
                    firebase.database().ref(`product_requests/${requestId}`).once('value')
                        .then(snapshot => {
                            if (snapshot.exists()) {
                                const request = snapshot.val();
                                
                                // If current user is the vendor, don't show customer notification
                                if (currentUser && request.storeId === currentUser.uid) {
                                    console.log('[ProductRequestSystem] Current user is the vendor, skipping customer notification');
                                    return;
                                }
                                
                                // Otherwise show the notification to the customer
                                showNotification({
                                    title: title || 'Product Request Approved!',
                                    message: message || `Your requested product has been approved at ₹${price}.`,
                                    type: 'success',
                                    duration: 8000,
                                    actions: [
                                        {
                                            text: 'View Cart',
                                            onClick: () => {
                                                window.location.href = 'cart.html';
                                            }
                                        }
                                    ]
                                });
                            }
                        })
                        .catch(error => {
                            console.error('[ProductRequestSystem] Error checking request details:', error);
                        });
                } else {
                    // If no request ID, just show the notification
                    showNotification({
                        title: title || 'Product Request Approved!',
                        message: message || `Your requested product has been approved at ₹${price}.`,
                        type: 'success',
                        duration: 8000,
                        actions: [
                            {
                                text: 'View Cart',
                                onClick: () => {
                                    window.location.href = 'cart.html';
                                }
                            }
                        ]
                    });
                }
                
                // Also send a web push notification if available
                if (window.NotificationHandler && 
                    typeof window.NotificationHandler.sendNotification === 'function' &&
                    Notification.permission === 'granted') {
                    
                    window.NotificationHandler.sendNotification(
                        title || 'Product Request Approved!', 
                        {
                            body: message || `Your requested product has been approved at ₹${price}.`,
                            tag: `product_request_${requestId}`,
                            id: requestId,
                            requireInteraction: true,
                            actions: [
                                {
                                    action: 'view_cart',
                                    title: 'View Cart',
                                    url: 'cart.html'
                                }
                            ]
                        }
                    );
                }
            } else if (status === 'rejected') {
                console.log('[ProductRequestSystem] Showing rejected request notification');
                // Product request rejected
                showNotification({
                    title: title || 'Product Request Rejected',
                    message: message || 'Unfortunately, your product request was declined by the vendor.',
                    type: 'error',
                    duration: 8000,
                    actions: [
                        {
                            text: 'Dismiss',
                            type: 'secondary',
                            onClick: () => {
                                console.log('[ProductRequestSystem] Dismiss button clicked');
                                // Already handled in closeNotification
                            }
                        }
                    ]
                });
                
                // Also send a web push notification if available
                if (window.NotificationHandler && 
                    typeof window.NotificationHandler.sendNotification === 'function' &&
                    Notification.permission === 'granted') {
                    
                    window.NotificationHandler.sendNotification(
                        title || 'Product Request Rejected', 
                        {
                            body: message || 'Unfortunately, your product request was declined by the vendor.',
                            tag: `product_request_${requestId}`,
                            id: requestId,
                            requireInteraction: true
                        }
                    );
                }
            }
        }
        
        // Mark notification as read
        if (currentUser) {
            console.log('[ProductRequestSystem] Marking notification as read:', notificationId);
            firebase.database().ref(`notifications/${currentUser.uid}/${notificationId}`).update({
                read: true,
                readAt: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }
    
    // Check for pending product requests that need action
    function checkPendingRequests() {
        if (!currentUser) {
            console.log('[ProductRequestSystem] Cannot check pending requests: No current user');
            return;
        }
        
        console.log('[ProductRequestSystem] Checking for pending requests for user:', currentUser.uid);
        
        // Check for unread notifications
        firebase.database().ref(`notifications/${currentUser.uid}`)
            .orderByChild('read')
            .equalTo(false)
            .once('value', function(snapshot) {
                if (snapshot.exists()) {
                    console.log('[ProductRequestSystem] Found unread notifications');
                    
                    // Process notifications one at a time with a delay to prevent flooding
                    const notificationArray = [];
                    snapshot.forEach(function(childSnapshot) {
                        notificationArray.push({
                            id: childSnapshot.key,
                            data: childSnapshot.val()
                        });
                    });
                    
                    // Sort notifications by creation time (oldest first)
                    notificationArray.sort((a, b) => {
                        const timeA = a.data.createdAt || 0;
                        const timeB = b.data.createdAt || 0;
                        return timeA - timeB;
                    });
                    
                    // Process only the first notification now, to avoid overwhelming the user
                    if (notificationArray.length > 0) {
                        const notification = notificationArray[0];
                        processNotification(notification.data, notification.id);
                    }
                } else {
                    console.log('[ProductRequestSystem] No unread notifications found');
                }
            });
    }
    
    // Submit a product request
    function submitProductRequest(requestData) {
        console.log('[ProductRequestSystem] Submitting product request:', requestData);
        
        return new Promise((resolve, reject) => {
            if (!currentUser) {
                console.error('[ProductRequestSystem] User not authenticated');
                reject(new Error('User not authenticated'));
                return;
            }
            
            const { storeId, productName, description, quantity } = requestData;
            
            if (!storeId || !productName) {
                console.error('[ProductRequestSystem] Missing required fields');
                reject(new Error('Store ID and product name are required'));
                return;
            }
            
            // Get vendor data
            firebase.database().ref(`vendors/${storeId}`).once('value')
                .then((snapshot) => {
                    const store = snapshot.val();
                    const storeName = store ? store.storeName || store.name || 'Unknown Store' : 'Unknown Store';
                    
                    console.log('[ProductRequestSystem] Retrieved store data:', store ? store.storeName : 'Unknown');
                    
                    // Create request in Firebase
                    const requestRef = firebase.database().ref('product_requests').push();
                    
                    const request = {
                        productName: productName,
                        description: description || '',
                        quantity: parseInt(quantity) || 1,
                        storeId: storeId,
                        storeName: storeName,
                        userId: currentUser.uid,
                        userEmail: currentUser.email,
                        userName: currentUser.displayName || currentUser.email,
                        status: 'pending',
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        imageURL: 'https://via.placeholder.com/300x300?text=Custom+Request'
                    };
                    
                    console.log('[ProductRequestSystem] Saving request to Firebase with ID:', requestRef.key);
                    
                    // Save request
                    return requestRef.set(request);
                })
                .then(() => {
                    console.log('[ProductRequestSystem] Request submitted successfully');
                    resolve({ success: true });
                })
                .catch((error) => {
                    console.error('[ProductRequestSystem] Error submitting product request:', error);
                    reject(error);
                });
        });
    }
    
    // Approve a product request
    function approveProductRequest(requestId, price) {
        console.log('[ProductRequestSystem] Approving product request:', requestId, 'at price:', price);
        return new Promise((resolve, reject) => {
            if (!requestId) {
                console.error('[ProductRequestSystem] Cannot approve request: Missing request ID');
                reject(new Error('Missing request ID'));
                return;
            }
            
            if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
                console.error('[ProductRequestSystem] Cannot approve request: Invalid price');
                reject(new Error('Invalid price'));
                return;
            }
            
            // Standardize price to a number
            price = parseFloat(price).toFixed(2);
            
            // Get request data
            firebase.database().ref(`product_requests/${requestId}`)
                .once('value')
                .then((snapshot) => {
                    if (!snapshot.exists()) {
                        throw new Error('Request not found');
                    }
                    
                    return snapshot.val();
                })
                .then((request) => {
                    console.log('[ProductRequestSystem] Request data:', request);
                    
                    // Update request status
                    return firebase.database().ref(`product_requests/${requestId}`).update({
                        status: 'approved',
                        price: price,
                        approvedAt: firebase.database.ServerValue.TIMESTAMP
                    }).then(() => request);
                })
                .then((request) => {
                    console.log('[ProductRequestSystem] Adding to customer cart. User ID:', request.userId);
                    
                    // Default image for requested products
                    const defaultProductImage = 'images/default-product.png';
                    
                    // Add to customer's cart
                    const cartItemData = {
                        productName: request.productName,
                        name: request.productName, // Add name for backward compatibility
                        quantity: parseInt(request.quantity) || 1,
                        price: price,
                        storeId: request.storeId,
                        storeName: request.storeName,
                        imageURL: request.imageURL || defaultProductImage,
                        isCustom: true,
                        requestId: requestId,
                        addedFromRequest: true,
                        requestDetails: {
                            requestId: requestId,
                            description: request.description,
                            requestedAt: request.createdAt
                        }
                    };
                    
                    console.log('[ProductRequestSystem] Cart item data:', cartItemData);
                    
                    // Use the items subobject for cart
                    return firebase.database().ref(`carts/${request.userId}/items/${requestId}`).set(cartItemData)
                        .then(() => {
                            console.log('[ProductRequestSystem] Added to cart successfully');
                            
                            // Mark as added to cart
                            return firebase.database().ref(`product_requests/${requestId}`).update({
                                addedToCart: true
                            });
                        })
                        .then(() => {
                            // Create and send notification
                            const notificationData = {
                                type: 'product_request',
                                title: 'Product Request Approved!',
                                message: `Your request for ${request.productName} has been approved at ₹${price}.`,
                                status: 'approved',
                                requestId: requestId,
                                price: price,
                                createdAt: firebase.database.ServerValue.TIMESTAMP,
                                read: false
                            };
                            
                            return firebase.database().ref(`notifications/${request.userId}`).push(notificationData);
                        })
                        .then(() => {
                            console.log('[ProductRequestSystem] Notification sent successfully');
                            resolve({
                                success: true,
                                message: 'Product request approved and added to customer\'s cart'
                            });
                        });
                })
                .catch((error) => {
                    console.error('[ProductRequestSystem] Error approving request:', error);
                    reject(error);
                });
        });
    }
    
    // Reject a product request (vendor only)
    function rejectProductRequest(requestId, reason) {
        console.log('[ProductRequestSystem] Rejecting product request:', requestId, 'with reason:', reason);
        
        return new Promise((resolve, reject) => {
            if (!currentUser) {
                console.error('[ProductRequestSystem] User not authenticated');
                reject(new Error('User not authenticated'));
                return;
            }
            
            let requestData;
            
            // Get the request details
            firebase.database().ref(`product_requests/${requestId}`).once('value')
                .then((snapshot) => {
                    if (!snapshot.exists()) {
                        console.error('[ProductRequestSystem] Request not found:', requestId);
                        throw new Error('Request not found');
                    }
                    
                    requestData = snapshot.val();
                    console.log('[ProductRequestSystem] Retrieved request data:', requestData);
                    
                    // Check if this vendor owns this request
                    if (requestData.storeId !== currentUser.uid) {
                        console.error('[ProductRequestSystem] Permission denied for request:', requestId);
                        throw new Error('You do not have permission to reject this request');
                    }
                    
                    // Update request status
                    console.log('[ProductRequestSystem] Updating request status to rejected');
                    return firebase.database().ref(`product_requests/${requestId}`).update({
                        status: 'rejected',
                        rejectionReason: reason || '',
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                })
                .then(() => {
                    console.log('[ProductRequestSystem] Creating notification for user:', requestData.userId);
                    
                    // Create notification for customer
                    const notification = {
                        type: 'product_request',
                        status: 'rejected',
                        title: 'Product Request Rejected',
                        message: reason ? 
                            `Your request for "${requestData.productName}" was rejected. Reason: ${reason}` : 
                            `Your request for "${requestData.productName}" was rejected by the vendor.`,
                        requestId: requestId,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        read: false
                    };
                    
                    console.log('[ProductRequestSystem] Notification data:', notification);
                    return firebase.database().ref(`notifications/${requestData.userId}`).push(notification);
                })
                .then(() => {
                    console.log('[ProductRequestSystem] Notification created successfully');
                    
                    // Debug: Check if the notification was actually saved
                    return firebase.database().ref(`notifications/${requestData.userId}`).once('value');
                })
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        console.log('[ProductRequestSystem] Notifications exist for user:', snapshot.val());
                    } else {
                        console.log('[ProductRequestSystem] No notifications found for user');
                    }
                    
                    console.log('[ProductRequestSystem] Rejection process completed successfully');
                    resolve({ success: true });
                })
                .catch((error) => {
                    console.error('[ProductRequestSystem] Error rejecting product request:', error);
                    reject(error);
                });
        });
    }
    
    // Get active requests for a vendor
    function getVendorRequests() {
        console.log('[ProductRequestSystem] Getting vendor requests');
        
        return new Promise((resolve, reject) => {
            if (!currentUser) {
                console.error('[ProductRequestSystem] User not authenticated');
                reject(new Error('User not authenticated'));
                return;
            }
            
            firebase.database().ref('product_requests')
                .orderByChild('storeId')
                .equalTo(currentUser.uid)
                .once('value')
                .then((snapshot) => {
                    const requests = [];
                    
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            requests.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });
                        console.log('[ProductRequestSystem] Found', requests.length, 'requests for vendor');
                    } else {
                        console.log('[ProductRequestSystem] No requests found for vendor');
                    }
                    
                    // Sort by created date (newest first)
                    requests.sort((a, b) => b.createdAt - a.createdAt);
                    
                    resolve(requests);
                })
                .catch((error) => {
                    console.error('[ProductRequestSystem] Error getting vendor requests:', error);
                    reject(error);
                });
        });
    }
    
    // Get requests made by the current user
    function getUserRequests() {
        console.log('[ProductRequestSystem] Getting user requests');
        
        return new Promise((resolve, reject) => {
            if (!currentUser) {
                console.error('[ProductRequestSystem] User not authenticated');
                reject(new Error('User not authenticated'));
                return;
            }
            
            firebase.database().ref('product_requests')
                .orderByChild('userId')
                .equalTo(currentUser.uid)
                .once('value')
                .then((snapshot) => {
                    const requests = [];
                    
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            requests.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });
                        console.log('[ProductRequestSystem] Found', requests.length, 'requests for user');
                    } else {
                        console.log('[ProductRequestSystem] No requests found for user');
                    }
                    
                    // Sort by created date (newest first)
                    requests.sort((a, b) => b.createdAt - a.createdAt);
                    
                    resolve(requests);
                })
                .catch((error) => {
                    console.error('[ProductRequestSystem] Error getting user requests:', error);
                    reject(error);
                });
        });
    }
    
    // Public API
    return {
        init,
        submitProductRequest,
        approveProductRequest,
        rejectProductRequest,
        getVendorRequests,
        getUserRequests,
        showNotification
    };
})();

// Auto-initialize the system when the script loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('[ProductRequestSystem] Auto-initializing on page load');
    ProductRequestSystem.init();
});

// Add a cleanup function for page unload to prevent memory leaks
window.addEventListener('beforeunload', function() {
    console.log('[ProductRequestSystem] Page unloading, performing cleanup');
    // Any cleanup needed when navigating away from the page
});

// Export the ProductRequestSystem to window for debug purposes
window.ProductRequestSystem = ProductRequestSystem;

// Add a debugging function to check cart data
function debugCartData(userId) {
    console.log(`[DEBUG] Checking cart data for user: ${userId}`);
    
    // Check cart structure
    firebase.database().ref(`carts/${userId}`).once('value')
        .then(snapshot => {
            const data = snapshot.val();
            console.log(`[DEBUG] Cart data:`, data);
            
            // Check if 'items' exists
            if (data && data.items) {
                console.log(`[DEBUG] Items found:`, Object.keys(data.items).length);
                console.log(`[DEBUG] First item:`, Object.values(data.items)[0]);
            } else {
                console.log(`[DEBUG] No 'items' property found in cart`);
                
                // Check if data was added directly to the cart node
                if (data) {
                    console.log(`[DEBUG] Direct cart entries:`, Object.keys(data).length);
                    
                    // Attempt to fix the structure if needed
                    const cartItems = {};
                    let needsFix = false;
                    
                    Object.keys(data).forEach(key => {
                        const item = data[key];
                        // Check if this looks like a cart item and not a structure property
                        if (item && typeof item === 'object' && (item.productName || item.isCustom)) {
                            cartItems[key] = item;
                            needsFix = true;
                        }
                    });
                    
                    if (needsFix) {
                        console.log(`[DEBUG] Found cart items at root level, fixing structure...`);
                        firebase.database().ref(`carts/${userId}`).set({ items: cartItems })
                            .then(() => console.log(`[DEBUG] Cart structure fixed successfully`))
                            .catch(error => console.error(`[DEBUG] Error fixing cart structure:`, error));
                    }
                }
            }
        })
        .catch(error => {
            console.error(`[DEBUG] Error checking cart:`, error);
        });
}

// Fix cart structure for all users
function migrateCartStructures() {
    console.log(`[MIGRATION] Starting cart structure migration...`);
    
    // Get all carts
    firebase.database().ref('carts').once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                console.log(`[MIGRATION] No carts found to migrate`);
                return;
            }
            
            const migrationPromises = [];
            
            snapshot.forEach(userSnapshot => {
                const userId = userSnapshot.key;
                const userData = userSnapshot.val();
                
                // Skip if already has items structure
                if (userData && userData.items) {
                    console.log(`[MIGRATION] Cart for user ${userId} already has correct structure`);
                    return;
                }
                
                // Check if this looks like direct cart items
                const cartItems = {};
                let needsMigration = false;
                
                Object.keys(userData || {}).forEach(key => {
                    const item = userData[key];
                    if (item && typeof item === 'object' && (item.productName || item.isCustom)) {
                        cartItems[key] = item;
                        needsMigration = true;
                    }
                });
                
                if (needsMigration) {
                    console.log(`[MIGRATION] Migrating cart for user ${userId}`);
                    migrationPromises.push(
                        firebase.database().ref(`carts/${userId}`).set({ items: cartItems })
                            .then(() => console.log(`[MIGRATION] Cart migrated for user ${userId}`))
                    );
                }
            });
            
            if (migrationPromises.length > 0) {
                console.log(`[MIGRATION] Migrating ${migrationPromises.length} carts...`);
                return Promise.all(migrationPromises);
            } else {
                console.log(`[MIGRATION] No carts need migration`);
                return Promise.resolve();
            }
        })
        .then(() => {
            console.log(`[MIGRATION] Cart structure migration completed`);
        })
        .catch(error => {
            console.error(`[MIGRATION] Error during cart migration:`, error);
        });
}

// Add a method to clear old notifications from localStorage to prevent it from growing too large
function clearOldNotifications() {
    try {
        const savedData = localStorage.getItem(notificationHistoryKey);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // If there's a lastUpdated field and it's more than 7 days old, clear half the notifications
            if (parsedData.lastUpdated) {
                const lastUpdated = new Date(parsedData.lastUpdated);
                const now = new Date();
                const daysDiff = (now - lastUpdated) / (1000 * 60 * 60 * 24);
                
                if (daysDiff > 7 && parsedData.processedIds && parsedData.processedIds.length > 100) {
                    console.log('[ProductRequestSystem] Clearing old notifications...');
                    
                    // Keep only the most recent 50 notifications
                    const recentNotifications = parsedData.processedIds.slice(-50);
                    processedNotifications = new Set(recentNotifications);
                    
                    // Clear old request status entries (keep only those that match remaining notifications)
                    const newRequestStatus = {};
                    Object.keys(requestProcessedStatus).forEach(key => {
                        // Keep entries that might be related to recent notifications
                        const requestId = key.split('-')[0];
                        if (recentNotifications.some(id => id.includes(requestId))) {
                            newRequestStatus[key] = requestProcessedStatus[key];
                        }
                    });
                    
                    requestProcessedStatus = newRequestStatus;
                    
                    // Save the cleaned data
                    saveProcessedNotifications();
                    console.log('[ProductRequestSystem] Cleared old notifications');
                }
            }
        }
    } catch (error) {
        console.error('[ProductRequestSystem] Error clearing old notifications:', error);
    }
} 