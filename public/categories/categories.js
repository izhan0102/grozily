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

// DOM elements
const backBtn = document.getElementById('back-btn');
const cartBtn = document.getElementById('cart-btn');
const cartCountBadge = document.getElementById('cart-count-badge');
const productsContainer = document.getElementById('products-container');
const emptyProducts = document.querySelector('.empty-products');
const searchInput = document.getElementById('search-input');
const filterBtn = document.getElementById('filter-btn');

// Toast elements
const toastMessage = document.getElementById('toast-message');
const toastText = document.querySelector('.toast-text');
const toastIcon = document.querySelector('.toast-icon');

// Get the current category from the page title
const categoryTitle = document.querySelector('.simple-header h1').textContent;
let currentCategory = categoryTitle.toLowerCase();
if (currentCategory.includes('&')) {
    currentCategory = currentCategory.split('&')[0].trim();
}

// Global variables
let currentUser = null;
let products = [];
let userCart = [];
let toastTimer = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Back button
    backBtn.addEventListener('click', () => {
        window.location.href = '../home.html';
    });

    // Cart button
    cartBtn.addEventListener('click', () => {
        window.location.href = '../cart.html';
    });

    // Search input
    searchInput.addEventListener('input', filterProducts);

    // Filter button
    filterBtn.addEventListener('click', showFilterOptions);

    // Initialize toast
    toastMessage.classList.remove('show');
    toastText.textContent = '';
});

// Check if user is authenticated
auth.onAuthStateChanged(user => {
    if (!user) {
        // Not logged in, redirect to login page
        window.location.href = '../login.html';
    } else {
        currentUser = user;
        // Load products and cart data
        loadCategoryProducts();
        loadUserCart(user.uid);
    }
});

// Load products for the current category
function loadCategoryProducts() {
    // Show loading state
    productsContainer.innerHTML = '';
    productsContainer.appendChild(emptyProducts);

    // In a real app, you would fetch products from the database by category
    // For now, we'll simulate it
    setTimeout(() => {
        // This would be replaced with actual database fetching
        // Example: database.ref('products').orderByChild('category').equalTo(currentCategory).once('value')
        // For the demo, we'll show the empty state
        
        // When products are available, uncomment this:
        // renderProducts(products);
    }, 1000);
}

// Render products in the grid
function renderProducts(products) {
    if (products.length === 0) {
        // Show empty state
        productsContainer.innerHTML = '';
        productsContainer.appendChild(emptyProducts);
        return;
    }

    // Hide empty state
    emptyProducts.remove();
    productsContainer.innerHTML = '';

    // Create and append product cards
    products.forEach(product => {
        const productCard = createProductCard(product);
        productsContainer.appendChild(productCard);
    });
}

// Create a product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const isInCart = userCart.some(item => item.id === product.id);
    
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-image">
        <div class="product-details">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-info">
                <span class="product-price">₹${product.price.toFixed(2)}</span>
                <button class="add-to-cart" data-id="${product.id}" title="${isInCart ? 'Already in cart' : 'Add to cart'}">
                    <i class="fa-solid ${isInCart ? 'fa-check' : 'fa-plus'}"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add to cart button click event
    const addToCartBtn = card.querySelector('.add-to-cart');
    addToCartBtn.addEventListener('click', () => {
        if (!isInCart) {
            addToCart(product);
        } else {
            showToast('Item already in cart', 'info');
        }
    });
    
    return card;
}

// Add product to cart
function addToCart(product) {
    if (!currentUser) return;
    
    const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
    };
    
    // Add to user's cart in the database
    database.ref(`users/${currentUser.uid}/cart/${product.id}`).set(cartItem)
        .then(() => {
            showToast('Added to cart', 'success');
            userCart.push(cartItem);
            updateCartCount();
            
            // Update UI
            const addBtn = document.querySelector(`.add-to-cart[data-id="${product.id}"]`);
            if (addBtn) {
                addBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                addBtn.title = 'Already in cart';
            }
        })
        .catch(error => {
            showToast('Failed to add to cart', 'error');
            console.error('Error adding to cart:', error);
        });
}

// Load user's cart
function loadUserCart(userId) {
    database.ref(`users/${userId}/cart`).on('value', snapshot => {
        const data = snapshot.val() || {};
        userCart = Object.values(data);
        updateCartCount();
    });
}

// Update cart count in badge
function updateCartCount() {
    const count = userCart.length;
    cartCountBadge.textContent = count;
    
    if (count > 0) {
        cartCountBadge.style.display = 'flex';
    } else {
        cartCountBadge.style.display = 'none';
    }
}

// Filter products based on search input
function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        renderProducts(products);
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.description.toLowerCase().includes(searchTerm)
    );
    
    renderProducts(filteredProducts);
}

// Show filter options
function showFilterOptions() {
    // This would open a filter modal or dropdown
    showToast('Filters coming soon', 'info');
}

// Toast message functions
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