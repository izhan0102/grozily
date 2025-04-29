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

// Ensure page always starts at the top on refresh
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Force scroll to top when page loads
window.addEventListener('load', function() {
    setTimeout(function() {
        window.scrollTo(0, 0);
    }, 0);
});

// Force scroll to top on page refresh
window.addEventListener('beforeunload', function() {
    window.scrollTo(0, 0);
});

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const userPhone = document.getElementById('user-phone');
const userHouse = document.getElementById('user-house');
const userArea = document.getElementById('user-area');
const userLandmark = document.getElementById('user-landmark');
const landmarkContainer = document.getElementById('landmark-container');
const userAddress = document.getElementById('user-address');
const userPinCode = document.getElementById('user-pincode');
const userLocation = document.getElementById('user-location');
const locationIndicator = document.querySelector('.location-indicator');
const locationDropdown = document.getElementById('location-dropdown');
const dropdownArea = document.getElementById('dropdown-area');
const dropdownPincode = document.getElementById('dropdown-pincode');
const editLocationBtn = document.getElementById('edit-location-btn');

// Buttons
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.getElementById('profile-dropdown-content');
const viewProfileBtn = document.getElementById('view-profile-btn');
const editProfileBtn = document.getElementById('edit-profile-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

// Toast Message
const toastMessage = document.getElementById('toast-message');
const toastText = document.querySelector('.toast-text');
const toastIcon = document.querySelector('.toast-icon');

// Navigation Elements
const navItems = document.querySelectorAll('.nav-item');

// New DOM Elements for Products
const productsContainer = document.getElementById('products-container');
const productsPlaceholder = document.getElementById('products-placeholder');

// Initialize navigation and dropdown
document.addEventListener('DOMContentLoaded', () => {
    // Set active navigation based on current page
    const currentPath = window.location.pathname;
    navItems.forEach(item => {
        const itemPath = item.getAttribute('href');
        if (currentPath.endsWith(itemPath)) {
            item.classList.add('active');
        }
        
        // Add tap feedback effect
        item.addEventListener('click', function(e) {
            if (this.getAttribute('href') === currentPath.split('/').pop()) {
                e.preventDefault(); // Prevent navigation if already on the page
                
                // Add ripple effect
                this.classList.add('tapped');
                setTimeout(() => {
                    this.classList.remove('tapped');
                }, 200);
            }
        });
    });
    
    // Initial update of greeting based on time of day
    updateGreeting();
    
    // Set up interval to update greeting every hour
    setInterval(updateGreeting, 3600000); // 3600000 ms = 1 hour
    
    // Setup DOM observer to watch for changes to userName
    if (userName) {
        // Create a MutationObserver to watch for changes to the userName text
        const nameObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    console.log('Username changed, updating greeting');
                    updateGreetingName(userName.textContent);
                }
            });
        });
        
        // Start observing userName element
        nameObserver.observe(userName, { 
            characterData: true, 
            childList: true,
            subtree: true 
        });
        
        console.log('Username observer set up');
    }
    
    // Initialize Leaflet map
    initLeafletMap();
    
    // Update cart badge on page load
    updateCartBadge();
    
    // Profile dropdown toggle
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (profileDropdown.classList.contains('show') && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });
    
    // Initialize search bar with changing placeholders
    initSearchBar();
    
    // Initialize category scrolling
    initCategoryScroll();
    
    // Load nearby stores
    loadNearbyStores();
});

// Initialize Leaflet map and get user location
function initLeafletMap() {
    // Create map in the hidden container
    const map = L.map('map-container').setView([0, 0], 2);
    
    // Add a tile layer (optional, since the map is hidden)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    // Get user's location
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            // Success callback
            function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // Update map position (even though it's hidden)
                map.setView([latitude, longitude], 13);
                
                // Use reverse geocoding to get address
                reverseGeocode(latitude, longitude);
            },
            // Error callback
            function(error) {
                console.error('Error getting location:', error);
                const userLocationElement = document.getElementById('user-location');
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        userLocationElement.textContent = 'Location access denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        userLocationElement.textContent = 'Location unavailable';
                        break;
                    case error.TIMEOUT:
                        userLocationElement.textContent = 'Location request timed out';
                        break;
                    default:
                        userLocationElement.textContent = 'Unable to get location';
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
        document.getElementById('user-location').textContent = 'Geolocation not supported';
    }
}

// Reverse geocode coordinates to get address
function reverseGeocode(lat, lon) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            const locationDisplay = document.querySelector('.location-display');
            const userLocation = document.getElementById('user-location');
            
            // Update the UI with the location data
            if (data.address) {
                // Extract area name - try different possible fields from Nominatim
                const area = data.address.suburb || data.address.neighbourhood || data.address.district || data.address.locality || '';
                
                // Extract pincode
                const pincode = data.address.postcode || '';
                
                // Create display string: "Area Name, Pincode" or just "Area Name" if no pincode
                const display = area ? (pincode ? `${area}, ${pincode}` : area) : 'Location found';
                
                console.log('Address data:', data.address); // Log the full address data for debugging
                userLocation.textContent = display;
                
                // Add animation class
                locationDisplay.classList.add('updated');
                
                // Remove the class after animation completes
                setTimeout(() => {
                    locationDisplay.classList.remove('updated');
                }, 1000);
            } else {
                userLocation.textContent = 'Location found';
            }
            
            // Show the location display
            locationDisplay.style.display = 'flex';
        })
        .catch(error => {
            console.error('Error with reverse geocoding:', error);
            document.getElementById('user-location').textContent = 'Location found';
        });
}

// Initialize search bar with dynamic placeholders
function initSearchBar() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    if (!searchInput || !searchButton) return;
    
    // Array of placeholder texts to cycle through
    const placeholders = [
        'Search for wheat flour...',
        'Looking for rice?',
        'Try searching for shampoo...',
        'Need some fresh fruits?',
        'Search for dairy products...',
        'Find your favorite snacks...'
    ];
    
    let currentPlaceholderIndex = 0;
    let placeholderInterval;
    
    // Change placeholder text every 3 seconds
    function cyclePlaceholders() {
        searchInput.placeholder = placeholders[currentPlaceholderIndex];
        
        // Add fade effect
        searchInput.classList.add('placeholder-fade');
        setTimeout(() => {
            searchInput.classList.remove('placeholder-fade');
        }, 500);
        
        currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
    }
    
    // Start cycling placeholder text
    cyclePlaceholders();
    placeholderInterval = setInterval(cyclePlaceholders, 3000);
    
    // Redirect to explore when search input is clicked
    searchInput.addEventListener('click', (e) => {
        e.preventDefault();
        showLoading();
        window.location.href = 'explore.html';
    });
    
    // Resume cycling when user blurs input
    searchInput.addEventListener('blur', () => {
        if (!searchInput.value) {
            cyclePlaceholders();
            clearInterval(placeholderInterval);
            placeholderInterval = setInterval(cyclePlaceholders, 3000);
        }
    });
    
    // Search button functionality
    searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        showLoading();
        window.location.href = 'explore.html';
    });
}

// Check if user is authenticated
auth.onAuthStateChanged(user => {
    if (!user) {
        // No user is signed in, redirect to login page
        window.location.href = 'login.html';
    } else {
        // Load basic user data
        loadBasicUserData(user);
        
        // Load featured products
        loadFeaturedProducts();
        
        // Update cart badge
        updateCartBadge();
    }
});

// Load basic user data
function loadBasicUserData(user) {
    try {
        // Set name and email
        userName.textContent = user.displayName || 'User';
        userEmail.textContent = user.email || user.phoneNumber || 'No email provided';
        
        // Immediately update greeting with whatever name we have so far
        updateGreetingName(userName.textContent);
        
        // Check for more user data in database
        const userRef = database.ref('users/' + user.uid);
        userRef.once('value').then(snapshot => {
            if (snapshot.exists() && snapshot.val().details) {
                const details = snapshot.val().details;
                
                // Update user name if available
                if (details.fullName) {
                    userName.textContent = details.fullName;
                    // Update greeting again with the updated name
                    updateGreetingName(details.fullName);
                }
                
                // Full greeting update after all data is loaded
                updateGreeting();
            } else {
                updateGreeting();
            }
        });
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Failed to load user data', 'error');
        
        // Try to update greeting even if there was an error
        updateGreeting();
    }
}

// Helper function to directly update just the greeting name
function updateGreetingName(name) {
    const greetingName = document.getElementById('greeting-name');
    if (greetingName && name && name !== 'Loading...') {
        greetingName.textContent = name;
        console.log('Directly updated greeting name to:', name);
    }
}

// View profile button
viewProfileBtn.addEventListener('click', () => {
    // Create and show a profile modal with all user details
    // For now, we'll navigate to a profile page
    window.location.href = 'profile.html';
});

// Edit profile button
editProfileBtn.addEventListener('click', () => {
    // Add transition effect
    const profileCard = document.querySelector('.profile-card');
    if (profileCard) {
        profileCard.style.transform = 'scale(0.95)';
        profileCard.style.opacity = '0.8';
        setTimeout(() => {
            window.location.href = 'user-details.html';
        }, 200);
    } else {
        window.location.href = 'user-details.html';
    }
});

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    try {
        showToast('Logging out...', 'info');
        await auth.signOut();
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    } catch (error) {
        console.error('Error signing out:', error);
        showToast('Failed to log out', 'error');
    }
});

// Delete account functionality
const deleteAccountModal = document.getElementById('delete-account-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// Show the delete confirmation modal when delete account button is clicked
deleteAccountBtn.addEventListener('click', () => {
    // Close dropdown if open
    profileDropdown.classList.remove('show');
    
    // Show delete confirmation modal
    setTimeout(() => {
        deleteAccountModal.classList.add('show');
    }, 100);
});

// Cancel delete account
cancelDeleteBtn.addEventListener('click', () => {
    deleteAccountModal.classList.remove('show');
});

// Close modal if user clicks outside the modal content
deleteAccountModal.addEventListener('click', (e) => {
    if (e.target === deleteAccountModal) {
        deleteAccountModal.classList.remove('show');
    }
});

// Confirm delete account
confirmDeleteBtn.addEventListener('click', async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('No user is signed in', 'error');
            deleteAccountModal.classList.remove('show');
            return;
        }
        
        // Show deleting status
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        
        // Delete user data from database
        await database.ref('users/' + user.uid).remove();
        
        // Delete user account
        await user.delete();
        
        // Hide modal after successful deletion
        deleteAccountModal.classList.remove('show');
        
        showToast('Account deleted successfully', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        console.error('Error deleting account:', error);
        
        // Reset button state
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-trash-alt"></i> Delete Account';
        
        // Hide modal
        deleteAccountModal.classList.remove('show');
        
        // Handle specific errors
        if (error.code === 'auth/requires-recent-login') {
            showToast('Please log out and log in again to delete your account', 'error');
            
            // Force logout to make user reauthenticate
            setTimeout(async () => {
                await auth.signOut();
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showToast('Failed to delete account: ' + error.message, 'error');
        }
    }
});

// Toast timer reference
let toastTimer;

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
        toastIcon.className = 'toast-icon';
        
        if (type === 'error') {
            toastIcon.classList.add('fa-times-circle', 'error');
        } else if (type === 'info') {
            toastIcon.classList.add('fa-info-circle');
            toastIcon.style.color = '#2196F3';
        } else {
            toastIcon.classList.add('fa-check-circle', 'success');
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

// Show loading overlay
function showLoading() {
    if (window.showLoading) {
        window.showLoading();
    }
}

// Hide loading overlay
function hideLoading() {
    if (window.hideLoading) {
        window.hideLoading();
    }
}

// Handle back button for mobile app-like experience
window.addEventListener('popstate', function(event) {
    // Show animation before actually going back
    const profileCard = document.querySelector('.profile-card');
    if (profileCard) {
        profileCard.style.transform = 'translateX(100%)';
        profileCard.style.opacity = '0';
    }
});

// Improved category scrolling with better inertia
function initCategoryScroll() {
    const categoryScroll = document.querySelector('.categories-scroll');
    if (!categoryScroll) return;

    let isDown = false;
    let startX;
    let scrollLeft;
    let startTime;
    let endTime;
    let distance;
    let momentumID;

    // Mouse events for desktop
    categoryScroll.addEventListener('mousedown', (e) => {
        isDown = true;
        categoryScroll.classList.add('active');
        startX = e.pageX;
        scrollLeft = categoryScroll.scrollLeft;
        startTime = Date.now();
        
        // Clear any existing momentum
        clearInterval(momentumID);
    });

    categoryScroll.addEventListener('mouseleave', () => {
        if (!isDown) return;
        endDrag();
    });

    categoryScroll.addEventListener('mouseup', () => {
        if (!isDown) return;
        endDrag();
    });

    categoryScroll.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        
        const x = e.pageX;
        // Reduce resistance by using smaller multiplier (0.8 instead of 1.5)
        distance = (startX - x) * 0.8;
        startX = x;
        
        // Apply scrolling directly
        categoryScroll.scrollLeft += distance;
    });

    // Touch events for mobile
    categoryScroll.addEventListener('touchstart', (e) => {
        isDown = true;
        categoryScroll.classList.add('active');
        startX = e.touches[0].pageX;
        scrollLeft = categoryScroll.scrollLeft;
        startTime = Date.now();
        
        // Clear any existing momentum
        clearInterval(momentumID);
    }, { passive: true });

    categoryScroll.addEventListener('touchend', () => {
        if (!isDown) return;
        endDrag();
    });

    categoryScroll.addEventListener('touchcancel', () => {
        if (!isDown) return;
        endDrag();
    });

    categoryScroll.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        
        const x = e.touches[0].pageX;
        // Reduce resistance by using smaller multiplier
        distance = (startX - x) * 0.8;
        startX = x;
        
        // Apply scrolling directly
        categoryScroll.scrollLeft += distance;
    });

    // End drag and start momentum
    function endDrag() {
        isDown = false;
        categoryScroll.classList.remove('active');
        endTime = Date.now();
        
        // Calculate velocity based on time and distance
        const timeElapsed = endTime - startTime;
        
        // Increase momentum sensitivity by lowering the time threshold
        if (timeElapsed < 150 && Math.abs(distance) > 2) {
            // Apply momentum with ease-out effect
            // Increase initial momentum strength (20 instead of 10)
            let momentum = distance * 20;
            let iteration = 0;
            
            clearInterval(momentumID);
            momentumID = setInterval(() => {
                iteration++;
                
                // Make deceleration slower for longer scrolling (0.92 instead of 0.90)
                momentum *= 0.92;
                
                // Apply scroll
                categoryScroll.scrollLeft += momentum;
                
                // Stop momentum when it's small enough or too many iterations
                if (Math.abs(momentum) < 0.2 || iteration > 150) {
                    clearInterval(momentumID);
                }
            }, 10);
        }
    }

    // Make default scrolling behavior much easier for wheel
    categoryScroll.addEventListener('wheel', (e) => {
        // Scroll horizontally with the wheel with higher sensitivity
        categoryScroll.scrollLeft += e.deltaY * 2;
    });
}

// Function to update greeting message based on time of day
function updateGreeting() {
    const greetingMessage = document.getElementById('greeting-message');
    const greetingName = document.getElementById('greeting-name');
    
    if (!greetingMessage || !greetingName) {
        console.error('Greeting elements not found!');
        return;
    }
    
    // Get current hour
    const currentHour = new Date().getHours();
    
    // Set time-appropriate greeting text
    let greetingText = 'Good morning';
    if (currentHour >= 12 && currentHour < 17) {
        greetingText = 'Good afternoon';
    } else if (currentHour >= 17) {
        greetingText = 'Good evening';
    }
    
    // Use the same name that's already working in the profile dropdown
    const name = userName ? userName.textContent : null;
    
    // Update just the name part, keeping the greeting structure intact
    if (name && name !== 'Loading...') {
        // DIRECT: Update the span element only
        greetingName.textContent = name;
        
        // Also make sure the full message format is correct
        greetingMessage.innerHTML = `${greetingText}, <span id="greeting-name">${name}</span>!`;
        
        console.log('Greeting updated with name:', name, 'and greeting:', greetingText);
    } else {
        greetingName.textContent = 'Guest';
        greetingMessage.innerHTML = `${greetingText}, <span id="greeting-name">Guest</span>!`;
    }
}

// Load featured products from vendors
function loadFeaturedProducts() {
    // Show loading state
    productsContainer.innerHTML = `
        <div class="products-loading">
            <div class="spinner"></div>
            <p>Loading products...</p>
        </div>
    `;
    
    // Get all products from vendors
    database.ref('products').limitToLast(12).once('value')
        .then(snapshot => {
            // If no products found
            if (!snapshot.exists()) {
                showEmptyProductsState();
                return;
            }
            
            const products = [];
            const vendorPromises = [];
            
            // First pass - collect all products and create promises for vendor data
            snapshot.forEach(productSnapshot => {
                const product = productSnapshot.val();
                product.id = productSnapshot.key;
                
                // If product has vendor ID, create a promise to fetch vendor data
                if (product.vendorId) {
                    const vendorPromise = database.ref(`vendors/${product.vendorId}`).once('value')
                        .then(vendorSnapshot => {
                            if (vendorSnapshot.exists()) {
                                const vendor = vendorSnapshot.val();
                                product.vendorName = vendor.storeName || vendor.name || 'Unknown Vendor';
                            } else {
                                product.vendorName = 'Unknown Vendor';
                            }
                            return product;
                        })
                        .catch(error => {
                            console.error('Error fetching vendor:', error);
                            product.vendorName = 'Unknown Vendor';
                            return product;
                        });
                    
                    vendorPromises.push(vendorPromise);
                } else {
                    product.vendorName = 'Unknown Vendor';
                    products.push(product);
                }
            });
            
            // Wait for all vendor promises to resolve
            Promise.all(vendorPromises)
                .then(vendorProducts => {
                    // Combine products with vendor data and products without vendor data
                    const allProducts = [...products, ...vendorProducts];
                    
                    // Sort by most recent first
                    allProducts.sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                        return dateB - dateA;
                    });
                    
                    // Limit to 8 products for the featured section
                    const featuredProducts = allProducts.slice(0, 8);
                    
                    if (featuredProducts.length > 0) {
                        renderProducts(featuredProducts);
                    } else {
                        showEmptyProductsState();
                    }
                })
                .catch(error => {
                    console.error('Error processing products:', error);
                    showEmptyProductsState();
                });
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            showEmptyProductsState();
        });
}

// Alternative version that fetches products from vendor_products structure
function loadVendorProducts() {
    // Show loading state
    productsContainer.innerHTML = `
        <div class="products-loading">
            <div class="spinner"></div>
            <p>Loading products...</p>
        </div>
    `;
    
    // First get all vendors
    database.ref('vendors').once('value')
        .then(vendorSnapshot => {
            if (!vendorSnapshot.exists()) {
                showEmptyProductsState();
                return;
            }
            
            const productPromises = [];
            const vendors = {};
            
            // Store vendors info
            vendorSnapshot.forEach(vendor => {
                const vendorData = vendor.val();
                const vendorId = vendor.key;
                vendors[vendorId] = {
                    name: vendorData.storeName || vendorData.name || 'Unknown Vendor'
                };
                
                // Create promise to fetch this vendor's products
                const productPromise = database.ref(`vendor_products/${vendorId}`).limitToFirst(5).once('value')
                    .then(productsSnapshot => {
                        const vendorProducts = [];
                        
                        if (productsSnapshot.exists()) {
                            productsSnapshot.forEach(productSnapshot => {
                                const product = productSnapshot.val();
                                product.id = productSnapshot.key;
                                product.vendorId = vendorId;
                                product.vendorName = vendors[vendorId].name;
                                vendorProducts.push(product);
                            });
                        }
                        
                        return vendorProducts;
                    })
                    .catch(error => {
                        console.error(`Error fetching products for vendor ${vendorId}:`, error);
                        return [];
                    });
                
                productPromises.push(productPromise);
            });
            
            // Wait for all product promises to resolve
            Promise.all(productPromises)
                .then(vendorProductsArrays => {
                    // Flatten array of arrays
                    const allProducts = [].concat(...vendorProductsArrays);
                    
                    // Sort by most recent first (if timestamps exist)
                    allProducts.sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                        return dateB - dateA;
                    });
                    
                    // Limit to 8 products for the featured section
                    const featuredProducts = allProducts.slice(0, 8);
                    
                    if (featuredProducts.length > 0) {
                        renderProducts(featuredProducts);
                    } else {
                        showEmptyProductsState();
                    }
                })
                .catch(error => {
                    console.error('Error processing vendor products:', error);
                    showEmptyProductsState();
                });
        })
        .catch(error => {
            console.error('Error fetching vendors:', error);
            showEmptyProductsState();
        });
}

// Render product cards
function renderProducts(products) {
    // Clear loading state
    productsContainer.innerHTML = '';
    
    // Hide placeholder if it was shown
    if (productsPlaceholder) {
        productsPlaceholder.style.display = 'none';
    }
    
    // Add product cards
    products.forEach(product => {
        const discount = calculateDiscount(product.originalPrice, product.discountedPrice);
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        productCard.innerHTML = `
            <a href="product-detail.html?id=${product.id}" class="product-link">
                <div class="product-image-container">
                    <img src="${product.imageURL || 'https://via.placeholder.com/300?text=No+Image'}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
                    ${discount > 0 ? 
                      `<div class="discount-badge-container">
                          <span class="discount-badge">${discount}% OFF</span>
                       </div>` : ''}
                    ${product.featured ? '<span class="feature-badge">FEATURED</span>' : ''}
                </div>
                <div class="product-details">
                    <div class="product-meta">
                        <span class="product-vendor">${product.vendorName}</span>
                    </div>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">₹${formatPrice(product.discountedPrice)}</span>
                        ${product.originalPrice > product.discountedPrice ? 
                          `<span class="original-price">₹${formatPrice(product.originalPrice)}</span>` : ''}
                    </div>
                </div>
            </a>
            <div class="product-action">
                <button class="add-to-cart" data-product-id="${product.id}">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
                <button class="quick-view" data-product-id="${product.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        
        // Add to cart functionality
        const addToCartBtn = productCard.querySelector('.add-to-cart');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(product);
            });
        }
        
        // Quick view functionality
        const quickViewBtn = productCard.querySelector('.quick-view');
        if (quickViewBtn) {
            quickViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // You can implement a quick view modal here
                window.location.href = `product-detail.html?id=${product.id}`;
            });
        }
        
        productsContainer.appendChild(productCard);
    });
}

// Show empty state when no products
function showEmptyProductsState() {
    productsContainer.innerHTML = `
        <div class="products-empty">
            <i class="fas fa-box-open"></i>
            <p>No products available right now</p>
        </div>
    `;
}

// Calculate discount percentage
function calculateDiscount(originalPrice, discountedPrice) {
    if (!originalPrice || !discountedPrice || originalPrice <= discountedPrice) {
        return 0;
    }
    const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
    return Math.round(discount);
}

// Format price with commas for thousands
function formatPrice(price) {
    return parseFloat(price).toLocaleString('en-IN');
}

// Update cart badge on page load
function updateCartBadge() {
    // Get current user ID
    const userId = auth.currentUser?.uid;
    if (!userId) {
        return;
    }
    
    // Get the cart badge element
    const cartBadge = document.getElementById('cart-badge');
    if (!cartBadge) return;
    
    // Get the cart reference
    const cartRef = database.ref(`carts/${userId}/items`);
    
    // Get the count of items in the cart
    cartRef.once('value')
        .then(snapshot => {
            const itemCount = snapshot.numChildren();
            if (itemCount > 0) {
                // Update the cart badge
                cartBadge.textContent = itemCount.toString();
                cartBadge.classList.add('show');
            } else {
                // If no items in the cart, reset but don't hide the badge
                cartBadge.textContent = '0';
                cartBadge.classList.remove('show');
            }
        })
        .catch(error => {
            console.error('Error fetching cart items:', error);
        });
        
    // Set up real-time listener for cart changes
    cartRef.on('value', (snapshot) => {
        const itemCount = snapshot.numChildren();
        if (itemCount > 0) {
            cartBadge.textContent = itemCount.toString();
            cartBadge.classList.add('show');
        } else {
            cartBadge.textContent = '0';
            cartBadge.classList.remove('show');
        }
    });
}

// Add product to cart
function addToCart(product) {
    // Get current user ID
    const userId = auth.currentUser.uid;
    if (!userId) {
        showToast('Please log in to add items to cart', 'error');
        return;
    }
    
    // Get the button that was clicked
    const button = document.querySelector(`.add-to-cart[data-product-id="${product.id}"]`);
    
    // Create the flying image animation
    const productCard = button.closest('.product-card');
    const productImage = productCard.querySelector('.product-image');
    const cartIcon = document.querySelector('.nav-item[href="cart.html"] i');
    
    if (productImage && cartIcon) {
        // Get positions
        const imgRect = productImage.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();
        
        // Create the flying image
        const flyingImg = document.createElement('img');
        flyingImg.src = productImage.src;
        flyingImg.classList.add('fly-image-to-cart');
        flyingImg.style.top = `${imgRect.top}px`;
        flyingImg.style.left = `${imgRect.left}px`;
        document.body.appendChild(flyingImg);
        
        // Start animation in the next frame
        requestAnimationFrame(() => {
            flyingImg.style.top = `${cartRect.top}px`;
            flyingImg.style.left = `${cartRect.left}px`;
            flyingImg.style.opacity = '0.7';
            flyingImg.style.transform = 'scale(0.3)';
            
            // Remove the element after animation completes
            setTimeout(() => {
                flyingImg.remove();
            }, 500);
        });
    }
    
    // Check if user has a cart
    const cartRef = database.ref(`carts/${userId}/items/${product.id}`);
    
    // Check if product is already in cart
    cartRef.once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                // Product exists, increase quantity
                const currentQuantity = snapshot.val().quantity || 1;
                return cartRef.update({
                    quantity: currentQuantity + 1,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // Product doesn't exist, add it
                return cartRef.set({
                    productId: product.id,
                    name: product.name,
                    price: parseFloat(product.discountedPrice),
                    originalPrice: parseFloat(product.originalPrice),
                    imageURL: product.imageURL,
                    vendorId: product.vendorId,
                    vendorName: product.vendorName,
                    quantity: 1,
                    addedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        })
        .then(() => {
            // Update cart badge
            updateCartBadge();
            
            // Change button appearance to indicate success
            if (button) {
                button.innerHTML = '<i class="fas fa-check"></i> Added to Cart';
                button.classList.add('added');
                button.disabled = true;
                
                // Change button back after 2 seconds
                setTimeout(() => {
                    button.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
                    button.classList.remove('added');
                    button.disabled = false;
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
            showToast('Error adding item to cart', 'error');
        });
}

// Add this function to load nearby stores from Firebase
function loadNearbyStores() {
    const storesContainer = document.getElementById('stores-container');
    const noStoresMessage = document.getElementById('no-stores-message');
    
    // First clear the loading state
    storesContainer.innerHTML = '<div class="stores-loading"><div class="spinner"></div><p>Finding stores near you...</p></div>';
    
    // Get user location (assuming we already have it from earlier in the app)
    const userLocation = getUserLocation();
    
    // Load vendors as stores since we don't have a separate stores node
    firebase.database().ref('vendors').once('value')
        .then(snapshot => {
            displayStores(snapshot);
        })
        .catch(error => {
            console.error("Error fetching vendors/stores:", error);
            storesContainer.innerHTML = '<p class="error-message">Failed to load stores. Please try again later.</p>';
        });
    
    function displayStores(snapshot) {
        // Clear loading state
        storesContainer.innerHTML = '';
        
        if (!snapshot.exists() || snapshot.numChildren() === 0) {
            storesContainer.style.display = 'none';
            noStoresMessage.style.display = 'flex';
            return;
        }
        
        noStoresMessage.style.display = 'none';
        storesContainer.style.display = 'flex';
        
        let storeCount = 0;
        snapshot.forEach(storeSnapshot => {
            storeCount++;
            const vendor = storeSnapshot.val();
            const vendorId = storeSnapshot.key;
            
            // Create store card
            const storeCard = document.createElement('div');
            storeCard.className = 'store-card';
            storeCard.setAttribute('data-store-id', vendorId);
            
            // Calculate distance if we have user location
            let distanceText = '';
            if (userLocation && vendor.location) {
                // Try to parse location if it's a string
                let vendorLocation = vendor.location;
                if (typeof vendor.location === 'string') {
                    // Try to extract lat/lng from string format (simple parsing)
                    const locationParts = vendor.location.split(',').map(part => parseFloat(part.trim()));
                    if (locationParts.length === 2 && !isNaN(locationParts[0]) && !isNaN(locationParts[1])) {
                        vendorLocation = {
                            lat: locationParts[0],
                            lng: locationParts[1]
                        };
                    }
                }
                
                if (vendorLocation && vendorLocation.lat && vendorLocation.lng) {
                    const distance = calculateDistance(
                        userLocation.lat, userLocation.lng,
                        vendorLocation.lat, vendorLocation.lng
                    );
                    distanceText = `<span class="store-distance">${distance.toFixed(1)} km away</span>`;
                }
            }
            
            // Determine store icon color based on index
            const colorIndex = storeCount % 8 || 8;
            const colorClass = `store-color-${colorIndex}`;
            
            // Extract location/area name
            let areaName = 'No location';
            if (typeof vendor.location === 'string') {
                // Simple extraction - get first part before comma
                const parts = vendor.location.split(',');
                if (parts.length > 0) {
                    areaName = parts[0].trim();
                }
            }
            
            // Set the HTML content
            storeCard.innerHTML = `
                <div class="store-image">
                    ${vendor.imageURL ? 
                        `<img src="${vendor.imageURL}" alt="${vendor.storeName || vendor.name}">` : 
                        `<div class="store-icon ${colorClass}">
                            <i class="fa-solid fa-store"></i>
                         </div>`
                    }
                </div>
                <div class="store-info">
                    <h3>${vendor.storeName || vendor.name}</h3>
                    <p class="store-owner">Owner: ${vendor.name || 'Unknown'}</p>
                    <p class="store-address">
                        <i class="fa-solid fa-location-dot"></i>
                        ${areaName}
                    </p>
                    ${distanceText}
                </div>
                <div class="store-arrow">
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
            `;
            
            // Add click event to the entire card
            storeCard.addEventListener('click', () => {
                window.location.href = `store-detail.html?id=${vendorId}`;
            });
            
            // Add click event specifically to the arrow
            const arrowElement = storeCard.querySelector('.store-arrow');
            if (arrowElement) {
                arrowElement.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent the card click from triggering
                    window.location.href = `store-detail.html?id=${vendorId}`;
                });
            }
            
            storesContainer.appendChild(storeCard);
            
            // Limit to 5 stores for simplicity
            if (storeCount >= 5) return;
        });
    }
}

// Helper function to calculate distance (haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Helper to get user location (simplified)
function getUserLocation() {
    // This would normally come from the geolocation API
    // For now, we'll return null or check if it's saved in localStorage
    return JSON.parse(localStorage.getItem('userLocation')) || null;
}