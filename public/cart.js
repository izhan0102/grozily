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
const taxesElement = document.getElementById('taxes');
const discountAmountElement = document.getElementById('discount-amount');
const discountRow = document.querySelector('.summary-row.discount');
const cartTotalElement = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const applyDiscountBtn = document.getElementById('apply-discount-btn');
const discountCodeInput = document.getElementById('discount-code-input');

// Toast Message
const toastMessage = document.getElementById('toast-message');
const toastText = document.querySelector('.toast-text');
const toastIcon = document.querySelector('.toast-icon');

// Cart data
let cartItems = [];
let cartTotal = 0;
let cartSubtotal = 0;
let taxes = 0;
let deliveryFee = 40;
let discountAmount = 0;
let discountApplied = false;

// Toast timer reference
let toastTimer = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Ensure toast is hidden initially
    toastMessage.classList.remove('show');
    toastText.textContent = '';
    
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
    
    // Checkout button
    checkoutBtn.addEventListener('click', proceedToCheckout);
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
        // Reference to user's cart in Firebase
        const cartRef = database.ref('carts/' + userId);
        
        // Get cart data
        cartRef.once('value').then(snapshot => {
            if (snapshot.exists() && snapshot.val().items) {
                cartItems = Object.values(snapshot.val().items);
                
                // Update cart UI
                updateCartUI();
            } else {
                // Empty cart
                showEmptyCart();
            }
        });
    } catch (error) {
        console.error('Error loading cart data:', error);
        showToast('Failed to load cart data', 'error');
        showEmptyCart();
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
    cartSummaryElement.style.display = 'block';
    
    // Update cart count
    cartCountElement.textContent = `${cartItems.length} Item${cartItems.length !== 1 ? 's' : ''}`;
    
    // Clear current items
    cartItemsContainer.innerHTML = '';
    
    // Calculate cart subtotal
    cartSubtotal = 0;
    
    // Add each item to the cart
    cartItems.forEach(item => {
        // Add to subtotal
        cartSubtotal += item.price * item.quantity;
        
        // Create cart item element
        const cartItemElement = createCartItemElement(item);
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    // Calculate taxes (5% of subtotal)
    taxes = cartSubtotal * 0.05;
    
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
    
    itemImage.src = item.image || 'https://via.placeholder.com/80';
    itemImage.alt = item.name;
    itemName.textContent = item.name;
    itemQuantity.textContent = `${item.weight || ''} ${item.unit || ''}`.trim();
    itemPrice.textContent = `₹${(item.price * item.quantity).toFixed(2)}`;
    quantityNumber.textContent = item.quantity;
    
    // Set data attribute for item ID
    cartItem.setAttribute('data-id', item.id);
    
    // Add event listeners for quantity buttons
    const decreaseBtn = cartItem.querySelector('.decrease');
    const increaseBtn = cartItem.querySelector('.increase');
    const removeBtn = cartItem.querySelector('.remove-btn');
    
    decreaseBtn.addEventListener('click', () => {
        decreaseItemQuantity(item.id);
    });
    
    increaseBtn.addEventListener('click', () => {
        increaseItemQuantity(item.id);
    });
    
    removeBtn.addEventListener('click', () => {
        removeItemFromCart(item.id);
    });
    
    return cartItem;
}

// Show empty cart
function showEmptyCart() {
    cartItems = [];
    emptyCartElement.style.display = 'flex';
    cartItemsContainer.style.display = 'none';
    cartSummaryElement.style.display = 'none';
    cartCountElement.textContent = '0 Items';
}

// Update cart totals
function updateCartTotals() {
    // Update UI elements
    cartSubtotalElement.textContent = `₹${cartSubtotal.toFixed(2)}`;
    deliveryFeeElement.textContent = `₹${deliveryFee.toFixed(2)}`;
    taxesElement.textContent = `₹${taxes.toFixed(2)}`;
    
    // Calculate total
    cartTotal = cartSubtotal + deliveryFee + taxes - discountAmount;
    
    // Update discount amount if any
    if (discountApplied && discountAmount > 0) {
        discountAmountElement.textContent = `-₹${discountAmount.toFixed(2)}`;
        discountRow.classList.remove('hidden');
    } else {
        discountRow.classList.add('hidden');
    }
    
    // Update total amount
    cartTotalElement.textContent = `₹${cartTotal.toFixed(2)}`;
    
    // Disable checkout button if cart is empty
    checkoutBtn.disabled = cartTotal <= 0;
}

// Increase item quantity
function increaseItemQuantity(itemId) {
    // Find item in cart
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        // Increase quantity
        cartItems[itemIndex].quantity += 1;
        
        // Update UI
        updateCartUI();
        
        // Update database
        updateCartInDatabase();
        
        // Show toast
        showToast('Item quantity increased', 'success');
    }
}

// Decrease item quantity
function decreaseItemQuantity(itemId) {
    // Find item in cart
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        // If quantity is 1, remove item
        if (cartItems[itemIndex].quantity === 1) {
            removeItemFromCart(itemId);
            return;
        }
        
        // Decrease quantity
        cartItems[itemIndex].quantity -= 1;
        
        // Update UI
        updateCartUI();
        
        // Update database
        updateCartInDatabase();
        
        // Show toast
        showToast('Item quantity decreased', 'success');
    }
}

// Remove item from cart
function removeItemFromCart(itemId) {
    // Find item in cart
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        // Get item name for toast
        const itemName = cartItems[itemIndex].name;
        
        // Remove item
        cartItems.splice(itemIndex, 1);
        
        // Update UI
        updateCartUI();
        
        // Update database
        updateCartInDatabase();
        
        // Show toast
        showToast(`${itemName} removed from cart`, 'success');
    }
}

// Update cart in database
function updateCartInDatabase() {
    try {
        const userId = auth.currentUser.uid;
        const cartRef = database.ref('carts/' + userId);
        
        // Convert cart items array to object with IDs as keys
        const cartItemsObject = {};
        cartItems.forEach(item => {
            cartItemsObject[item.id] = item;
        });
        
        // Update database
        cartRef.update({
            items: cartItemsObject,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating cart in database:', error);
        showToast('Failed to update cart', 'error');
    }
}

// Apply discount
function applyDiscount() {
    const discountCode = discountCodeInput.value.trim();
    
    if (!discountCode) {
        showToast('Please enter a discount code', 'error');
        return;
    }
    
    // Set button to loading state
    applyDiscountBtn.disabled = true;
    applyDiscountBtn.textContent = 'Applying...';
    
    // Simulate API call to verify discount code
    setTimeout(() => {
        // Check if code is valid (for demo, we'll accept "WELCOME10" for 10% off)
        if (discountCode.toUpperCase() === 'WELCOME10') {
            // Apply 10% discount
            discountAmount = cartSubtotal * 0.1;
            discountApplied = true;
            
            // Update UI
            updateCartTotals();
            
            // Show toast
            showToast('Discount applied successfully!', 'success');
        } else {
            // Invalid code
            showToast('Invalid discount code', 'error');
            discountAmount = 0;
            discountApplied = false;
            updateCartTotals();
        }
        
        // Reset button
        applyDiscountBtn.disabled = false;
        applyDiscountBtn.textContent = 'Apply';
    }, 1000);
}

// Proceed to checkout
function proceedToCheckout() {
    // Prevent checkout if cart is empty
    if (cartItems.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    // Set button to loading state
    setButtonLoading(checkoutBtn, true);
    
    // Simulate API call to create order
    setTimeout(() => {
        // Redirect to checkout page (would be implemented in real app)
        // For demo, we'll just show a toast
        showToast('Proceeding to checkout...', 'success');
        
        // Reset button
        setButtonLoading(checkoutBtn, false);
        
        // In a real app, you would redirect to a checkout page
        // window.location.href = 'checkout.html';
    }, 1500);
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
        // Set the message text
        toastText.textContent = message;
        
        // Reset all classes first
        toastIcon.className = 'toast-icon fa-solid';
        
        if (type === 'error') {
            toastIcon.classList.add('fa-times-circle', 'error');
        } else if (type === 'info') {
            toastIcon.classList.add('fa-info-circle');
            toastIcon.style.color = '#2196F3';
        } else {
            toastIcon.classList.add('fa-check-circle', 'success');
        }
        
        // Show the toast
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

// Helper function for button loading state
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        // Add a small delay before removing the loading state
        setTimeout(() => {
            button.classList.remove('loading');
            button.disabled = false;
        }, 300);
    }
} 