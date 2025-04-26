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
        });
    });
    
    // Menu icon interaction
    const menuIcon = document.querySelector('.menu-icon');
    
    if (menuIcon) {
        menuIcon.addEventListener('click', function() {
            console.log('Menu clicked');
            // Future menu functionality would go here
        });
    }

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