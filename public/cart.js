// Firebase configuration
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const backBtn = document.getElementById('back-btn');
const browseProductsBtn = document.getElementById('browse-products-btn');

// Cart Elements
const cartCountElement = document.getElementById('cart-count');
const emptyCartElement = document.getElementById('empty-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartSummaryElement = document.getElementById('cart-summary');
const cartSubtotalElement = document.getElementById('cart-subtotal');
const deliveryFeeElement = document.getElementById('delivery-fee');
const platformFeeElement = document.getElementById('platform-fee');
const discountAmountElement = document.getElementById('discount-amount');
const discountRow = document.getElementById('discount-row');
const cartTotalElement = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutFooter = document.getElementById('checkout-footer');
const applyDiscountBtn = document.getElementById('apply-discount-btn');
const discountCodeInput = document.getElementById('discount-code');
const cartHeaderElement = document.querySelector('.cart-header');
const discountInputContainer = document.getElementById('discount-input-container');

// Popup Order Summary Elements
const viewDetailsLink = document.getElementById('view-details-link');
const orderDetailsPopup = document.getElementById('order-details-popup');
const closeDetailsBtn = document.getElementById('close-details');
const popupSubtotalElement = document.getElementById('popup-subtotal');
const popupDeliveryFeeElement = document.getElementById('popup-delivery-fee');
const popupPlatformFeeElement = document.getElementById('popup-platform-fee');
const popupDiscountAmountElement = document.getElementById('popup-discount-amount');
const popupDiscountRow = document.getElementById('popup-discount-row');
const popupTotalElement = document.getElementById('popup-total');

// Confirmation Dialog
const confirmDialog = document.getElementById('confirm-dialog');
const confirmMessage = document.getElementById('confirm-message');
const cancelRemoveBtn = document.getElementById('cancel-remove');
const confirmRemoveBtn = document.getElementById('confirm-remove');
let itemToRemove = null;

// Toast Message
const toastMessage = document.getElementById('toast-message');
const toastText = document.querySelector('.toast-text');
const toastIcon = document.querySelector('.toast-icon');

// Cart data
let cartItems = [];
let cartTotal = 0;
let cartSubtotal = 0;
let platformFee = 0;
let deliveryFee = 20;
let discountAmount = 0;
let discountApplied = false;
let isLoading = false;
let platformFeeRate = 8;

// Toast timer reference
let toastTimer = null;

// Location modal elements
const selectLocationBtn = document.getElementById('select-location-btn');
const locationModal = document.getElementById('location-modal');
const closeLocationModalBtn = document.getElementById('close-location-modal');
const useCurrentLocationBtn = document.getElementById('use-current-location');
const confirmLocationBtn = document.getElementById('confirm-location-btn');
const locationSearchInput = document.getElementById('location-search-input');
const locationSearchResults = document.getElementById('location-search-results');
const selectedLocationSection = document.getElementById('selected-location-section');

// Location data elements
const currentArea = document.getElementById('current-area');
const currentDistrict = document.getElementById('current-district');
const currentPincode = document.getElementById('current-pincode');
const selectedArea = document.getElementById('selected-area');
const selectedDistrict = document.getElementById('selected-district');
const selectedPincode = document.getElementById('selected-pincode');

// Location data
let userLocation = null;
let selectedLocationData = null;
let locationMap = null;
let locationMarker = null;
let searchDebounceTimer = null;
let selectedFromSearch = false;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Ensure toast is hidden initially
    toastMessage.classList.remove('show');
    toastText.textContent = '';
    
    // Initial page animation
    document.body.classList.add('page-loaded');
    
    // Set up confirmation dialog
    cancelRemoveBtn.addEventListener('click', hideConfirmDialog);
    confirmRemoveBtn.addEventListener('click', () => {
        if (itemToRemove) {
            removeItemFromCart(itemToRemove);
            itemToRemove = null;
        }
        hideConfirmDialog();
    });
    
    // Back button
    backBtn.addEventListener('click', () => {
        window.location.href = 'home.html';
    });
    
    // Browse products button
    browseProductsBtn.addEventListener('click', () => {
        window.location.href = 'shop.html';
    });
    
    // Apply discount button
    applyDiscountBtn.addEventListener('click', applyDiscount);
    
    // Allow Enter key to apply discount
    discountCodeInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            applyDiscount();
        }
    });
    
    // Input focus effects
    discountCodeInput.addEventListener('focus', () => {
        discountInputContainer.classList.add('focused');
    });
    
    discountCodeInput.addEventListener('blur', () => {
        discountInputContainer.classList.remove('focused');
    });
    
    // Checkout button
    checkoutBtn.addEventListener('click', proceedToCheckout);
    
    // View Details link
    viewDetailsLink.addEventListener('click', showOrderDetailsPopup);
    
    // Close popup button
    closeDetailsBtn.addEventListener('click', hideOrderDetailsPopup);
    
    // Close popup when clicking outside content
    orderDetailsPopup.addEventListener('click', (e) => {
        if (e.target === orderDetailsPopup) {
            hideOrderDetailsPopup();
        }
    });
    
    // Select location button
    selectLocationBtn.addEventListener('click', showLocationModal);
    
    // Close location modal button
    closeLocationModalBtn.addEventListener('click', hideLocationModal);
    
    // Close location modal when clicking outside content
    locationModal.addEventListener('click', (e) => {
        if (e.target === locationModal) {
            hideLocationModal();
        }
    });
    
    // Use current location button
    useCurrentLocationBtn.addEventListener('click', useCurrentLocation);
    
    // Confirm location button
    confirmLocationBtn.addEventListener('click', confirmLocation);
    
    // Location search input
    locationSearchInput.addEventListener('input', handleLocationSearch);
});

// Check if user is authenticated
auth.onAuthStateChanged(user => {
    if (!user) {
        // No user is signed in, redirect to login page
        window.location.href = 'login.html';
    } else {
        // Load cart data
        loadCartData(user.uid);
    }
});

// Load cart data
function loadCartData(userId) {
    try {
        // Show loading state
        setPageLoading(true);
        
        // Reference to user's cart in Firebase
        const cartRef = database.ref('carts/' + userId);
        
        // Get cart data
        cartRef.once('value').then(snapshot => {
            // Check if snapshot exists and has items
            const snapshotData = snapshot.val() || {};
            
            if (snapshotData.items) {
                cartItems = Object.values(snapshotData.items);
                
                // Update cart UI
                updateCartUI();
            } else {
                // Empty cart
                showEmptyCart();
            }
            
            // Hide loading state
            setPageLoading(false);
        }).catch(error => {
            console.error('Error loading cart data:', error);
            showToast('Failed to load cart data', 'error');
            showEmptyCart();
            setPageLoading(false);
        });
    } catch (error) {
        console.error('Error loading cart data:', error);
        showToast('Failed to load cart data', 'error');
        showEmptyCart();
        setPageLoading(false);
    }
}

// Update cart UI
function updateCartUI() {
    if (cartItems.length === 0) {
        showEmptyCart();
        return;
    }
    
    // Show cart items and summary
    emptyCartElement.style.display = 'none';
    cartItemsContainer.style.display = 'flex';
    cartSummaryElement.style.display = 'none';
    checkoutFooter.style.display = 'flex';
    
    // Update cart count
    cartCountElement.textContent = `${cartItems.length} Item${cartItems.length !== 1 ? 's' : ''}`;
    
    // Clear current items
    cartItemsContainer.innerHTML = '';
    
    // Calculate cart subtotal using the new function
    updateCartSubtotal();
    
    // Add each item to the cart with staggered animation
    cartItems.forEach((item, index) => {
        // Create cart item element
        const cartItemElement = createCartItemElement(item);
        cartItemElement.style.animationDelay = `${index * 0.1}s`;
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    // Calculate cart total
    updateCartTotals();
}

// Create cart item element
function createCartItemElement(item) {
    // Clone template
    const template = document.getElementById('cart-item-template');
    const cartItem = document.importNode(template.content, true).querySelector('.cart-item');
    
    // Set item data
    const itemImage = cartItem.querySelector('.item-image img');
    const itemName = cartItem.querySelector('.item-name');
    const itemQuantity = cartItem.querySelector('.item-quantity');
    const itemPrice = cartItem.querySelector('.item-price');
    const quantityNumber = cartItem.querySelector('.quantity-number');
    const quantityControls = cartItem.querySelector('.quantity-controls');
    
    // Set image URL with fallback
    itemImage.src = item.imageURL || 'https://via.placeholder.com/80?text=No+Image';
    itemImage.alt = item.name;
    itemImage.onerror = function() {
        this.onerror = null; 
        this.src = 'https://via.placeholder.com/80?text=No+Image';
        this.classList.add('fallback-image');
    };
    
    // Add lazy loading for images
    itemImage.loading = 'lazy';
    
    itemName.textContent = item.name;
    itemQuantity.textContent = `${item.weight || ''} ${item.unit || ''}`.trim();
    itemPrice.textContent = `₹${formatPrice(item.price * item.quantity)}`;
    quantityNumber.textContent = item.quantity;
    
    // Add price per unit if available
    if (item.price) {
        const pricePerUnit = document.createElement('div');
        pricePerUnit.className = 'price-per-unit';
        pricePerUnit.textContent = `₹${formatPrice(item.price)} each`;
        cartItem.querySelector('.item-details').appendChild(pricePerUnit);
    }
    
    // Set data attribute for item ID
    const itemId = item.id || item.productId;
    cartItem.setAttribute('data-id', itemId);
    
    // Add event listeners for quantity buttons
    const decreaseBtn = cartItem.querySelector('.decrease');
    const increaseBtn = cartItem.querySelector('.increase');
    const removeBtn = cartItem.querySelector('.remove-btn');
    
    decreaseBtn.addEventListener('click', () => {
        animateButton(decreaseBtn);
        decreaseItemQuantity(itemId);
    });
    
    increaseBtn.addEventListener('click', () => {
        animateButton(increaseBtn);
        increaseItemQuantity(itemId);
    });
    
    removeBtn.addEventListener('click', () => {
        showConfirmDialog(item);
    });
    
    // Hover effect for quantity controls
    cartItem.addEventListener('mouseenter', () => {
        quantityControls.classList.add('hover');
    });
    
    cartItem.addEventListener('mouseleave', () => {
        quantityControls.classList.remove('hover');
    });
    
    return cartItem;
}

// Animate button press
function animateButton(button) {
    button.classList.add('pressed');
    setTimeout(() => {
        button.classList.remove('pressed');
    }, 150);
}

// Show confirmation dialog
function showConfirmDialog(item) {
    itemToRemove = item;
    confirmMessage.textContent = 'Are you sure you want to remove this item?';
    confirmDialog.classList.add('active');
}

// Hide confirmation dialog
function hideConfirmDialog() {
    confirmDialog.classList.remove('active');
    setTimeout(() => {
        itemToRemove = null;
    }, 300);
}

// Show empty cart
function showEmptyCart() {
    // Update cart count
    cartCountElement.textContent = '0 Items';
    
    // Hide cart items and summary
    cartItemsContainer.style.display = 'none';
    cartSummaryElement.style.display = 'none';
    checkoutFooter.style.display = 'none';
    
    // Show empty cart message
    emptyCartElement.style.display = 'flex';
    
    // Add animation to empty cart icon
    const emptyCartIcon = emptyCartElement.querySelector('.empty-cart-icon i');
    if (emptyCartIcon) {
        emptyCartIcon.classList.add('pulse');
        setTimeout(() => {
            emptyCartIcon.classList.add('sad');
        }, 500);
    }
    
    // Ensure the browse button navigates to the shop page
    const browseBtn = document.getElementById('browse-products-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            window.location.href = 'shop.html';
        });
    }
}

// Update cart totals
function updateCartTotals() {
    // Update UI elements with animation
    animateNumberChange(cartSubtotalElement, `₹${formatPrice(cartSubtotal)}`);
    animateNumberChange(deliveryFeeElement, `₹${formatPrice(deliveryFee)}`);
    animateNumberChange(platformFeeElement, `₹${formatPrice(platformFee)}`);
    
    // Update popup elements as well
    animateNumberChange(popupSubtotalElement, `₹${formatPrice(cartSubtotal)}`);
    animateNumberChange(popupDeliveryFeeElement, `₹${formatPrice(deliveryFee)}`);
    animateNumberChange(popupPlatformFeeElement, `₹${formatPrice(platformFee)}`);
    
    // Calculate total
    cartTotal = cartSubtotal + deliveryFee + platformFee - discountAmount;
    
    // Update discount amount if any
    if (discountApplied && discountAmount > 0) {
        animateNumberChange(discountAmountElement, `-₹${formatPrice(discountAmount)}`);
        animateNumberChange(popupDiscountAmountElement, `-₹${formatPrice(discountAmount)}`);
        
        if (discountRow.classList.contains('hidden')) {
            discountRow.classList.remove('hidden');
            popupDiscountRow.classList.remove('hidden');
            // Add entry animation for discount row
            discountRow.classList.add('discount-applied');
            setTimeout(() => {
                discountRow.classList.remove('discount-applied');
            }, 800);
        }
    } else {
        if (!discountRow.classList.contains('hidden')) {
            // Add exit animation for discount row
            discountRow.classList.add('discount-removed');
            setTimeout(() => {
                discountRow.classList.add('hidden');
                popupDiscountRow.classList.add('hidden');
                discountRow.classList.remove('discount-removed');
            }, 300);
        }
    }
    
    // Update total amount
    animateNumberChange(cartTotalElement, `₹${formatPrice(cartTotal)}`);
    animateNumberChange(popupTotalElement, `₹${formatPrice(cartTotal)}`);
    
    // Update cart header
    if (cartHeaderElement) {
        cartHeaderElement.classList.add('updated');
        setTimeout(() => {
            cartHeaderElement.classList.remove('updated');
        }, 300);
    }
    
    // Disable checkout button if cart is empty
    checkoutBtn.disabled = cartTotal <= 0;
    
    // Add pulse animation to checkout button if cart has items
    if (cartTotal > 0) {
        checkoutBtn.classList.add('pulse');
        setTimeout(() => {
            checkoutBtn.classList.remove('pulse');
        }, 1000);
    }
}

// Animate number change
function animateNumberChange(element, newValue) {
    element.classList.add('changing');
    setTimeout(() => {
        element.textContent = newValue;
        element.classList.remove('changing');
    }, 150);
}

// Increase item quantity
function increaseItemQuantity(itemId) {
    const item = cartItems.find(item => item.id === itemId || item.productId === itemId);
    if (!item) return;
    
    // Update quantity
    item.quantity += 1;
    
    // Recalculate subtotal immediately
    updateCartSubtotal();
    
    // Highlight the cart item
    const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
    cartItem.classList.add('item-updated');
    setTimeout(() => cartItem.classList.remove('item-updated'), 500);
    
    // Animate quantity change
    const quantityElement = cartItem.querySelector('.quantity-number');
    const prevQuantity = item.quantity - 1;
    
    // Add animation class and update after animation
    quantityElement.classList.add('quantity-changing');
    quantityElement.setAttribute('data-prev', prevQuantity);
    quantityElement.setAttribute('data-new', item.quantity);
    
    setTimeout(() => {
        quantityElement.textContent = item.quantity;
        quantityElement.classList.remove('quantity-changing');
        
        // Show quantity change indicator
        showQuantityChangeIndicator(cartItem, 1);
    }, 150);
    
    // Update item price and cart totals
    const itemPriceElement = cartItem.querySelector('.item-price');
    itemPriceElement.textContent = `₹${formatPrice(item.price * item.quantity)}`;
    itemPriceElement.classList.add('price-updated');
    setTimeout(() => itemPriceElement.classList.remove('price-updated'), 500);
    
    updateCartInDatabase();
    updateCartTotals();
    showToast(`Added one more ${item.name} to your cart`, "success");
}

// Decrease item quantity
function decreaseItemQuantity(itemId) {
    const item = cartItems.find(item => item.id === itemId || item.productId === itemId);
    if (!item) return;
    
    if (item.quantity === 1) {
        // Show confirmation before removing last item
        showConfirmDialog(item);
        return;
    }
    
    // Update quantity
    item.quantity -= 1;
    
    // Recalculate subtotal immediately
    updateCartSubtotal();
    
    // Highlight the cart item
    const cartItem = document.querySelector(`.cart-item[data-id="${itemId}"]`);
    cartItem.classList.add('item-updated');
    setTimeout(() => cartItem.classList.remove('item-updated'), 500);
    
    // Animate quantity change
    const quantityElement = cartItem.querySelector('.quantity-number');
    const prevQuantity = item.quantity + 1;
    
    // Add animation class and update after animation
    quantityElement.classList.add('quantity-changing');
    quantityElement.setAttribute('data-prev', prevQuantity);
    quantityElement.setAttribute('data-new', item.quantity);
    
    setTimeout(() => {
        quantityElement.textContent = item.quantity;
        quantityElement.classList.remove('quantity-changing');
        
        // Show quantity change indicator
        showQuantityChangeIndicator(cartItem, -1);
    }, 150);
    
    // Update item price and cart totals
    const itemPriceElement = cartItem.querySelector('.item-price');
    itemPriceElement.textContent = `₹${formatPrice(item.price * item.quantity)}`;
    itemPriceElement.classList.add('price-updated');
    setTimeout(() => itemPriceElement.classList.remove('price-updated'), 500);
    
    updateCartInDatabase();
    updateCartTotals();
    showToast(`Removed one ${item.name} from your cart`, "info");
}

// New function to update cart subtotal immediately
function updateCartSubtotal() {
    cartSubtotal = 0;
    cartItems.forEach(item => {
        cartSubtotal += item.price * item.quantity;
    });
    
    // Update platform fee - 5% for orders >500, 8% for orders <500
    if (cartSubtotal > 500) {
        platformFee = cartSubtotal * 0.05;
        platformFeeRate = 5;
    } else {
        platformFee = cartSubtotal * 0.08;
        platformFeeRate = 8;
    }
    
    // Update platform fee text in popup
    const popupPlatformFeeLabel = document.getElementById('popup-platform-fee-label');
    
    if (popupPlatformFeeLabel) {
        popupPlatformFeeLabel.textContent = `Platform Fee (${platformFeeRate}%)`;
    }
}

// Remove item from cart
function removeItemFromCart(itemId) {
    // Find item in cart
    const itemIndex = cartItems.findIndex(item => (item.id || item.productId) === itemId);
    
    if (itemIndex !== -1) {
        // Get item name for toast message
        const itemName = cartItems[itemIndex].name;
        
        // Find the cart item element
        const cartItemElement = document.querySelector(`.cart-item[data-id="${itemId}"]`);
        
        // Add remove animation
        if (cartItemElement) {
            cartItemElement.classList.add('removing');
            
            // Wait for animation to complete
            setTimeout(() => {
                // Remove item from cart
                cartItems.splice(itemIndex, 1);
                
                // Immediately update subtotal
                updateCartSubtotal();
                
                // Update UI
                updateCartUI();
                
                // Update database
                updateCartInDatabase();
            }, 300);
        } else {
            // Remove item from cart
            cartItems.splice(itemIndex, 1);
            
            // Immediately update subtotal
            updateCartSubtotal();
            
            // Update UI
            updateCartUI();
            
            // Update database
            updateCartInDatabase();
        }
        
        // Show toast
        showToast(`Removed ${itemName} from cart`, 'success');
    }
}

// Update cart in database
function updateCartInDatabase() {
    // Get current user ID
    const userId = auth.currentUser.uid;
    if (!userId) {
        showToast('Please log in to update cart', 'error');
        return;
    }
    
    // Reference to user's cart in Firebase
    const cartRef = database.ref(`carts/${userId}/items`);
    
    // Convert cart items array to object with item IDs as keys
    const cartItemsObj = {};
    cartItems.forEach(item => {
        const itemId = item.id || item.productId;
        cartItemsObj[itemId] = item;
    });
    
    // Update cart in database
    cartRef.set(cartItemsObj)
        .then(() => {
            console.log('Cart updated successfully');
        })
        .catch(error => {
            console.error('Error updating cart:', error);
            showToast('Failed to update cart', 'error');
        });
}

// Apply discount
function applyDiscount() {
    const discountCode = discountCodeInput.value.trim().toUpperCase();
    
    if (!discountCode) {
        showToast('Please enter a discount code', 'error');
        discountCodeInput.focus();
        discountInputContainer.classList.add('shake');
        setTimeout(() => {
            discountInputContainer.classList.remove('shake');
        }, 400);
        return;
    }
    
    // Set button to loading state
    setButtonLoading(applyDiscountBtn, true);
    
    // Simulate API call to check discount code
    setTimeout(() => {
        // Reset button state
        setButtonLoading(applyDiscountBtn, false);
        
        // Store previous discount amount for animation
        const prevDiscountAmount = discountAmount;
        
        // Check if discount code is valid
        if (discountCode === 'WELCOME10') {
            // Apply 10% discount
            discountApplied = true;
            discountAmount = cartSubtotal * 0.1;
            updateCartTotals();
            showToast('10% discount applied successfully', 'success');
            discountInputContainer.classList.add('success');
            animateDiscountChange(prevDiscountAmount, discountAmount);
        } else if (discountCode === 'FIRST50') {
            // Apply ₹50 discount
            discountApplied = true;
            discountAmount = Math.min(50, cartSubtotal);
            updateCartTotals();
            showToast('₹50 discount applied successfully', 'success');
            discountInputContainer.classList.add('success');
            animateDiscountChange(prevDiscountAmount, discountAmount);
        } else {
            // Invalid discount code
            discountApplied = false;
            discountAmount = 0;
            updateCartTotals();
            showToast('Invalid discount code', 'error');
            discountInputContainer.classList.add('error');
            discountCodeInput.focus();
        }
        
        // Reset discount input container classes after a delay
        setTimeout(() => {
            discountInputContainer.classList.remove('success', 'error');
        }, 2000);
    }, 800);
}

// Proceed to checkout
function proceedToCheckout() {
    if (cartItems.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    // Check if delivery location is selected
    if (!selectedLocationData) {
        showToast('Please select a delivery location', 'error');
        showLocationModal();
        return;
    }
    
    // Proceed with checkout
    setButtonLoading(checkoutBtn, true);
    
    setTimeout(() => {
        // Simulate checkout process (replace with actual checkout flow)
        setButtonLoading(checkoutBtn, false);
        showToast('Order placed successfully!', 'success');
        
        // Navigate to orders page after successful checkout
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 1500);
    }, 2000);
}

// Show toast message
function showToast(message, type = 'success') {
    // Clear any existing toast timer
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastMessage.classList.remove('show');
        
        // Small delay to ensure animation reset
        setTimeout(() => {
            displayToast();
        }, 100);
    } else {
        displayToast();
    }
    
    function displayToast() {
        toastText.textContent = message;
        
        // Reset all classes first
        toastIcon.className = 'toast-icon fa-solid';
        toastMessage.className = 'toast-message';
        
        if (type === 'error') {
            toastIcon.classList.add('fa-times-circle');
            toastMessage.classList.add('error');
        } else if (type === 'info') {
            toastIcon.classList.add('fa-info-circle');
            toastMessage.classList.add('info');
        } else {
            toastIcon.classList.add('fa-check-circle');
            toastMessage.classList.add('success');
        }
        
        toastMessage.classList.add('show');
        
        // Set up the timer for hiding the toast
        toastTimer = setTimeout(() => {
            toastMessage.classList.remove('show');
            toastTimer = null;
        }, 3000);
    }
}

// Add click event to dismiss toast when clicked
toastMessage.addEventListener('click', () => {
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }
    toastMessage.classList.remove('show');
});

// Helper function to set button loading state
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Helper function to set page loading state
function setPageLoading(loading) {
    isLoading = loading;
    if (loading) {
        // Add loading overlay
        if (!document.querySelector('.page-loading')) {
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'page-loading';
            loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(loadingOverlay);
            
            // Add loading class to body
            document.body.classList.add('is-loading');
        }
    } else {
        // Remove loading overlay
        const loadingOverlay = document.querySelector('.page-loading');
        if (loadingOverlay) {
            loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(loadingOverlay);
                document.body.classList.remove('is-loading');
            }, 300);
        }
    }
}

// Format price with commas for thousands
function formatPrice(price) {
    // Ensure price is a valid number
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
        return '0.00';
    }
    return numPrice.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Animate discount change
function animateDiscountChange(oldValue, newValue) {
    if (oldValue === newValue) return;
    
    // Create temporary element for animation
    const tempElement = document.createElement('div');
    tempElement.className = 'discount-change-animation';
    tempElement.textContent = newValue > oldValue 
        ? `Saved ₹${formatPrice(newValue - oldValue)} more!` 
        : oldValue > 0 && newValue === 0 
            ? 'Discount removed' 
            : `Discount changed to ₹${formatPrice(newValue)}`;
            
    document.querySelector('.cart-summary').appendChild(tempElement);
    
    // Trigger animation
    setTimeout(() => {
        tempElement.classList.add('show');
        
        // Remove after animation completes
        setTimeout(() => {
            tempElement.classList.remove('show');
            setTimeout(() => {
                tempElement.remove();
            }, 300);
        }, 2000);
    }, 10);
}

// Add function to show quantity change indicator
function showQuantityChangeIndicator(cartItemElement, changeAmount) {
    // Check if there's an existing indicator and remove it
    const existingIndicator = cartItemElement.querySelector('.quantity-change-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Create the indicator element
    const indicator = document.createElement('div');
    indicator.className = 'quantity-change-indicator' + (changeAmount < 0 ? ' decrease' : '');
    indicator.textContent = (changeAmount > 0 ? '+' : '') + changeAmount;
    
    // Add to cart item
    cartItemElement.appendChild(indicator);
    
    // No need to add 'show' class as we're using CSS animations directly
    // Remove after animation completes (timing matches the CSS animation duration)
    setTimeout(() => {
        indicator.remove();
    }, 2000);
}

// Show order details popup
function showOrderDetailsPopup() {
    // Ensure prices are up-to-date before showing popup
    updateCartSubtotal();
    updateCartTotals();
    
    // Update popup values to ensure they're current
    popupSubtotalElement.textContent = `₹${formatPrice(cartSubtotal)}`;
    popupDeliveryFeeElement.textContent = `₹${formatPrice(deliveryFee)}`;
    popupPlatformFeeElement.textContent = `₹${formatPrice(platformFee)}`;
    popupTotalElement.textContent = `₹${formatPrice(cartTotal)}`;
    
    // Update the platform fee label based on the current rate
    const popupPlatformFeeLabel = document.getElementById('popup-platform-fee-label');
    if (popupPlatformFeeLabel) {
        popupPlatformFeeLabel.textContent = `Platform Fee (${platformFeeRate}%)`;
    }
    
    if (discountApplied && discountAmount > 0) {
        popupDiscountAmountElement.textContent = `-₹${formatPrice(discountAmount)}`;
        popupDiscountRow.classList.remove('hidden');
    } else {
        popupDiscountRow.classList.add('hidden');
    }
    
    // Show popup with animation
    orderDetailsPopup.classList.add('show');
}

// Hide order details popup
function hideOrderDetailsPopup() {
    orderDetailsPopup.classList.remove('show');
}

// Show location modal
function showLocationModal() {
    locationModal.classList.add('show');
    
    // Initialize map if not already initialized
    if (!locationMap) {
        initializeMap();
    }
    
    // Get user's current location
    getUserLocation();
}

// Hide location modal
function hideLocationModal() {
    locationModal.classList.remove('show');
}

// Initialize Leaflet map
function initializeMap() {
    // Create map in the location-map container
    locationMap = L.map('location-map').setView([28.6139, 77.2090], 13); // Default to New Delhi
    
    // Add a tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(locationMap);
    
    // Add click event to map
    locationMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setMapMarker(lat, lng);
        reverseGeocode(lat, lng, 'selected');
    });
}

// Get user's current location
function getUserLocation() {
    // Update UI to show we're fetching location
    currentArea.textContent = 'Fetching location...';
    currentDistrict.textContent = '';
    currentPincode.textContent = '';
    
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            // Success callback
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // Update map with user's location
                if (locationMap) {
                    locationMap.setView([latitude, longitude], 15);
                    setMapMarker(latitude, longitude);
                }
                
                // Use reverse geocoding to get address details
                reverseGeocode(latitude, longitude, 'current');
            },
            // Error callback
            error => {
                console.error('Error getting location:', error);
                currentArea.textContent = 'Unable to get location';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        showToast('Please enable location services for better experience', 'info');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        showToast('Location information is unavailable', 'error');
                        break;
                    case error.TIMEOUT:
                        showToast('Location request timed out', 'error');
                        break;
                    default:
                        showToast('An unknown error occurred getting location', 'error');
                }
            },
            // Options
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        currentArea.textContent = 'Geolocation not supported';
        showToast('Your browser does not support geolocation', 'error');
    }
}

// Reverse geocode coordinates to get address
function reverseGeocode(lat, lng, targetElement) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data.address) {
                // Extract area name - try different possible fields from Nominatim
                const area = data.address.suburb || data.address.neighbourhood || 
                             data.address.district || data.address.locality || '';
                
                // Extract district name
                const district = data.address.city || data.address.town || 
                                 data.address.village || data.address.hamlet || '';
                
                // Extract pincode
                const pincode = data.address.postcode || '';
                
                // Log for debugging
                console.log('Address data:', data.address);
                
                if (targetElement === 'current') {
                    // Update current location elements
                    currentArea.textContent = area || 'Unknown area';
                    currentDistrict.textContent = district || 'Unknown district';
                    currentPincode.textContent = pincode || '';
                    
                    // Store the location data
                    userLocation = {
                        lat,
                        lng,
                        area,
                        district,
                        pincode,
                        fullAddress: data.display_name
                    };
                } else if (targetElement === 'selected') {
                    // Show the selected location section
                    selectedLocationSection.style.display = 'block';
                    
                    // Update selected location elements
                    selectedArea.textContent = area || 'Unknown area';
                    selectedDistrict.textContent = district || 'Unknown district';
                    selectedPincode.textContent = pincode || '';
                    
                    // Store the selected location data
                    selectedLocationData = {
                        lat,
                        lng,
                        area,
                        district,
                        pincode,
                        fullAddress: data.display_name
                    };
                }
            } else {
                if (targetElement === 'current') {
                    currentArea.textContent = 'Unable to determine location';
                } else {
                    selectedArea.textContent = 'Unable to determine location';
                }
                showToast('Could not get address information for this location', 'error');
            }
        })
        .catch(error => {
            console.error('Error with reverse geocoding:', error);
            if (targetElement === 'current') {
                currentArea.textContent = 'Error getting location details';
            } else {
                selectedArea.textContent = 'Error getting location details';
            }
            showToast('Error getting location details', 'error');
        });
}

// Set marker on map
function setMapMarker(lat, lng) {
    // Remove existing marker if any
    if (locationMarker) {
        locationMap.removeLayer(locationMarker);
    }
    
    // Add new marker
    locationMarker = L.marker([lat, lng]).addTo(locationMap);
    
    // Center map on marker
    locationMap.setView([lat, lng], 15);
}

// Use current location as delivery location
function useCurrentLocation() {
    if (!userLocation) {
        showToast('Please wait while we fetch your location', 'info');
        return;
    }
    
    // Copy current location to selected location
    selectedLocationData = { ...userLocation };
    
    // Update selected location display
    selectedLocationSection.style.display = 'block';
    selectedArea.textContent = userLocation.area || 'Unknown area';
    selectedDistrict.textContent = userLocation.district || 'Unknown district';
    selectedPincode.textContent = userLocation.pincode || '';
    
    // Show toast
    showToast('Current location selected for delivery', 'success');
}

// Handle location search input
function handleLocationSearch() {
    const searchTerm = locationSearchInput.value.trim();
    
    // Clear previous timer
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }
    
    // Clear results if search term is empty
    if (searchTerm.length === 0) {
        locationSearchResults.innerHTML = '';
        locationSearchResults.classList.remove('show');
        return;
    }
    
    // Debounce search to avoid too many requests
    searchDebounceTimer = setTimeout(() => {
        searchLocations(searchTerm);
    }, 500);
}

// Search for locations
function searchLocations(searchTerm) {
    // Show loading indicator
    locationSearchResults.innerHTML = '<div class="search-loading">Searching...</div>';
    locationSearchResults.classList.add('show');
    
    // Make request to Nominatim search API
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(data => {
            // Clear results
            locationSearchResults.innerHTML = '';
            
            if (data.length === 0) {
                locationSearchResults.innerHTML = '<div class="no-results">No locations found</div>';
                return;
            }
            
            // Display results (limit to 5)
            const results = data.slice(0, 5);
            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'location-result-item';
                resultItem.innerHTML = `
                    <div class="result-title">${result.display_name.split(',')[0]}</div>
                    <div class="result-address">${result.display_name}</div>
                `;
                
                // Add click event
                resultItem.addEventListener('click', () => {
                    selectSearchResult(result);
                });
                
                locationSearchResults.appendChild(resultItem);
            });
        })
        .catch(error => {
            console.error('Error searching locations:', error);
            locationSearchResults.innerHTML = '<div class="search-error">Error searching locations</div>';
        });
}

// Select a search result
function selectSearchResult(result) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    // Update map
    setMapMarker(lat, lon);
    locationMap.setView([lat, lon], 15);
    
    // Close search results
    locationSearchResults.classList.remove('show');
    
    // Set flag to indicate selection from search
    selectedFromSearch = true;
    
    // Reverse geocode to get detailed address
    reverseGeocode(lat, lon, 'selected');
    
    // Clear search input
    locationSearchInput.value = '';
}

// Confirm selected location and close modal
function confirmLocation() {
    if (!selectedLocationData) {
        showToast('Please select a location first', 'error');
        return;
    }
    
    // Show selected location on the main page
    selectLocationBtn.innerHTML = `
        <i class="fa-solid fa-location-dot"></i>
        <span class="btn-text">Deliver to: ${selectedLocationData.area}, ${selectedLocationData.pincode}</span>
    `;
    
    // Store the location in user's data
    const user = auth.currentUser;
    if (user) {
        database.ref(`users/${user.uid}/deliveryLocation`).set(selectedLocationData)
            .then(() => {
                console.log('Delivery location saved');
            })
            .catch(error => {
                console.error('Error saving delivery location:', error);
            });
    }
    
    // Close the modal
    hideLocationModal();
    
    // Show success message
    showToast('Delivery location updated', 'success');
} 