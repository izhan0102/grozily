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

// Global variables for location functionality
let locationPickerMap = null;
let locationMarker = null;
let selectedLocation = null;

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
    
    // Initialize location menu
    initLocationMenu();
    
    // If current location tab is active by default, start fetching location immediately
    const currentLocationTab = document.getElementById('current-location-tab');
    const currentLocationContent = document.getElementById('current-location-content');
    if (currentLocationTab && currentLocationTab.classList.contains('active') && 
        currentLocationContent && currentLocationContent.classList.contains('active')) {
        // Start location detection immediately
        setTimeout(useCurrentDeviceLocation, 100);
    }
    
    // Pre-fetch location in the background regardless of whether location menu is open
    // This ensures we have location data ready when user opens the location menu
    if ('geolocation' in navigator) {
        // Quietly try to get location in the background for better UX
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Store basic location immediately
                const basicLocation = {
                    lat, 
                    lng,
                    display_name: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    timestamp: new Date().toISOString()
                };
                
                // Cache this basic location immediately
                localStorage.setItem('currentDetectedLocation', JSON.stringify(basicLocation));
                window.currentDetectedLocation = basicLocation;
                
                // Store in userLocation for stores to use immediately
                localStorage.setItem('userLocation', JSON.stringify(basicLocation));
                
                // Load stores based on basic location immediately
                loadNearbyStores();
                
                // Also try to get the address in the background
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.display_name) {
                            const parts = data.display_name.split(', ');
                            const shortAddress = parts.slice(0, 3).join(', ');
                            
                            if (data.address) {
                                const area = data.address.suburb || 
                                      data.address.neighbourhood || 
                                      data.address.district || 
                                      data.address.city_district || '';
                                const city = data.address.city || 
                                      data.address.town || 
                                      data.address.village || '';
                                const postcode = data.address.postcode || '';
                                
                                // Enhanced location object
                                const locationObj = {
                                    lat, 
                                    lng, 
                                    display_name: data.display_name,
                                    short_name: shortAddress,
                                    area,
                                    city,
                                    postcode,
                                    timestamp: new Date().toISOString()
                                };
                                
                                // Cache the enhanced location data
                                localStorage.setItem('currentDetectedLocation', JSON.stringify(locationObj));
                                window.currentDetectedLocation = locationObj;
                                
                                // Update userLocation with enhanced data
                                localStorage.setItem('userLocation', JSON.stringify(locationObj));
                                
                                // Update UI with location data
                                const userLocationElement = document.getElementById('user-location');
                                if (userLocationElement) {
                                    if (area) {
                                        userLocationElement.textContent = `${area}${postcode ? ', ' + postcode : ''}`;
                                    } else if (shortAddress) {
                                        userLocationElement.textContent = shortAddress;
                                    }
                                }
                                
                                // Refresh stores with the better location data
                                loadNearbyStores();
                            }
                        }
                    })
                    .catch(error => console.error('Background reverse geocoding error:', error));
            },
            (error) => console.log('Background geolocation error:', error),
            { 
                enableHighAccuracy: false, // Lower accuracy for background fetch
                timeout: 5000, 
                maximumAge: 0
            }
        );
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (profileDropdown.classList.contains('show') && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
        
        const locationMenu = document.getElementById('location-menu');
        const locationDisplay = document.getElementById('location-display');
        if (locationMenu && locationMenu.classList.contains('active') && 
            !locationMenu.contains(e.target) && !locationDisplay.contains(e.target)) {
            locationMenu.classList.remove('active');
            locationDisplay.classList.remove('active');
        }
    });
    
    // Initialize search bar with changing placeholders
    initSearchBar();
    
    // Initialize category scrolling
    initCategoryScroll();
    
    // Load nearby stores regardless of location state
    // This ensures something is shown even before location is detected
    loadNearbyStores();
});

// Initialize location menu functionality
function initLocationMenu() {
    const locationDisplay = document.getElementById('location-display');
    const locationMenu = document.getElementById('location-menu');
    const closeLocationMenuBtn = document.getElementById('close-location-menu');
    
    // Location tabs
    const currentLocationTab = document.getElementById('current-location-tab');
    const savedLocationTab = document.getElementById('saved-location-tab');
    const addLocationTab = document.getElementById('add-location-tab');
    
    // Location tab contents
    const currentLocationContent = document.getElementById('current-location-content');
    const savedLocationContent = document.getElementById('saved-location-content');
    const addLocationContent = document.getElementById('add-location-content');
    
    // Location action buttons
    const useCurrentLocationBtn = document.getElementById('use-current-location');
    const saveLocationBtn = document.getElementById('save-location-btn');
    const useSelectedLocationBtn = document.getElementById('use-selected-location');
    const locationSearchBtn = document.getElementById('location-search-btn');
    const locationSearchInput = document.getElementById('location-search-input');
    
    // Tab switching functionality
    currentLocationTab.addEventListener('click', () => {
        setActiveTab(currentLocationTab, currentLocationContent);
        // Automatically fetch current location when tab is selected
        setTimeout(useCurrentDeviceLocation, 100); // Reduced timeout for faster response
    });
    
    savedLocationTab.addEventListener('click', () => {
        setActiveTab(savedLocationTab, savedLocationContent);
        loadSavedLocations();
    });
    
    addLocationTab.addEventListener('click', () => {
        setActiveTab(addLocationTab, addLocationContent);
        
        // Initialize map with retry mechanism
        let retryCount = 0;
        const maxRetries = 3;
        
        function initMapWithRetry() {
            setTimeout(() => {
                try {
                    initLocationPickerMap();
                    
                    // Check if map initialized properly
                    if (!locationPickerMap || !locationPickerMap._loaded) {
                        if (retryCount < maxRetries) {
                            console.log(`Map initialization retry ${retryCount + 1}/${maxRetries}`);
                            retryCount++;
                            initMapWithRetry();
                        } else {
                            console.error('Failed to initialize map after multiple attempts');
                            showToast('Error loading map. Please try again.', 'error');
                        }
                    }
                } catch (e) {
                    console.error('Error in map initialization:', e);
                    if (retryCount < maxRetries) {
                        retryCount++;
                        initMapWithRetry();
                    } else {
                        showToast('Error loading map. Please try again.', 'error');
                    }
                }
            }, 300);
        }
        
        initMapWithRetry();
    });
    
    // Toggle location menu
    locationDisplay.addEventListener('click', () => {
        locationMenu.classList.toggle('active');
        locationDisplay.classList.toggle('active');
        
        // Check if current location tab is active, start fetching immediately
        if (currentLocationTab.classList.contains('active')) {
            setTimeout(useCurrentDeviceLocation, 100);
        }
        
        // Initialize map when opening add-location tab
        if (addLocationTab.classList.contains('active')) {
            setTimeout(initLocationPickerMap, 300);
        }
    });
    
    // Close location menu
    closeLocationMenuBtn.addEventListener('click', () => {
        locationMenu.classList.remove('active');
        locationDisplay.classList.remove('active');
    });
    
    // Helper function to set active tab
    function setActiveTab(tabButton, tabContent) {
        // Remove active class from all tabs
        [currentLocationTab, savedLocationTab, addLocationTab].forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab contents
        [currentLocationContent, savedLocationContent, addLocationContent].forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab
        tabButton.classList.add('active');
        tabContent.classList.add('active');
    }
    
    // Initialize location picker map
    function initLocationPickerMap() {
        // Force map container to be visible before initializing
        const mapContainer = document.getElementById('location-map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }
        
        // Make sure map container is visible and has dimensions
        mapContainer.style.display = 'block';
        
        if (locationPickerMap) {
            // If map already exists, just resize it
            setTimeout(() => {
                locationPickerMap.invalidateSize(true);
            }, 100);
            return;
        }
        
        // Create map with a small delay to ensure container is visible
        setTimeout(() => {
            try {
                // Create map
                locationPickerMap = L.map('location-map').setView([28.6139, 77.2090], 13); // Default to Delhi
                
                // Add tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(locationPickerMap);
                
                // Force a resize after map creation
                locationPickerMap.invalidateSize(true);
                
                // Try to get user's current location
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            locationPickerMap.setView([lat, lng], 15);
                            
                            // Add marker
                            if (locationMarker) {
                                locationMarker.setLatLng([lat, lng]);
                            } else {
                                locationMarker = L.marker([lat, lng], {
                                    draggable: true
                                }).addTo(locationPickerMap);
                                
                                // Update location info when marker is dragged
                                locationMarker.on('dragend', function(e) {
                                    updateSelectedLocation(e.target.getLatLng());
                                });
                            }
                            
                            // Get location name
                            updateSelectedLocation({lat, lng});
                        },
                        (error) => {
                            console.error('Error getting location:', error);
                            showToast('Error getting your current location. Using default location.', 'error');
                        },
                        { 
                            enableHighAccuracy: true,
                            timeout: 5000, // Shorter timeout (5 seconds)
                            maximumAge: 0
                        }
                    );
                }
                
                // Update location when map is clicked
                locationPickerMap.on('click', function(e) {
                    if (locationMarker) {
                        locationMarker.setLatLng(e.latlng);
                    } else {
                        locationMarker = L.marker(e.latlng, {
                            draggable: true
                        }).addTo(locationPickerMap);
                        
                        // Update location info when marker is dragged
                        locationMarker.on('dragend', function(e) {
                            updateSelectedLocation(e.target.getLatLng());
                        });
                    }
                    
                    updateSelectedLocation(e.latlng);
                });
                
                // Force another resize after a delay to ensure the map displays correctly
                setTimeout(() => {
                    locationPickerMap.invalidateSize(true);
                }, 500);
                
            } catch (error) {
                console.error('Error initializing map:', error);
                showToast('Error initializing map. Please try again.', 'error');
            }
        }, 100);
    }
    
    // Update selected location display
    function updateSelectedLocation(latlng) {
        selectedLocation = latlng;
        const selectedLocationText = document.getElementById('selected-location-text');
        selectedLocationText.textContent = "Getting location name...";
        
        // Reverse geocode to get address
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`)
            .then(response => response.json())
            .then(data => {
                if (data.display_name) {
                    const parts = data.display_name.split(', ');
                    // Take first 3 parts for a shorter display
                    const shortAddress = parts.slice(0, 3).join(', ');
                    selectedLocationText.textContent = shortAddress;
                    selectedLocation.display_name = data.display_name;
                    selectedLocation.short_name = shortAddress;
                    
                    // Extract area and city
                    if (data.address) {
                        selectedLocation.area = data.address.suburb || 
                                               data.address.neighbourhood || 
                                               data.address.district || 
                                               data.address.city_district || '';
                        selectedLocation.city = data.address.city || 
                                               data.address.town || 
                                               data.address.village || '';
                        selectedLocation.postcode = data.address.postcode || '';
                    }
                } else {
                    selectedLocationText.textContent = `Location at ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
                }
            })
            .catch(error => {
                console.error('Error with reverse geocoding:', error);
                selectedLocationText.textContent = `Location at ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
            });
    }
    
    // Save location button
    saveLocationBtn.addEventListener('click', () => {
        if (!selectedLocation) {
            showToast('Please select a location on the map first', 'error');
            return;
        }
        
        // Save location to localStorage
        saveLocation(selectedLocation);
        showToast('Location saved successfully', 'success');
        
        // Switch to saved locations tab
        setActiveTab(savedLocationTab, savedLocationContent);
        loadSavedLocations();
    });
    
    // Use selected location without saving
    useSelectedLocationBtn.addEventListener('click', () => {
        if (!selectedLocation) {
            showToast('Please select a location on the map first', 'error');
            return;
        }
        
        setUserLocation(selectedLocation);
        locationMenu.classList.remove('active');
        locationDisplay.classList.remove('active');
    });
    
    // Real-time search suggestions
    locationSearchInput.addEventListener('input', debounce(handleSearchInput, 150));
    locationSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchLocation();
        }
    });
    
    locationSearchBtn.addEventListener('click', searchLocation);
    
    // Create suggestions container
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'location-suggestions';
    locationSearchInput.parentNode.appendChild(suggestionsContainer);
    
    // Handle input for real-time search suggestions
    function handleSearchInput() {
        const query = locationSearchInput.value.trim();
        if (query.length < 2) {
            suggestionsContainer.classList.remove('active');
            return;
        }
        
        // Show loading in suggestions immediately
        suggestionsContainer.innerHTML = '<div class="suggestion-item">Searching...</div>';
        suggestionsContainer.classList.add('active');
        
        // Search for locations using Nominatim
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    suggestionsContainer.innerHTML = '';
                    data.forEach(location => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'suggestion-item';
                        suggestionItem.textContent = location.display_name;
                        
                        // Use this suggestion when clicked
                        suggestionItem.addEventListener('click', () => {
                            locationSearchInput.value = location.display_name;
                            suggestionsContainer.classList.remove('active');
                            
                            // Update map
                            const lat = parseFloat(location.lat);
                            const lng = parseFloat(location.lon);
                            
                            if (locationPickerMap) {
                                locationPickerMap.setView([lat, lng], 15);
                                
                                // Update marker
                                if (locationMarker) {
                                    locationMarker.setLatLng([lat, lng]);
                                } else {
                                    locationMarker = L.marker([lat, lng], {
                                        draggable: true
                                    }).addTo(locationPickerMap);
                                    
                                    locationMarker.on('dragend', function(e) {
                                        updateSelectedLocation(e.target.getLatLng());
                                    });
                                }
                                
                                // Update selected location
                                updateSelectedLocation({lat, lng});
                            }
                        });
                        
                        suggestionsContainer.appendChild(suggestionItem);
                    });
                } else {
                    suggestionsContainer.innerHTML = '<div class="suggestion-item">No results found</div>';
                }
            })
            .catch(error => {
                console.error('Error searching for locations:', error);
                suggestionsContainer.innerHTML = '<div class="suggestion-item">Error searching</div>';
            });
    }
    
    // Search for location when search button is clicked
    function searchLocation() {
        const query = locationSearchInput.value.trim();
        if (!query) return;
        
        const selectedLocationText = document.getElementById('selected-location-text');
        selectedLocationText.textContent = "Searching...";
        
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const location = data[0];
                    const lat = parseFloat(location.lat);
                    const lng = parseFloat(location.lon);
                    
                    // Update map view
                    locationPickerMap.setView([lat, lng], 15);
                    
                    // Update or add marker
                    if (locationMarker) {
                        locationMarker.setLatLng([lat, lng]);
                    } else {
                        locationMarker = L.marker([lat, lng], {
                            draggable: true
                        }).addTo(locationPickerMap);
                        
                        // Update location info when marker is dragged
                        locationMarker.on('dragend', function(e) {
                            updateSelectedLocation(e.target.getLatLng());
                        });
                    }
                    
                    // Update selected location
                    updateSelectedLocation({lat, lng});
                } else {
                    selectedLocationText.textContent = "No results found";
                    showToast('No locations found for your search', 'error');
                }
            })
            .catch(error => {
                console.error('Error searching for location:', error);
                selectedLocationText.textContent = "Error searching";
                showToast('Error searching for location', 'error');
            });
    }
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!suggestionsContainer.contains(e.target) && e.target !== locationSearchInput) {
            suggestionsContainer.classList.remove('active');
        }
    });
    
    // Debounce function to limit API calls
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    // Load saved locations with remove buttons
    function loadSavedLocations() {
        const savedLocationsContainer = document.getElementById('saved-locations-list');
        const savedLocations = getSavedLocations();
        
        if (savedLocations.length === 0) {
            savedLocationsContainer.innerHTML = `
                <div class="location-empty">
                    <i class="fa-solid fa-map-marker-slash"></i>
                    <p>No saved locations yet</p>
                </div>
            `;
            return;
        }
        
        savedLocationsContainer.innerHTML = '';
        savedLocations.forEach((location, index) => {
            const locationItem = document.createElement('div');
            locationItem.className = 'location-item';
            locationItem.innerHTML = `
                <i class="fa-solid fa-location-dot"></i>
                <div class="location-info">
                    <h4>${location.area || location.short_name || 'Saved Location'}</h4>
                    <p>${location.display_name || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}</p>
                </div>
                <button class="remove-location-btn" title="Remove this location">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            
            // Use this location when clicked
            locationItem.addEventListener('click', (e) => {
                // Don't trigger if clicking the remove button
                if (e.target.closest('.remove-location-btn')) return;
                
                setUserLocation(location);
                locationMenu.classList.remove('active');
                locationDisplay.classList.remove('active');
            });
            
            // Remove location button
            const removeBtn = locationItem.querySelector('.remove-location-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the parent click
                removeLocation(index);
                loadSavedLocations(); // Refresh the list
                showToast('Location removed', 'success');
            });
            
            savedLocationsContainer.appendChild(locationItem);
        });
    }
    
    // Save location to localStorage
    function saveLocation(location) {
        const savedLocations = getSavedLocations();
        
        // Add the new location
        savedLocations.push(location);
        
        // Save updated list
        localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
    }
    
    // Get saved locations from localStorage
    function getSavedLocations() {
        const savedLocationsJson = localStorage.getItem('savedLocations');
        if (!savedLocationsJson) return [];
        
        try {
            return JSON.parse(savedLocationsJson);
        } catch (error) {
            console.error('Error parsing saved locations:', error);
            return [];
        }
    }
    
    // Remove a saved location
    function removeLocation(index) {
        const savedLocations = getSavedLocations();
        if (index >= 0 && index < savedLocations.length) {
            savedLocations.splice(index, 1);
            localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
        }
    }
    
    // Use current device location
    function useCurrentDeviceLocation() {
        if ('geolocation' in navigator) {
            const currentLocArea = document.getElementById('current-loc-area');
            const currentLocAddress = document.getElementById('current-loc-address');
            
            currentLocArea.textContent = "Getting your location...";
            currentLocAddress.textContent = "Please wait";
            
            // Show loading in the button
            const useCurrentLocationBtn = document.getElementById('use-current-location');
            useCurrentLocationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Detecting location...';
            useCurrentLocationBtn.disabled = true;
            
            // Immediately start location detection - no waiting
            console.log("Starting geolocation detection...");
            
            // Set a timeout to handle very slow location fetching
            const locationTimeout = setTimeout(() => {
                currentLocArea.textContent = "Location detection timed out";
                currentLocAddress.textContent = "Try again or use the map to select location";
                useCurrentLocationBtn.innerHTML = '<i class="fa-solid fa-location-arrow"></i> Try Again';
                useCurrentLocationBtn.disabled = false;
                showToast('Location detection timed out', 'error');
            }, 10000); // 10 second timeout
            
            // Check for cached location first (only use very recent caches - last 2 min)
            const cachedLocation = localStorage.getItem('currentDetectedLocation');
            let cachedLocationObj = null;
            
            try {
                if (cachedLocation) {
                    cachedLocationObj = JSON.parse(cachedLocation);
                    // Only use cache if it's less than 2 minutes old (reduced from 5)
                    const cacheTime = new Date(cachedLocationObj.timestamp || 0);
                    const now = new Date();
                    const cacheAge = (now.getTime() - cacheTime.getTime()) / 1000 / 60; // in minutes
                    
                    if (cacheAge < 2) {
                        // Use cached location
                        clearTimeout(locationTimeout);
                        
                        currentLocArea.textContent = cachedLocationObj.area || "Location found";
                        currentLocAddress.textContent = cachedLocationObj.display_name || `${cachedLocationObj.lat.toFixed(6)}, ${cachedLocationObj.lng.toFixed(6)}`;
                        
                        useCurrentLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Use This Location';
                        useCurrentLocationBtn.disabled = false;
                        
                        window.currentDetectedLocation = cachedLocationObj;
                        return;
                    }
                }
            } catch (e) {
                console.error("Error parsing cached location:", e);
                // Continue with geolocation
            }
            
            // Call geolocation API with shorter timeout
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Clear the timeout since we got a result
                    clearTimeout(locationTimeout);
                    
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Immediately update some UI while we fetch the address
                    currentLocArea.textContent = "Location found!";
                    currentLocAddress.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    
                    // Update button state
                    useCurrentLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Use This Location';
                    useCurrentLocationBtn.disabled = false;
                    
                    // Set basic location immediately
                    const basicLocation = {
                        lat, 
                        lng,
                        display_name: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Cache this basic location immediately
                    localStorage.setItem('currentDetectedLocation', JSON.stringify(basicLocation));
                    window.currentDetectedLocation = basicLocation;
                    
                    // Reverse geocode to get address
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.display_name) {
                                const parts = data.display_name.split(', ');
                                // Take first 3 parts for a shorter display
                                const shortAddress = parts.slice(0, 3).join(', ');
                                
                                // Extract area and city
                                let area = '';
                                let city = '';
                                let postcode = '';
                                
                                if (data.address) {
                                    area = data.address.suburb || 
                                          data.address.neighbourhood || 
                                          data.address.district || 
                                          data.address.city_district || '';
                                    city = data.address.city || 
                                          data.address.town || 
                                          data.address.village || '';
                                    postcode = data.address.postcode || '';
                                }
                                
                                currentLocArea.textContent = area || city || shortAddress;
                                currentLocAddress.textContent = data.display_name;
                                
                                // Set user location with full address info
                                const locationObj = {
                                    lat, 
                                    lng, 
                                    display_name: data.display_name,
                                    short_name: shortAddress,
                                    area,
                                    city,
                                    postcode,
                                    timestamp: new Date().toISOString()
                                };
                                
                                // Cache the enhanced location data
                                localStorage.setItem('currentDetectedLocation', JSON.stringify(locationObj));
                                
                                // Store the current location for use when the button is clicked
                                window.currentDetectedLocation = locationObj;
                            }
                        })
                        .catch(error => {
                            console.error('Error with reverse geocoding:', error);
                            // We already have the basic location set
                        });
                },
                (error) => {
                    // Clear the timeout since we got an error
                    clearTimeout(locationTimeout);
                    
                    console.error('Error getting location:', error);
                    currentLocArea.textContent = "Location error";
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            currentLocAddress.textContent = "Location access denied";
                            showToast("Please enable location access in your browser settings", "error");
                            break;
                        case error.POSITION_UNAVAILABLE:
                            currentLocAddress.textContent = "Location unavailable";
                            break;
                        case error.TIMEOUT:
                            currentLocAddress.textContent = "Location request timed out";
                            break;
                        default:
                            currentLocAddress.textContent = "Unable to detect location";
                    }
                    
                    // Reset button
                    useCurrentLocationBtn.innerHTML = '<i class="fa-solid fa-location-arrow"></i> Try Again';
                    useCurrentLocationBtn.disabled = false;
                },
                { 
                    enableHighAccuracy: true,
                    timeout: 6000, // Further reduced from 8 second to 6 second timeout
                    maximumAge: 0
                }
            );
        } else {
            showToast('Geolocation is not supported by your browser', 'error');
        }
    }
    
    // Update the event listener for the current location button
    useCurrentLocationBtn.addEventListener('click', () => {
        // If we already have a detected location, use it directly
        if (window.currentDetectedLocation) {
            setUserLocation(window.currentDetectedLocation);
            locationMenu.classList.remove('active');
            locationDisplay.classList.remove('active');
            // Clear the stored location after using it
            window.currentDetectedLocation = null;
        } else {
            // Otherwise detect location again
            useCurrentDeviceLocation();
        }
    });
    
    // Set user location in UI and storage
    function setUserLocation(location) {
        // Update UI
        const userLocationElement = document.getElementById('user-location');
        const locationDisplay = document.getElementById('location-display');
        
        // Save to localStorage
        localStorage.setItem('userLocation', JSON.stringify(location));
        
        // Update display
        if (location.area) {
            userLocationElement.textContent = `${location.area}${location.postcode ? ', ' + location.postcode : ''}`;
        } else if (location.short_name) {
            userLocationElement.textContent = location.short_name;
        } else {
            userLocationElement.textContent = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
        }
        
        // Add animation
        locationDisplay.classList.add('updated');
        setTimeout(() => {
            locationDisplay.classList.remove('updated');
        }, 1000);
        
        // Refresh nearby stores based on new location
        loadNearbyStores();
    }
}

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
                
                // Store location for use by nearby stores
                const parts = data.display_name.split(', ');
                const shortAddress = parts.slice(0, 3).join(', ');
                const locationData = {
                    lat,
                    lng: lon,
                    display_name: data.display_name,
                    short_name: shortAddress,
                    area,
                    postcode: pincode,
                    city: data.address.city || data.address.town || data.address.village || '',
                    timestamp: new Date().toISOString()
                };
                
                // Store in localStorage for other functions to use
                localStorage.setItem('userLocation', JSON.stringify(locationData));
                
                // Load nearby stores with this location
                loadNearbyStores();
                
                // Add animation class
                locationDisplay.classList.add('updated');
                
                // Remove the class after animation completes
                setTimeout(() => {
                    locationDisplay.classList.remove('updated');
                }, 1000);
            } else {
                userLocation.textContent = 'Location found';
                
                // Still store basic location and load stores
                const locationData = {
                    lat,
                    lng: lon,
                    display_name: `Location at ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
                    timestamp: new Date().toISOString()
                };
                
                localStorage.setItem('userLocation', JSON.stringify(locationData));
                loadNearbyStores();
            }
            
            // Show the location display
            locationDisplay.style.display = 'flex';
        })
        .catch(error => {
            console.error('Error with reverse geocoding:', error);
            document.getElementById('user-location').textContent = 'Location found';
            
            // Even with error, still store basic location and load stores
            const locationData = {
                lat,
                lng: lon,
                display_name: `Location at ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('userLocation', JSON.stringify(locationData));
            loadNearbyStores();
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
    // Loader.js has been removed, so we'll implement a simpler version
    console.log('Loading started');
    // You can implement a simple loading indicator here if needed
}

// Hide loading overlay
function hideLoading() {
    // Loader.js has been removed, so we'll implement a simpler version
    console.log('Loading complete');
    // You can implement a simple loading indicator here if needed
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
    try {
        // First check if we have a user-selected location
        const userLocation = localStorage.getItem('userLocation');
        if (userLocation) {
            return JSON.parse(userLocation);
        }
        
        // If no selected location, use the detected location
        const detectedLocation = localStorage.getItem('currentDetectedLocation');
        if (detectedLocation) {
            return JSON.parse(detectedLocation);
        }
        
        // If no stored location, return null
        return null;
    } catch (e) {
        console.error('Error getting user location:', e);
        return null;
    }
}