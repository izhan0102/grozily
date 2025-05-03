/**
 * Product Request System for Grozily
 * 
 * This module provides a global system for:
 * 1. Submitting product requests from customers to vendors
 * 2. Notifying customers about request status changes (approved/rejected)
 * 3. Automatically adding approved products to customer carts
 */

// Initialize the Product Request System
const ProductRequestSystem = (function() {
    // Private variables
    let currentUser = null;
    let notificationListeners = [];
    let isInitialized = false;
    let pendingNotifications = [];
    
    // DOM elements for notifications
    let notificationContainer = null;
    
    // Initialize the system
    function init() {
        if (isInitialized) return;
        
        console.log('Initializing Product Request System...');
        
        // Create notification container if it doesn't exist
        createNotificationContainer();
        
        // Check if user is logged in
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                currentUser = user;
                console.log('User authenticated:', user.uid);
                
                // Listen for notifications for this user
                setupNotificationListener();
                
                // Check for any pending requests that need action
                checkPendingRequests();
            } else {
                currentUser = null;
                console.log('User not authenticated');
                
                // Clear any notification listeners
                clearNotificationListeners();
            }
        });
        
        isInitialized = true;
    }
    
    // Create notification container
    function createNotificationContainer() {
        // Check if container already exists
        if (document.getElementById('grozily-notification-container')) {
            notificationContainer = document.getElementById('grozily-notification-container');
            return;
        }
        
        // Create container
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'grozily-notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '9999';
        notificationContainer.style.display = 'flex';
        notificationContainer.style.flexDirection = 'column';
        notificationContainer.style.gap = '10px';
        notificationContainer.style.maxWidth = '350px';
        
        // Add to body
        document.body.appendChild(notificationContainer);
        
        // Create stylesheet for notifications
        const style = document.createElement('style');
        style.textContent = `
            .grozily-notification {
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin-bottom: 10px;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                display: flex;
                align-items: flex-start;
                overflow: hidden;
                position: relative;
            }
            
            .grozily-notification.show {
                transform: translateX(0);
            }
            
            .grozily-notification-icon {
                margin-right: 12px;
                font-size: 20px;
                color: white;
                width: 24px;
                text-align: center;
            }
            
            .grozily-notification-content {
                flex: 1;
            }
            
            .grozily-notification-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
                color: white;
            }
            
            .grozily-notification-message {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .grozily-notification-actions {
                margin-top: 10px;
                display: flex;
                gap: 8px;
            }
            
            .grozily-notification-btn {
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                border: none;
                transition: background-color 0.2s;
            }
            
            .grozily-notification-primary {
                background-color: rgba(255, 255, 255, 0.9);
                color: #333;
            }
            
            .grozily-notification-secondary {
                background-color: rgba(255, 255, 255, 0.2);
                color: white;
            }
            
            .grozily-notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background-color: rgba(255, 255, 255, 0.4);
                width: 100%;
            }
            
            .grozily-notification-progress-inner {
                height: 100%;
                background-color: rgba(255, 255, 255, 0.8);
                width: 100%;
                transform-origin: left;
                animation: notification-progress 5s linear forwards;
            }
            
            @keyframes notification-progress {
                0% { transform: scaleX(1); }
                100% { transform: scaleX(0); }
            }
            
            .grozily-notification-success {
                background-color: #38A169;
            }
            
            .grozily-notification-error {
                background-color: #E53E3E;
            }
            
            .grozily-notification-info {
                background-color: #3182CE;
            }
            
            .grozily-notification-warning {
                background-color: #DD6B20;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show notification
    function showNotification(options) {
        if (!notificationContainer) createNotificationContainer();
        
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
                    <div class="grozily-notification-progress-inner"></div>
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
                button.addEventListener('click', () => {
                    action.onClick();
                    if (action.closeOnClick !== false) {
                        closeNotification(notification);
                    }
                });
                actionsContainer.appendChild(button);
            });
        }
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
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
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
    
    // Setup notification listener for current user
    function setupNotificationListener() {
        if (!currentUser) return;
        
        // Clear existing listeners first
        clearNotificationListeners();
        
        // Listen for product request notifications
        const notificationsRef = firebase.database().ref(`notifications/${currentUser.uid}`);
        const notificationListener = notificationsRef.on('child_added', function(snapshot) {
            const notification = snapshot.val();
            console.log('New notification received:', notification);
            
            // Process notification
            processNotification(notification, snapshot.key);
        });
        
        notificationListeners.push({
            ref: notificationsRef,
            listener: notificationListener
        });
    }
    
    // Clear notification listeners
    function clearNotificationListeners() {
        notificationListeners.forEach(listener => {
            listener.ref.off('child_added', listener.listener);
        });
        notificationListeners = [];
    }
    
    // Process a notification
    function processNotification(notification, notificationId) {
        if (!notification) return;
        
        const { type, title, message, requestId, status, price } = notification;
        
        // Show notification based on type
        if (type === 'product_request') {
            if (status === 'approved') {
                // Product request approved
                showNotification({
                    title: title || 'Product Request Approved!',
                    message: message || `Your requested product has been approved at ₹${price}.`,
                    type: 'success',
                    duration: 8000,
                    actions: [
                        {
                            text: 'View Cart',
                            onClick: () => window.location.href = 'cart.html'
                        },
                        {
                            text: 'Dismiss',
                            type: 'secondary'
                        }
                    ]
                });
            } else if (status === 'rejected') {
                // Product request rejected
                showNotification({
                    title: title || 'Product Request Rejected',
                    message: message || 'Unfortunately, your product request was declined by the vendor.',
                    type: 'error',
                    duration: 8000
                });
            }
        }
        
        // Mark notification as read
        if (currentUser) {
            firebase.database().ref(`notifications/${currentUser.uid}/${notificationId}`).update({
                read: true,
                readAt: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }
    
    // Check for pending product requests that need action
    function checkPendingRequests() {
        if (!currentUser) return;
        
        // Check for unread notifications
        firebase.database().ref(`notifications/${currentUser.uid}`)
            .orderByChild('read')
            .equalTo(false)
            .once('value', function(snapshot) {
                if (snapshot.exists()) {
                    console.log('Found unread notifications');
                    snapshot.forEach(function(childSnapshot) {
                        processNotification(childSnapshot.val(), childSnapshot.key);
                    });
                }
            });
    }
    
    // Submit a product request
    function submitProductRequest(requestData) {
        return new Promise((resolve, reject) => {
            if (!currentUser) {
                reject(new Error('User not authenticated'));
                return;
            }
            
            const { storeId, productName, description, quantity } = requestData;
            
            if (!storeId || !productName) {
                reject(new Error('Store ID and product name are required'));
                return;
            }
            
            // Get vendor data
            firebase.database().ref(`vendors/${storeId}`).once('value')
                .then((snapshot) => {
                    const store = snapshot.val();
                    const storeName = store ? store.storeName || store.name || 'Unknown Store' : 'Unknown Store';
                    
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
                    
                    // Save request
                    return requestRef.set(request);
                })
                .then(() => {
                    resolve({ success: true });
                })
                .catch((error) => {
                    console.error('Error submitting product request:', error);
                    reject(error);
                });
        });
    }
    
    // Approve a product request (vendor only)
    function approveProductRequest(requestId, price) {
        return new Promise((resolve, reject) => {
            if (!currentUser) {
                reject(new Error('User not authenticated'));
                return;
            }
            
            // Get the request details
            firebase.database().ref(`product_requests/${requestId}`).once('value')
                .then((snapshot) => {
                    if (!snapshot.exists()) {
                        throw new Error('Request not found');
                    }
                    
                    const request = snapshot.val();
                    
                    // Check if this vendor owns this request
                    if (request.storeId !== currentUser.uid) {
                        throw new Error('You do not have permission to approve this request');
                    }
                    
                    // Update request status
                    return firebase.database().ref(`product_requests/${requestId}`).update({
                        status: 'approved',
                        price: price,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                })
                .then((requestSnapshot) => {
                    return firebase.database().ref(`product_requests/${requestId}`).once('value');
                })
                .then((snapshot) => {
                    const request = snapshot.val();
                    
                    // Add to customer's cart
                    const cartItemData = {
                        productName: request.productName,
                        quantity: parseInt(request.quantity) || 1,
                        price: price,
                        storeId: request.storeId,
                        storeName: request.storeName,
                        imageURL: request.imageURL || 'https://via.placeholder.com/300x300?text=Custom+Request',
                        isCustom: true,
                        requestId: requestId,
                        addedAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    
                    return firebase.database().ref(`carts/${request.userId}`).push(cartItemData);
                })
                .then(() => {
                    return firebase.database().ref(`product_requests/${requestId}`).once('value');
                })
                .then((snapshot) => {
                    const request = snapshot.val();
                    
                    // Create notification for customer
                    const notification = {
                        type: 'product_request',
                        status: 'approved',
                        title: 'Product Request Approved!',
                        message: `Your request for "${request.productName}" has been approved at ₹${price}.`,
                        requestId: requestId,
                        price: price,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        read: false
                    };
                    
                    return firebase.database().ref(`notifications/${request.userId}`).push(notification);
                })
                .then(() => {
                    resolve({ success: true });
                })
                .catch((error) => {
                    console.error('Error approving product request:', error);
                    reject(error);
                });
        });
    }
    
    // Reject a product request (vendor only)
    function rejectProductRequest(requestId, reason) {
        return new Promise((resolve, reject) => {
            if (!currentUser) {
                reject(new Error('User not authenticated'));
                return;
            }
            
            let requestData;
            
            // Get the request details
            firebase.database().ref(`product_requests/${requestId}`).once('value')
                .then((snapshot) => {
                    if (!snapshot.exists()) {
                        throw new Error('Request not found');
                    }
                    
                    requestData = snapshot.val();
                    
                    // Check if this vendor owns this request
                    if (requestData.storeId !== currentUser.uid) {
                        throw new Error('You do not have permission to reject this request');
                    }
                    
                    // Update request status
                    return firebase.database().ref(`product_requests/${requestId}`).update({
                        status: 'rejected',
                        rejectionReason: reason || '',
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                })
                .then(() => {
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
                    
                    return firebase.database().ref(`notifications/${requestData.userId}`).push(notification);
                })
                .then(() => {
                    resolve({ success: true });
                })
                .catch((error) => {
                    console.error('Error rejecting product request:', error);
                    reject(error);
                });
        });
    }
    
    // Get active requests for a vendor
    function getVendorRequests() {
        return new Promise((resolve, reject) => {
            if (!currentUser) {
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
                    }
                    
                    // Sort by created date (newest first)
                    requests.sort((a, b) => b.createdAt - a.createdAt);
                    
                    resolve(requests);
                })
                .catch((error) => {
                    console.error('Error getting vendor requests:', error);
                    reject(error);
                });
        });
    }
    
    // Get requests made by the current user
    function getUserRequests() {
        return new Promise((resolve, reject) => {
            if (!currentUser) {
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
                    }
                    
                    // Sort by created date (newest first)
                    requests.sort((a, b) => b.createdAt - a.createdAt);
                    
                    resolve(requests);
                })
                .catch((error) => {
                    console.error('Error getting user requests:', error);
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

// Auto initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    ProductRequestSystem.init();
}); 