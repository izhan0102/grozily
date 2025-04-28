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
const storage = firebase.storage();

// DOM Elements
const backBtn = document.getElementById('back-btn');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');
const searchContainer = document.querySelector('.search-container');
const searchSuggestions = document.getElementById('search-suggestions');
const suggestionsList = document.getElementById('suggestions-list');
const closeSuggestionsBtn = document.getElementById('close-suggestions-btn');

// Tab Elements
const productsTab = document.getElementById('products-tab');
const storesTab = document.getElementById('stores-tab');
const tabIndicator = document.querySelector('.tab-indicator');
const productsContent = document.getElementById('products-content');
const storesContent = document.getElementById('stores-content');

// Product Elements
const topProducts = document.getElementById('top-products');
const topProductItems = document.querySelector('.top-product-items');
const productSearchResults = document.getElementById('product-search-results');
const productResultCount = document.getElementById('product-result-count');
const productResultsContainer = document.getElementById('product-results-container');
const productsLoading = document.getElementById('products-loading');
const productsNoResults = document.getElementById('products-no-results');

// Store Elements
const topStores = document.getElementById('top-stores');
const topStoreItems = document.querySelector('.top-store-items');
const storeSearchResults = document.getElementById('store-search-results');
const storeResultCount = document.getElementById('store-result-count');
const storeResultsContainer = document.getElementById('store-results-container');
const storesLoading = document.getElementById('stores-loading');
const storesNoResults = document.getElementById('stores-no-results');

// Toast Message
const toastMessage = document.getElementById('toast-message');
const toastText = document.querySelector('.toast-text');
const toastIcon = document.querySelector('.toast-icon');

// User data
let currentUser = null;
let currentTab = 'products';
let searchQuery = '';
let searchTimeout = null;
let cachedProducts = {};
let cachedStores = {};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Initial page animation
    document.body.classList.add('page-loaded');
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if user is authenticated
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadInitialData();
        } else {
            // Redirect to login page
            window.location.href = 'login.html';
        }
    });
});

// Set up event listeners
function setupEventListeners() {
    // Back button
    backBtn.addEventListener('click', () => {
        window.location.href = 'home.html';
    });
    
    // Search input
    searchInput.addEventListener('focus', () => {
        searchContainer.classList.add('focused');
        showSearchSuggestions();
    });
    
    searchInput.addEventListener('blur', (e) => {
        // Don't blur if clicking on suggestions
        if (e.relatedTarget && e.relatedTarget.closest('.search-suggestions')) {
            searchInput.focus();
            return;
        }
        
        // Only remove focus if not clicking on suggestions
        setTimeout(() => {
            searchContainer.classList.remove('focused');
            hideSearchSuggestions();
        }, 200);
    });
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        
        // Show/hide clear button
        if (query) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
        }
        
        // Debounce search
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                updateSearchSuggestions(query);
            } else {
                suggestionsList.innerHTML = '';
            }
        }, 300);
    });
    
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            executeSearch(searchInput.value.trim());
        }
    });
    
    // Search button
    searchBtn.addEventListener('click', () => {
        if (searchInput.value.trim()) {
            executeSearch(searchInput.value.trim());
        }
    });
    
    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        resetSearch();
    });
    
    // Close suggestions button
    closeSuggestionsBtn.addEventListener('click', () => {
        hideSearchSuggestions();
    });
    
    // Tab navigation
    productsTab.addEventListener('click', () => {
        switchTab('products');
    });
    
    storesTab.addEventListener('click', () => {
        switchTab('stores');
    });
}

// Switch between tabs
function switchTab(tab) {
    // Update active tab
    if (tab === 'products') {
        productsTab.classList.add('active');
        storesTab.classList.remove('active');
        productsContent.classList.add('active');
        storesContent.classList.remove('active');
        tabIndicator.style.transform = 'translateX(0)';
    } else {
        productsTab.classList.remove('active');
        storesTab.classList.add('active');
        productsContent.classList.remove('active');
        storesContent.classList.add('active');
        tabIndicator.style.transform = 'translateX(100%)';
    }
    
    currentTab = tab;
    
    // If we have an active search, refocus results
    if (searchQuery) {
        if (tab === 'products') {
            productSearchResults.classList.remove('hidden');
        } else {
            storeSearchResults.classList.remove('hidden');
        }
    }
}

// Load initial data
function loadInitialData() {
    // Load top products and stores
    loadTopProducts();
    loadTopStores();
}

// Function to fetch vendor data (similar to home.js)
function fetchVendorData(vendorId) {
    return database.ref(`vendors/${vendorId}`).once('value')
        .then(vendorSnapshot => {
            if (vendorSnapshot.exists()) {
                const vendor = vendorSnapshot.val();
                return vendor.storeName || vendor.name || 'Unknown Vendor';
            } else {
                return 'Unknown Vendor';
            }
        })
        .catch(error => {
            console.error('Error fetching vendor:', error);
            return 'Unknown Vendor';
        });
}

// Function to fetch products and their vendor data
function fetchProductsWithVendors(productRefs) {
    const products = [];
    const vendorPromises = [];

    productRefs.forEach(productSnapshot => {
        const product = productSnapshot.val();
        product.id = productSnapshot.key;
        if (product.vendorId) {
            // Create a promise that resolves to the product object with vendorName added
            const vendorPromise = fetchVendorData(product.vendorId)
                .then(vendorName => {
                    product.vendorName = vendorName;
                    return product; // Return the product object
                });
            vendorPromises.push(vendorPromise);
        } else {
            product.vendorName = 'Unknown Vendor';
            products.push(product); // Add products without vendorId directly
        }
    });

    return Promise.all(vendorPromises)
        .then(vendorProducts => {
            // Combine products that needed vendor lookup with those that didn't
            return [...products, ...vendorProducts];
        });
}

// Load top products
function loadTopProducts() {
    // Show loading state
    topProductItems.innerHTML = '<div class="loading-placeholder"></div>'.repeat(8);

    database.ref('products')
        .orderByChild('popularity') // Assuming 'popularity' field exists
        .limitToLast(8)
        .once('value')
        .then(snapshot => {
            topProductItems.innerHTML = '';

            if (snapshot.exists()) {
                return fetchProductsWithVendors(snapshot); // Fetch products with vendor names
            } else {
                topProducts.innerHTML = '<p class="no-data">No popular products found.</p>';
                return []; // Return empty array if no products
            }
        })
        .then(productsWithVendors => {
            if (productsWithVendors.length > 0) {
                 // Sort by popularity (highest first) - Ensure popularity field exists
                const sortedProducts = productsWithVendors.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

                // Render top products
                sortedProducts.forEach(product => {
                    renderProductItem(product, topProductItems);
                });
            } else if (topProducts.innerHTML === '') { // Only update if not already showing "No popular products"
                 topProducts.innerHTML = '<p class="no-data">No popular products available.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading top products:', error);
            topProducts.innerHTML = '<p class="no-data">Error loading products.</p>';
        });
}

// Load top stores
function loadTopStores() {
    // Show loading state
    topStoreItems.innerHTML = '<div class="loading-placeholder"></div>'.repeat(5);

    database.ref('vendors') // Changed path from 'stores' to 'vendors'
        .orderByChild('rating') // Assuming 'rating' field exists in vendors
        .limitToLast(5)
        .once('value')
        .then(snapshot => {
            topStoreItems.innerHTML = '';

            if (snapshot.exists()) {
                const stores = [];
                snapshot.forEach(childSnapshot => {
                    stores.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });

                // Sort by rating (highest first)
                const sortedStores = stores.sort((a, b) => (b.rating || 0) - (a.rating || 0));

                // Render top stores
                sortedStores.forEach(store => {
                    renderStoreItem(store, topStoreItems);
                });
            } else {
                topStores.innerHTML = '<p class="no-data">No stores available.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading top stores:', error);
            topStores.innerHTML = '<p class="no-data">Error loading stores.</p>';
        });
}

// Render a product item
function renderProductItem(product, container) {
    // Clone template
    const template = document.getElementById('product-item-template');
    if (!template) {
        console.error("Template #product-item-template not found!");
        return;
    }
    const productItem = document.importNode(template.content, true).querySelector('.product-item');

    // Set product data
    const productImage = productItem.querySelector('.product-image img');
    const productName = productItem.querySelector('.product-name');
    const productVendor = productItem.querySelector('.product-vendor'); // Get vendor element
    const productPrice = productItem.querySelector('.product-price'); // Current price element
    const originalPriceEl = productItem.querySelector('.original-price'); // Original price element
    const productWeight = productItem.querySelector('.product-weight');

    // Set image with error handling
    productImage.src = product.imageURL || 'https://via.placeholder.com/150?text=No+Image';
    productImage.alt = product.name;
    productImage.onerror = function() {
        this.onerror = null;
        this.src = 'https://via.placeholder.com/150?text=No+Image';
    };

    productName.textContent = product.name || 'Unnamed Product';
    productVendor.textContent = product.vendorName || 'Unknown Vendor'; // Set vendor name

    // Set prices
    const currentPrice = product.discountedPrice || product.price; // Use discounted if available
    const originalPrice = product.originalPrice;

    if (currentPrice) {
        productPrice.textContent = `₹${formatPrice(currentPrice)}`;
    } else {
         productPrice.textContent = 'N/A';
    }

    if (originalPrice && originalPrice > currentPrice) {
        originalPriceEl.textContent = `₹${formatPrice(originalPrice)}`;
        originalPriceEl.style.display = 'inline'; // Show original price
    } else {
        originalPriceEl.style.display = 'none'; // Hide original price if no discount
    }


    if (product.weight && product.unit) {
        productWeight.textContent = `${product.weight} ${product.unit}`;
    } else {
        productWeight.style.display = 'none'; // Hide weight if not available
    }

    // Add click event to navigate to product detail
    productItem.addEventListener('click', () => {
        // Make sure product detail page exists and uses query param 'id'
        window.location.href = `product-detail.html?id=${product.id}`;
    });

    // Add to container
    container.appendChild(productItem);
}

// Render a store item
function renderStoreItem(store, container) {
    // Clone template
    const template = document.getElementById('store-item-template');
    const storeItem = document.importNode(template.content, true).querySelector('.store-item');

    // Set store data
    const storeImage = storeItem.querySelector('.store-image');
    const storeNameEl = storeItem.querySelector('.store-name');
    const storeLocation = storeItem.querySelector('.store-location');
    const ratingValue = storeItem.querySelector('.rating-value');
    const reviewCount = storeItem.querySelector('.review-count');

    // Replace image with icon
    storeImage.innerHTML = '<i class="fa-solid fa-store"></i>';
    
    storeNameEl.textContent = store.storeName || store.name || 'Unknown Store';
    storeLocation.textContent = store.address?.area || store.location || 'Unknown location';

    const rating = store.rating || 0;
    const reviews = store.reviewCount || 0;

    ratingValue.textContent = rating.toFixed(1);
    reviewCount.textContent = `(${reviews})`;

    // Add click event to navigate to store detail
    storeItem.addEventListener('click', () => {
        window.location.href = `vendor-detail.html?id=${store.id}`;
    });

    // Add to container
    container.appendChild(storeItem);
}

// Format price with commas for thousands
function formatPrice(price) {
    if (!price) return '0.00';
    return parseFloat(price).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Show search suggestions
function showSearchSuggestions() {
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        // Show empty suggestions list
        suggestionsList.innerHTML = '<div class="suggestion-placeholder">Type to search...</div>';
    } else {
        // Show search suggestions based on query
        updateSearchSuggestions(query);
    }
    
    searchSuggestions.classList.add('visible');
}

// Hide search suggestions
function hideSearchSuggestions() {
    searchSuggestions.classList.remove('visible');
}

// Update search suggestions based on query
function updateSearchSuggestions(query) {
    if (query.length < 2) return;
    
    // Clear suggestions list
    suggestionsList.innerHTML = '';
    
    // Add loading indicator
    const loadingItem = document.createElement('div');
    loadingItem.className = 'suggestion-loading';
    loadingItem.innerHTML = 'Searching...';
    suggestionsList.appendChild(loadingItem);
    
    // Search in products
    database.ref('products')
        .orderByChild('name')
        .startAt(query.toLowerCase())
        .endAt(query.toLowerCase() + '\uf8ff')
        .limitToFirst(3)
        .once('value')
        .then(snapshot => {
            // Remove loading indicator
            suggestionsList.innerHTML = '';
            
            const suggestions = new Set();
            
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const product = childSnapshot.val();
                    suggestions.add(product.name);
                });
            }
            
            // Search in categories
            return database.ref('categories')
                .orderByChild('name')
                .startAt(query.toLowerCase())
                .endAt(query.toLowerCase() + '\uf8ff')
                .limitToFirst(2)
                .once('value')
                .then(categorySnapshot => {
                    if (categorySnapshot.exists()) {
                        categorySnapshot.forEach(childSnapshot => {
                            const category = childSnapshot.val();
                            suggestions.add(category.name);
                        });
                    }
                    
                    // Render suggestions
                    if (suggestions.size === 0) {
                        // Add the search query itself as a suggestion
                        const queryItem = createSuggestionItem(query);
                        suggestionsList.appendChild(queryItem);
                    } else {
                        suggestions.forEach(suggestion => {
                            const suggestionItem = createSuggestionItem(suggestion);
                            suggestionsList.appendChild(suggestionItem);
                        });
                    }
                });
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
            suggestionsList.innerHTML = '';
            const errorItem = document.createElement('div');
            errorItem.className = 'suggestion-error';
            errorItem.innerHTML = 'Error loading suggestions';
            suggestionsList.appendChild(errorItem);
        });
}

// Create a suggestion item
function createSuggestionItem(text) {
    const template = document.getElementById('suggestion-item-template');
    const suggestionItem = document.importNode(template.content, true).querySelector('.suggestion-item');
    
    const suggestionText = suggestionItem.querySelector('.suggestion-text');
    suggestionText.textContent = text;
    
    suggestionItem.addEventListener('click', () => {
        searchInput.value = text;
        executeSearch(text);
    });
    
    return suggestionItem;
}

// Execute search
function executeSearch(query) {
    if (!query || query.length < 2) return;
    
    // Save search query
    searchQuery = query;
    
    // Update UI
    searchInput.blur();
    hideSearchSuggestions();
    clearSearchBtn.classList.add('visible');
    
    // Show search results sections, hide initial sections
    topProducts.classList.add('hidden');
    topStores.classList.add('hidden');
    
    // Search based on current tab
    if (currentTab === 'products') {
        searchProducts(query);
    } else {
        searchStores(query);
    }
}

// Reset search
function resetSearch() {
    // Clear search query
    searchQuery = '';
    
    // Show initial sections, hide search results sections
    topProducts.classList.remove('hidden');
    topStores.classList.remove('hidden');
    
    productSearchResults.classList.add('hidden');
    storeSearchResults.classList.add('hidden');
    productsLoading.classList.add('hidden');
    storesLoading.classList.add('hidden');
    productsNoResults.classList.add('hidden');
    storesNoResults.classList.add('hidden');
}

// Search products
function searchProducts(query) {
    // Show loading indicator
    productSearchResults.classList.remove('hidden');
    productsLoading.classList.remove('hidden');
    productResultsContainer.innerHTML = '';
    productResultCount.textContent = 'Searching...';
    productsNoResults.classList.add('hidden');

    // Clear cache for new search (optional, depends on desired behavior)
    // delete cachedProducts[query];

    // Check if we have cached results (might need adjustment if data can change)
    // if (cachedProducts[query]) {
    //     renderProductSearchResults(cachedProducts[query], query);
    //     return;
    // }

    // Search in products
    database.ref('products')
        .once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const matchingProductsRefs = [];
                const lowerQuery = query.toLowerCase();

                snapshot.forEach(childSnapshot => {
                    const product = childSnapshot.val();
                    // Match by name, category, or description
                    const name = (product.name || '').toLowerCase();
                    const category = (product.category || '').toLowerCase();
                    const description = (product.description || '').toLowerCase();

                    if (name.includes(lowerQuery) ||
                        category.includes(lowerQuery) ||
                        description.includes(lowerQuery)) {
                        matchingProductsRefs.push(childSnapshot); // Store the snapshot ref
                    }
                });

                if (matchingProductsRefs.length > 0) {
                    return fetchProductsWithVendors(matchingProductsRefs); // Fetch matches with vendor names
                } else {
                    return []; // No matches found
                }

            } else {
                // No products exist at all in the database
                return [];
            }
        })
        .then(productsWithVendors => {
             // Cache the results (optional)
             // cachedProducts[query] = productsWithVendors;

            // Render results
            renderProductSearchResults(productsWithVendors, query);
        })
        .catch(error => {
            console.error('Error searching products:', error);
            productsLoading.classList.add('hidden');
            productsNoResults.classList.remove('hidden');
            productResultCount.textContent = 'Error searching';
            showToast('Error searching products', 'error');
        });
}

// Render product search results
function renderProductSearchResults(products, query) {
    // Hide loading indicator
    productsLoading.classList.add('hidden');
    
    if (products.length === 0) {
        productsNoResults.classList.remove('hidden');
        productResultCount.textContent = '0 results';
        return;
    }
    
    // Update result count
    productResultCount.textContent = `${products.length} result${products.length !== 1 ? 's' : ''}`;
    
    // Clear results container
    productResultsContainer.innerHTML = '';
    
    // Sort products by relevance (exact name match first)
    const lowerQuery = query.toLowerCase();
    products.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        
        // Exact match first
        if (aName === lowerQuery && bName !== lowerQuery) return -1;
        if (bName === lowerQuery && aName !== lowerQuery) return 1;
        
        // Starts with query next
        if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1;
        if (bName.startsWith(lowerQuery) && !aName.startsWith(lowerQuery)) return 1;
        
        // Then sort by name
        return aName.localeCompare(bName);
    });
    
    // Render products
    products.forEach(product => {
        renderProductItem(product, productResultsContainer);
    });
}

// Search stores
function searchStores(query) {
    // Show loading indicator
    storeSearchResults.classList.remove('hidden');
    storesLoading.classList.remove('hidden');
    storeResultsContainer.innerHTML = '';
    storeResultCount.textContent = 'Searching...';
    storesNoResults.classList.add('hidden');

    // Clear cache for new search (optional)
    // delete cachedStores[query];

    // Check if we have cached results (optional)
    // if (cachedStores[query]) {
    //     renderStoreSearchResults(cachedStores[query], query);
    //     return;
    // }

    // Search in vendors
    database.ref('vendors') // Changed path from 'stores' to 'vendors'
        .once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const stores = [];
                const lowerQuery = query.toLowerCase();

                snapshot.forEach(childSnapshot => {
                    const store = {
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    };

                    // Match by name or location/area
                    const name = (store.storeName || store.name || '').toLowerCase();
                    const location = (store.address?.area || store.location || '').toLowerCase(); // Check both fields

                    if (name.includes(lowerQuery) || location.includes(lowerQuery)) {
                        stores.push(store);
                    }
                });

                // Cache the results (optional)
                // cachedStores[query] = stores;

                // Render results
                renderStoreSearchResults(stores, query);
            } else {
                // No stores exist
                storesLoading.classList.add('hidden');
                storesNoResults.classList.remove('hidden');
                storeResultCount.textContent = '0 results';
            }
        })
        .catch(error => {
            console.error('Error searching stores:', error);
            storesLoading.classList.add('hidden');
            storesNoResults.classList.remove('hidden');
            storeResultCount.textContent = 'Error searching';
            showToast('Error searching stores', 'error');
        });
}

// Render store search results
function renderStoreSearchResults(stores, query) {
    // Hide loading indicator
    storesLoading.classList.add('hidden');
    
    if (stores.length === 0) {
        storesNoResults.classList.remove('hidden');
        storeResultCount.textContent = '0 results';
        return;
    }
    
    // Update result count
    storeResultCount.textContent = `${stores.length} result${stores.length !== 1 ? 's' : ''}`;
    
    // Clear results container
    storeResultsContainer.innerHTML = '';
    
    // Sort stores by relevance (exact name match first)
    const lowerQuery = query.toLowerCase();
    stores.sort((a, b) => {
        const aName = (a.storeName || a.name || '').toLowerCase();
        const bName = (b.storeName || b.name || '').toLowerCase();
        
        // Exact match first
        if (aName === lowerQuery && bName !== lowerQuery) return -1;
        if (bName === lowerQuery && aName !== lowerQuery) return 1;
        
        // Starts with query next
        if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1;
        if (bName.startsWith(lowerQuery) && !aName.startsWith(lowerQuery)) return 1;
        
        // Then sort by rating
        return (b.rating || 0) - (a.rating || 0);
    });
    
    // Render stores
    stores.forEach(store => {
        renderStoreItem(store, storeResultsContainer);
    });
}

// Show toast message
function showToast(message, type = 'success') {
    toastText.textContent = message;
    
    toastIcon.className = 'toast-icon fa-solid';
    if (type === 'error') {
        toastIcon.classList.add('fa-times-circle');
        toastMessage.classList.add('error');
    } else {
        toastIcon.classList.add('fa-check-circle');
        toastMessage.classList.add('success');
    }
    
    toastMessage.classList.add('show');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toastMessage.classList.remove('show');
    }, 3000);
} 