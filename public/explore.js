// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCtbwkusKvCEYNCHUytaF4tUISNywsADiM",
    authDomain: "grozily2.firebaseapp.com",
    databaseURL: "https://grozily2-default-rtdb.firebaseio.com",
    projectId: "grozily2",
    storageBucket: "grozily2.appspot.com",
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
const productSearchResults = document.getElementById('product-search-results');
const storeSearchResults = document.getElementById('store-search-results');
const productResultsContainer = document.getElementById('product-results-container');
const storeResultsContainer = document.getElementById('store-results-container');
const productResultCount = document.getElementById('product-result-count');
const storeResultCount = document.getElementById('store-result-count');
const exploreTabs = document.querySelector('.explore-tabs');

// Tab Elements
const productsTab = document.getElementById('products-tab');
const storesTab = document.getElementById('stores-tab');
const tabIndicator = document.querySelector('.tab-indicator');
const productsContent = document.getElementById('products-content');
const storesContent = document.getElementById('stores-content');
const productsTabCount = productsTab.querySelector('.count');
const storesTabCount = storesTab.querySelector('.count');

// Product Elements
const topProducts = document.getElementById('top-products');
const topProductItems = document.querySelector('.top-product-items');
const productsLoading = document.getElementById('products-loading');
const productsNoResults = document.getElementById('products-no-results');

// Store Elements
const topStores = document.getElementById('top-stores');
const topStoreItems = document.querySelector('.top-store-items');
const storesLoading = document.getElementById('stores-loading');
const storesNoResults = document.getElementById('stores-no-results');

// Toast Message
const toastMessage = document.getElementById('toast-message');
const toastText = document.querySelector('.toast-text');
const toastIcon = document.querySelector('.toast-icon');

// Global Data Cache
let allProducts = [];
let allStores = [];
let currentUser = null;
let currentTab = 'products';
let searchQuery = '';
let isDataLoaded = false;
let searchTimeout = null; // For debouncing search

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, initializing explore page...");
    
    // Initial page animation
    document.body.classList.add('page-loaded');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize app (with or without authentication)
    initializeApp();
});

// Main initialization function
function initializeApp() {
    console.log("Initializing app...");
    
    // Show loading indicator
    if (window.showLoading) window.showLoading();
    
    // Load all product and store data for faster search
    loadAllData().then(() => {
        // Display top products and stores
        displayTopProducts();
        displayTopStores();
        
        // Hide loading indicator
        if (window.hideLoading) window.hideLoading();
    }).catch(error => {
        console.error('Error initializing app:', error);
        if (window.hideLoading) window.hideLoading();
        showToast('Failed to load data. Please refresh the page.', 'error');
    });
}

// Load all products and stores data from both paths
function loadAllData() {
    // Return early if data is already loaded
    if (isDataLoaded) return Promise.resolve();
    
    console.log('Loading all data...');
    allProducts = []; // Reset arrays to avoid duplicates
    allStores = [];
    
    // Load products and stores in parallel
    return Promise.all([
        // Get products from main products path
        database.ref('products').once('value'),
        // Get vendors data
        database.ref('vendors').once('value')
    ])
    .then(([productsSnapshot, vendorsSnapshot]) => {
        // Process vendors first so we can use them for products
        const vendors = {};
        
        if (vendorsSnapshot.exists()) {
            vendorsSnapshot.forEach(vendorSnapshot => {
                const vendorData = vendorSnapshot.val();
                const vendorId = vendorSnapshot.key;
                
                // Store in our vendors object and allStores array
                vendors[vendorId] = vendorData;
                
                // Add to allStores
                allStores.push({
                    id: vendorId,
                    storeName: vendorData.storeName || vendorData.name || 'Unknown',
                    address: vendorData.address || {},
                    location: vendorData.location || '',
                    rating: vendorData.rating || 0,
                    reviewCount: vendorData.reviewCount || 0,
                    ...vendorData
    });
});
        }
        
        console.log(`Loaded ${allStores.length} stores`);
        
        // Process products from main products path
        if (productsSnapshot.exists()) {
            productsSnapshot.forEach(productSnapshot => {
                const productData = productSnapshot.val();
                const productId = productSnapshot.key;
                
                // Skip if this product is already in our array
                if (allProducts.some(p => p.id === productId)) {
                    return;
                }
                
                // Add vendor information if available
                if (productData.vendorId && vendors[productData.vendorId]) {
                    const vendorData = vendors[productData.vendorId];
                    productData.vendorName = vendorData.storeName || vendorData.name || 'Unknown';
                }
                
                // Add to our products array
                allProducts.push({
                    id: productId,
                    ...productData,
                    price: productData.discountedPrice || productData.price || 0,
                    originalPrice: productData.originalPrice || 0
                });
            });
        }
        
        // Now load products from vendor_products path (many stores store products here)
        const vendorProductPromises = Object.keys(vendors).map(vendorId => {
            return database.ref(`vendor_products/${vendorId}`).once('value')
                .then(vendorProductsSnapshot => {
                    if (vendorProductsSnapshot.exists()) {
                        vendorProductsSnapshot.forEach(productSnapshot => {
                            const productData = productSnapshot.val();
                            const productId = productSnapshot.key;
                            
                            // Skip if this product is already in our array
                            if (allProducts.some(p => p.id === productId)) {
                                return;
                            }
                            
                            // Add vendor information
                            const vendorData = vendors[vendorId];
                            productData.vendorId = vendorId;
                            productData.vendorName = vendorData.storeName || vendorData.name || 'Unknown';
                            
                            // Add to our products array
                            allProducts.push({
                                id: productId,
                                ...productData,
                                price: productData.discountedPrice || productData.price || 0,
                                originalPrice: productData.originalPrice || 0
                            });
                        });
                    }
                })
                .catch(error => {
                    console.error(`Error loading products for vendor ${vendorId}:`, error);
                });
        });
        
        // Wait for all vendor product loads to complete
        return Promise.all(vendorProductPromises);
    })
    .then(() => {
        console.log(`Loaded ${allProducts.length} products total`);
        isDataLoaded = true;
        return true;
    });
}

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
    
    // Handle search input - show results in real-time with each keystroke
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        
        // Show/hide clear button
        if (query) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
            resetSearch();
            return;
        }
        
        // Show suggestions panel
        showSearchSuggestions();
        
        // Clear previous timeout
        if (searchTimeout) {
        clearTimeout(searchTimeout);
        }
        
        // Show loading indicator in suggestions
        suggestionsList.innerHTML = '<div class="suggestion-loading"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';
        
        // Debounce search to avoid too many searches when typing fast
        searchTimeout = setTimeout(() => {
            // Perform real-time search for suggestions
            performRealTimeSearch(query);
            
            // Also perform full search results in real-time
            if (query.length > 0) {
                // Perform the full search without showing loading indicator
                performFullSearch(query, false);
            }
        }, 300); // 300ms debounce time
    });
    
    // Enter key to execute full search
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            executeFullSearch(searchInput.value.trim());
        }
    });
    
    // Search button
    searchBtn.addEventListener('click', () => {
        if (searchInput.value.trim()) {
            executeFullSearch(searchInput.value.trim());
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

// Display top products 
function displayTopProducts() {
    console.log("Displaying top products...");
    
    // Clear container and show loading
    topProductItems.innerHTML = `
        <div class="loading-indicator" style="grid-column: 1 / -1;">
            <div class="loader"></div>
            <p>Loading products...</p>
        </div>
    `;
    
    // Check if we have products
    if (allProducts.length === 0) {
        topProductItems.innerHTML = '<div class="empty-message">No products available</div>';
        return;
    }
    
    // Sort products by popularity, featured status, or other criteria
    const sortedProducts = [...allProducts].sort((a, b) => {
        // Priority: 1. Featured, 2. Popularity, 3. Name
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        const aPopularity = a.popularity || 0;
        const bPopularity = b.popularity || 0;
        
        if (bPopularity !== aPopularity) {
            return bPopularity - aPopularity;
        }
        
        return (a.name || '').localeCompare(b.name || '');
    });
    
    // Display top 8 products
    const topProductsToShow = sortedProducts.slice(0, 8);
    
    // Clear loading indicator
    topProductItems.innerHTML = '';
    
    // Render each product
    topProductsToShow.forEach(product => {
        renderProductItem(product, topProductItems);
    });
    
    console.log(`Displayed ${topProductsToShow.length} top products`);
}

// Display top stores
function displayTopStores() {
    console.log("Displaying top stores...");
    
    // Clear container and show loading
    topStoreItems.innerHTML = `
        <div class="loading-indicator">
            <div class="loader"></div>
            <p>Loading stores...</p>
        </div>
    `;
    
    // Check if we have stores
    if (allStores.length === 0) {
        topStoreItems.innerHTML = '<div class="empty-message">No stores available</div>';
        return;
    }
    
    // Sort stores by rating, featured status, or other criteria
    const sortedStores = [...allStores].sort((a, b) => {
        // Priority: 1. Featured, 2. Rating, 3. Name
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        const aRating = a.rating || 0;
        const bRating = b.rating || 0;
        
        if (bRating !== aRating) {
            return bRating - aRating;
        }
        
        return (a.storeName || '').localeCompare(b.storeName || '');
    });
    
    // Display top 6 stores
    const topStoresToShow = sortedStores.slice(0, 6);
    
    // Clear loading indicator
    topStoreItems.innerHTML = '';
    
    // Render each store
    topStoresToShow.forEach(store => {
        renderStoreItem(store, topStoreItems);
    });
    
    console.log(`Displayed ${topStoresToShow.length} top stores`);
}

// Perform real-time search as user types
function performRealTimeSearch(query) {
    // Show loading state if data is not yet loaded
    if (!isDataLoaded) {
        suggestionsList.innerHTML = '<div class="suggestion-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading data...</div>';
        
        // Load data first, then perform search
        loadAllData().then(() => {
            performRealTimeSearch(query);
        });
        return;
    }
    
    // Show empty placeholder if query is empty
    if (!query) {
        suggestionsList.innerHTML = '<div class="suggestion-placeholder">Type to search products and stores</div>';
        return;
    }
    
    // Normalize query for search
    const lowerQuery = query.toLowerCase();
    
    // Search through products
    const matchingProducts = allProducts.filter(product => {
        const name = (product.name || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        
        return name.includes(lowerQuery) || 
               category.includes(lowerQuery) || 
               description.includes(lowerQuery);
    });
    
    // Search through stores
    const matchingStores = allStores.filter(store => {
        const name = (store.storeName || '').toLowerCase();
        const location = (store.address?.area || store.location || '').toLowerCase();
        
        return name.includes(lowerQuery) || location.includes(lowerQuery);
    });
    
    console.log(`Found ${matchingProducts.length} products and ${matchingStores.length} stores matching "${query}"`);
    
    // Update UI with results
    updateSearchSuggestions(query, matchingProducts, matchingStores);
}

// Update search suggestions with mixed results
function updateSearchSuggestions(query, products, stores) {
    // Clear suggestions list
    suggestionsList.innerHTML = '';
    
    // Handle no results case
    if (products.length === 0 && stores.length === 0) {
        const noResultsItem = document.createElement('div');
        noResultsItem.className = 'suggestion-no-results';
        noResultsItem.innerHTML = `No results found for "${query}". <span class="search-all">Search anyway</span>`;
        
        // Add click handler for "Search anyway"
        noResultsItem.querySelector('.search-all').addEventListener('click', () => {
            executeFullSearch(query);
        });
        
        suggestionsList.appendChild(noResultsItem);
        return;
    }
    
    // Limit to 5 items per category
    const maxItemsPerCategory = 5;
    const productResults = products.slice(0, maxItemsPerCategory);
    const storeResults = stores.slice(0, maxItemsPerCategory);
    
    // Products section (if we have matches)
    if (productResults.length > 0) {
        // Add Products header
        const productsHeader = document.createElement('div');
        productsHeader.className = 'suggestion-category-header';
        productsHeader.innerHTML = `<i class="fa-solid fa-box"></i> Products`;
        suggestionsList.appendChild(productsHeader);
        
        // Add product items
        productResults.forEach(product => {
            const item = document.createElement('div');
            item.className = 'suggestion-item product-suggestion';
            
            // Highlight the matching text
            const highlightedName = highlightMatchingText(product.name, query);
            
            // Add category if available
            const categoryText = product.category ? ` <span class="suggestion-category">${product.category}</span>` : '';
            
            item.innerHTML = `
                <i class="fa-solid fa-box product-icon"></i>
                <div class="suggestion-text-container">
                    <span class="suggestion-text">${highlightedName}</span>
                    ${categoryText}
                </div>
            `;
            
            // Add click handler
            item.addEventListener('click', () => {
                window.location.href = `product-detail.html?id=${product.id}`;
            });
            
            suggestionsList.appendChild(item);
        });
        
        // Add "See all products" if there are more
        if (products.length > maxItemsPerCategory) {
            const seeAllProducts = document.createElement('div');
            seeAllProducts.className = 'suggestion-see-more';
            seeAllProducts.innerHTML = `<i class="fa-solid fa-angle-right"></i> See all ${products.length} products`;
            
            seeAllProducts.addEventListener('click', () => {
                executeFullSearch(query);
                switchTab('products');
            });
            
            suggestionsList.appendChild(seeAllProducts);
        }
    }
    
    // Stores section (if we have matches)
    if (storeResults.length > 0) {
        // Add Stores header
        const storesHeader = document.createElement('div');
        storesHeader.className = 'suggestion-category-header';
        storesHeader.innerHTML = `<i class="fa-solid fa-store"></i> Stores`;
        suggestionsList.appendChild(storesHeader);
        
        // Add store items
        storeResults.forEach(store => {
            const item = document.createElement('div');
            item.className = 'suggestion-item store-suggestion';
            
            // Highlight the matching text
            const highlightedName = highlightMatchingText(store.storeName, query);
            
            // Add location if available
            const locationText = store.address?.area || store.location ? 
                ` <span class="suggestion-location">${store.address?.area || store.location}</span>` : '';
            
            item.innerHTML = `
                <i class="fa-solid fa-store store-icon"></i>
                <div class="suggestion-text-container">
                    <span class="suggestion-text">${highlightedName}</span>
                    ${locationText}
                </div>
            `;
            
            // Add click handler
            item.addEventListener('click', () => {
                window.location.href = `store-detail.html?id=${store.id}`;
            });
            
            suggestionsList.appendChild(item);
        });
        
        // Add "See all stores" if there are more
        if (stores.length > maxItemsPerCategory) {
            const seeAllStores = document.createElement('div');
            seeAllStores.className = 'suggestion-see-more';
            seeAllStores.innerHTML = `<i class="fa-solid fa-angle-right"></i> See all ${stores.length} stores`;
            
            seeAllStores.addEventListener('click', () => {
                executeFullSearch(query);
                switchTab('stores');
            });
            
            suggestionsList.appendChild(seeAllStores);
        }
    }
    
    // Add "See all results" option at the bottom
            const seeAllItem = document.createElement('div');
            seeAllItem.className = 'suggestion-see-all';
            seeAllItem.innerHTML = `<i class="fa-solid fa-search"></i> See all results for "${query}"`;
            seeAllItem.addEventListener('click', () => {
        executeFullSearch(query);
            });
            suggestionsList.appendChild(seeAllItem);
}

// Highlight matching text in a string
function highlightMatchingText(text, query) {
    if (!text || !query) return text || '';
    
    const lowerText = text.toLowerCase();
                const lowerQuery = query.toLowerCase();

    // If query not found in text, return text as is
    if (!lowerText.includes(lowerQuery)) return text;
    
    // Find the index of the query in the text
    const index = lowerText.indexOf(lowerQuery);
    
    // Extract the parts
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    // Return with highlighted part
    return `${before}<span class="highlight">${match}</span>${after}`;
}

// Show search suggestions
function showSearchSuggestions() {
    searchSuggestions.classList.add('visible');
}

// Hide search suggestions
function hideSearchSuggestions() {
    searchSuggestions.classList.remove('visible');
}

// Execute full search (when user presses Enter or clicks "See all results")
function executeFullSearch(query) {
    if (!query) return;
    
    // Hide suggestions
    hideSearchSuggestions();
    
    // Set search query
    searchQuery = query;
    
    // Make sure data is loaded
    if (!isDataLoaded) {
        // Show loading indicator since this is a user-initiated action
        if (window.showLoading) window.showLoading();
        
        loadAllData().then(() => {
            performFullSearch(query, true);
        }).catch(error => {
            console.error('Error loading data:', error);
            if (window.hideLoading) window.hideLoading();
            showToast('Failed to load data. Please try again.', 'error');
        });
        return;
    }
    
    // Perform the search with loading indicator
    performFullSearch(query, true);
}

// Perform the full search and update the UI
function performFullSearch(query, showLoading = true) {
    console.log(`Performing full search for "${query}"...`);
    
    // Hide top sections
    topProducts.style.display = 'none';
    topStores.style.display = 'none';
    
    // Show search results sections
    productSearchResults.classList.remove('hidden');
    storeSearchResults.classList.remove('hidden');
    
    // Show loading indicator if requested
    if (showLoading && window.showLoading) {
        window.showLoading();
    }
    
    // Search in loaded data
    const lowerQuery = query.toLowerCase();
    
    // Search products
    const matchingProducts = allProducts.filter(product => {
        const name = (product.name || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        const description = (product.description || '').toLowerCase();
        
        return name.includes(lowerQuery) || 
               category.includes(lowerQuery) || 
               description.includes(lowerQuery);
    });
    
    // Search stores
    const matchingStores = allStores.filter(store => {
        const name = (store.storeName || '').toLowerCase();
        const location = (store.address?.area || store.location || '').toLowerCase();
        
        return name.includes(lowerQuery) || location.includes(lowerQuery);
    });
    
    console.log(`Found ${matchingProducts.length} products and ${matchingStores.length} stores matching "${query}"`);
    
    // Update result counts
    productsTabCount.textContent = matchingProducts.length;
    storesTabCount.textContent = matchingStores.length;
        
        // Update product results
    if (matchingProducts.length > 0) {
        productResultCount.textContent = `${matchingProducts.length} result${matchingProducts.length !== 1 ? 's' : ''}`;
            productResultsContainer.innerHTML = '';
        matchingProducts.forEach(product => {
                renderProductItem(product, productResultsContainer);
            });
        } else {
            productResultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fa-solid fa-search"></i>
                    <p>No products found for "${query}"</p>
                </div>
            `;
        }
        
        // Update store results
    if (matchingStores.length > 0) {
        storeResultCount.textContent = `${matchingStores.length} result${matchingStores.length !== 1 ? 's' : ''}`;
            storeResultsContainer.innerHTML = '';
        matchingStores.forEach(store => {
                renderStoreItem(store, storeResultsContainer);
            });
        } else {
            storeResultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fa-solid fa-search"></i>
                    <p>No stores found for "${query}"</p>
                </div>
            `;
        }
        
        // If no results at all
    if (matchingProducts.length === 0 && matchingStores.length === 0) {
            productResultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fa-solid fa-search"></i>
                    <p>No results found for "${query}"</p>
                    <p class="suggestion">Try a different search term or browse categories</p>
                </div>
            `;
        }
        
    // Show appropriate tab based on results
    if (matchingProducts.length > 0 && matchingStores.length === 0) {
            switchTab('products');
    } else if (matchingProducts.length === 0 && matchingStores.length > 0) {
            switchTab('stores');
        } else {
            switchTab(currentTab); // Stay on current tab
        }
    
    // Hide loading indicator if we showed it
    if (showLoading && window.hideLoading) {
        window.hideLoading();
    }
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
}

// Reset search
function resetSearch() {
    searchQuery = '';
    
    // Reset tab counts
    productsTabCount.textContent = '0';
    storesTabCount.textContent = '0';
    
    // Show top products and stores again
    topProducts.style.display = 'block';
    topStores.style.display = 'block';
    
    // Hide search results
    productSearchResults.classList.add('hidden');
    storeSearchResults.classList.add('hidden');
    
    // Clear suggestions
    if (suggestionsList) {
        suggestionsList.innerHTML = '<div class="suggestion-placeholder">Type to search products and stores</div>';
    }
}

// Render a product item in the specified container
function renderProductItem(product, container) {
    console.log("Rendering product:", product.name);
    
    try {
        const template = document.getElementById('product-item-template');
        const productItem = document.importNode(template.content, true).querySelector('.product-item');
        
        // Set product details
        const productImage = productItem.querySelector('.product-image img');
        const productName = productItem.querySelector('.product-name');
        const productVendor = productItem.querySelector('.product-vendor');
        const productPrice = productItem.querySelector('.product-price');
        const originalPrice = productItem.querySelector('.original-price');
        const productWeight = productItem.querySelector('.product-weight');
        
        // Set image with fallback - check all possible image properties
        const imageUrl = product.image || product.imageURL || product.imageUrl || product.imgUrl || 'images/placeholder-product.png';
        productImage.src = imageUrl;
        productImage.alt = product.name || 'Product Image';
        
        // Add error handler for images
        productImage.onerror = function() {
            this.src = 'images/placeholder-product.png';
            this.onerror = null; // Prevent infinite loops
        };
        
        // Set text content
        productName.textContent = product.name || 'Unknown Product';
        
        // Set vendor name if available
        if (product.vendorName) {
            productVendor.textContent = product.vendorName;
        } else if (product.vendorId) {
            // Try to find vendor in allStores
            const vendor = allStores.find(store => store.id === product.vendorId);
            if (vendor) {
                productVendor.textContent = vendor.storeName || vendor.name;
            } else {
                productVendor.textContent = 'Grozily Store';
            }
        } else {
            productVendor.textContent = 'Grozily Store';
        }
        
        // Set pricing - check all possible price properties
        const price = product.discountedPrice || product.price || product.sellingPrice || 0;
        productPrice.textContent = formatPrice(price);
        
        // Set original price if there's a discount
        const origPrice = product.originalPrice || product.mrp || 0;
        if (origPrice && origPrice > price) {
            originalPrice.textContent = formatPrice(origPrice);
            originalPrice.style.display = 'inline';
        } else {
            originalPrice.style.display = 'none';
        }
        
        // Set weight/quantity
        if (product.weight) {
            productWeight.textContent = product.weight;
        } else if (product.quantity) {
            productWeight.textContent = product.quantity;
        } else if (product.size) {
            productWeight.textContent = product.size;
        } else {
            productWeight.style.display = 'none';
        }
        
        // Add click handler to go to product detail
        productItem.addEventListener('click', () => {
            window.location.href = `product-detail.html?id=${product.id}`;
        });
        
        // Add to container
        container.appendChild(productItem);
    } catch (error) {
        console.error("Error rendering product:", error, product);
    }
}

// Render a store item in the specified container
function renderStoreItem(store, container) {
    console.log("Rendering store:", store.storeName || store.name);
    
    try {
        const template = document.getElementById('store-item-template');
        const storeItem = document.importNode(template.content, true).querySelector('.store-item');
        
        // Set store details
        const storeIcon = storeItem.querySelector('.store-image i');
        const storeName = storeItem.querySelector('.store-name');
        const storeLocation = storeItem.querySelector('.store-location');
        const ratingValue = storeItem.querySelector('.rating-value');
        const reviewCount = storeItem.querySelector('.review-count');
        
        // Set name
        storeName.textContent = store.storeName || store.name || 'Unknown Store';
        
        // Set location
        const location = store.address?.area || store.location || 'Location not available';
        storeLocation.textContent = location;
        
        // Set rating if available
        if (store.rating) {
            ratingValue.textContent = parseFloat(store.rating).toFixed(1);
            reviewCount.textContent = store.reviewCount ? `(${store.reviewCount})` : '';
            storeItem.querySelector('.store-rating').style.display = 'flex';
        } else {
            storeItem.querySelector('.store-rating').style.display = 'none';
        }
        
        // Add click handler
        storeItem.addEventListener('click', () => {
            window.location.href = `store-detail.html?id=${store.id}`;
        });
        
        // Add to container
        container.appendChild(storeItem);
    } catch (error) {
        console.error("Error rendering store:", error, store);
    }
}

// Format price
function formatPrice(price) {
    // Handle null, undefined, or NaN
    if (price === null || price === undefined || isNaN(price)) {
        return '₹0.00';
    }
    
    // Parse as float and format as Indian Rupees
    const numPrice = parseFloat(price);
    return '₹' + numPrice.toFixed(2);
}

// Show toast message
function showToast(message, type = 'success') {
    if (!toastMessage) return;
    
    toastText.textContent = message;
    
    if (type === 'error') {
        toastMessage.classList.add('error');
        toastIcon.classList.remove('fa-check-circle');
        toastIcon.classList.add('fa-times-circle');
    } else {
        toastMessage.classList.remove('error');
        toastIcon.classList.remove('fa-times-circle');
        toastIcon.classList.add('fa-check-circle');
    }
    
    toastMessage.classList.add('show');
    
    setTimeout(() => {
        toastMessage.classList.remove('show');
    }, 3000);
} 