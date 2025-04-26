document.addEventListener('DOMContentLoaded', function() {
    // Global loading functionality
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Show loading overlay function (can be called from anywhere)
    window.showLoading = function() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent scrolling while loading
        }
    };
    
    // Hide loading overlay function (can be called from anywhere)
    window.hideLoading = function() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            document.body.style.overflow = ''; // Allow scrolling again
        }
    };
    
    // Simulate initial page load
    setTimeout(function() {
        hideLoading();
    }, 2000);
    
    // Remove browser 300ms tap delay
    FastClick.attach(document.body);
    
    // Let's Go button handling
    const letsGoBtn = document.getElementById('lets-go-btn');
    
    if (letsGoBtn) {
        letsGoBtn.addEventListener('click', function(event) {
            // Add ripple effect
            addRippleEffect(this, event);
            
            // Navigate to login page
            showLoading();
            
            // Simulate loading delay (in a real app, this would be actual page navigation)
            setTimeout(function() {
                window.location.href = 'login.html';
            }, 800);
        });
    }
    
    // Feature cards interaction
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('click', function(event) {
            addRippleEffect(this, event);
            
            // Simulate navigation when clicking on a feature card
            showLoading();
            
            // Simulate loading delay
            setTimeout(function() {
                hideLoading();
                console.log('Feature card navigation complete');
            }, 1500);
        });
    });

    // Handle cart animation interaction
    const cartAnimation = document.querySelector('.cart-animation');
    const mainCart = document.querySelector('.main-cart');
    
    if (cartAnimation) {
        // Set animation playstate based on visibility
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const groceryItems = document.querySelectorAll('.grocery-items i');
                if (entry.isIntersecting) {
                    groceryItems.forEach(item => {
                        item.style.animationPlayState = 'running';
                    });
                } else {
                    groceryItems.forEach(item => {
                        item.style.animationPlayState = 'paused';
                    });
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(cartAnimation);
        
        // Add click interaction
        cartAnimation.addEventListener('click', function() {
            // Add quick pulse effect to cart
            mainCart.style.animation = 'none';
            mainCart.offsetHeight; // Trigger reflow
            mainCart.style.animation = 'pulse 0.5s ease-in-out 2';
            
            setTimeout(() => {
                mainCart.style.animation = 'pulse 2s ease-in-out infinite';
            }, 1000);
            
            // Speed up grocery items temporarily
            const groceryItems = document.querySelectorAll('.grocery-items i');
            groceryItems.forEach(item => {
                const currentDelay = parseFloat(getComputedStyle(item).animationDelay);
                item.style.animationDuration = '2s';
                
                setTimeout(() => {
                    item.style.animationDuration = '4s';
                }, 3000);
            });
        });
    }

    // Global navigation event listeners
    // This allows us to handle all internal navigation
    document.addEventListener('click', function(e) {
        // Check if the clicked element is a link
        if (e.target.tagName === 'A' && e.target.getAttribute('href')?.indexOf('#') !== 0) {
            const href = e.target.getAttribute('href');
            
            // Only handle internal links (not external or anchor links)
            if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#')) {
                e.preventDefault();
                
                // Show loading before navigation
                showLoading();
                
                // Simulate navigation delay
                setTimeout(function() {
                    window.location.href = href;
                }, 800);
            }
        }
    });

    // Handle back/forward browser buttons
    window.addEventListener('popstate', function(e) {
        showLoading();
        
        // Hide loading after a short delay
        setTimeout(function() {
            hideLoading();
        }, 800);
    });

    // Add ripple effect function
    function addRippleEffect(element, event) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple-effect');
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Check if user is already logged in via Firebase (if Firebase is included)
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                console.log('User is signed in:', user.displayName || user.phoneNumber || user.email);
                // Update UI for logged in user if needed
            } else {
                console.log('No user is signed in');
                // Update UI for non-logged in user if needed
            }
        });
    }

    // Prevent default behavior for touch interactions to avoid delays
    document.addEventListener('touchstart', function() {}, {passive: true});
});

// Simple FastClick implementation
(function() {
    window.FastClick = {
        attach: function(body) {
            let touching = false;
            
            body.addEventListener('touchstart', function() {
                touching = true;
            }, {passive: true});
            
            body.addEventListener('touchend', function(e) {
                if (touching) {
                    touching = false;
                    
                    // Convert touch to click
                    const touch = e.changedTouches[0];
                    const event = document.createEvent('MouseEvents');
                    
                    event.initMouseEvent('click', true, true, window, 1, 
                                         touch.screenX, touch.screenY, 
                                         touch.clientX, touch.clientY, 
                                         false, false, false, false, 0, null);
                    
                    touch.target.dispatchEvent(event);
                    e.preventDefault();
                }
            });
        }
    };
})();