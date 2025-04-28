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
    
    // Set button to loading state
    setButtonLoading(checkoutBtn, true);
    
    // Simulate checkout process
    setTimeout(() => {
        // Reset button state
        setButtonLoading(checkoutBtn, false);
        
        // Store cart data for checkout page
        localStorage.setItem('checkout_data', JSON.stringify({
            items: cartItems,
            subtotal: cartSubtotal,
            platformFee: platformFee,
            deliveryFee: deliveryFee,
            discount: discountAmount,
            total: cartTotal
        }));
        
        // Show toast
        showToast('Redirecting to checkout...', 'info');
        
        // Simulate redirect after toast
        setTimeout(() => {
            showToast('Checkout feature coming soon!', 'info');
        }, 2000);
    }, 800);
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