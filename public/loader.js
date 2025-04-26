/**
 * Grozily Global Loader
 * This file handles the loading overlay across all pages
 */

// Initialize the loading system
(function() {
    // Create loading overlay if it doesn't exist
    if (!document.getElementById('loading-overlay')) {
        const loadingHTML = `
            <div id="loading-overlay" class="loading-overlay">
                <div class="loading-content">
                    <div class="cart-icon">
                        <i class="fa-solid fa-shopping-cart"></i>
                        <div class="cart-items">
                            <div class="item item-1"></div>
                            <div class="item item-2"></div>
                            <div class="item item-3"></div>
                        </div>
                    </div>
                    <p class="loading-text">Loading...</p>
                </div>
            </div>
        `;
        
        // Insert at the beginning of the body
        document.body.insertAdjacentHTML('afterbegin', loadingHTML);
        
        // Add CSS to head for loader and to remove tap highlight
        const style = document.createElement('style');
        style.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 255, 255, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                transition: opacity 0.3s ease-out;
            }
            
            .loading-overlay.hidden {
                opacity: 0;
                pointer-events: none;
            }
            
            .loading-content {
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            .cart-icon {
                position: relative;
                font-size: 42px;
                color: #805AD5;
                margin-bottom: 15px;
                animation: pulse 1.5s infinite ease-in-out;
            }
            
            @keyframes pulse {
                0% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.1);
                }
                100% {
                    transform: scale(1);
                }
            }
            
            .cart-items {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            
            .item {
                position: absolute;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: #805AD5;
                opacity: 0;
            }
            
            .item-1 {
                top: 10px;
                left: 50%;
                animation: drop 2s infinite 0s;
            }
            
            .item-2 {
                top: 5px;
                left: 40%;
                animation: drop 2s infinite 0.5s;
            }
            
            .item-3 {
                top: 0;
                left: 60%;
                animation: drop 2s infinite 1s;
            }
            
            @keyframes drop {
                0% {
                    transform: translateY(-20px);
                    opacity: 0;
                }
                50% {
                    opacity: 1;
                }
                100% {
                    transform: translateY(20px);
                    opacity: 0;
                }
            }
            
            .loading-text {
                color: #4A5568;
                font-size: 16px;
                margin: 0;
            }
            
            /* Remove tap highlight */
            * {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
            }
        `;
        document.head.appendChild(style);
    }
    
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Global functions to show/hide loading
    window.showLoading = function() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent scrolling while loading
        }
    };
    
    window.hideLoading = function() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            document.body.style.overflow = ''; // Allow scrolling again
        }
    };
    
    // Initialize loading state - start by showing the loading overlay
    // Will be hidden after page fully loads
    showLoading();
    
    // Hide loading when page is fully loaded
    window.addEventListener('load', function() {
        setTimeout(function() {
            hideLoading();
        }, 800); // Short delay to ensure everything is rendered
    });
    
    // Handle all link clicks for internal navigation
    document.addEventListener('click', function(e) {
        // Check if the clicked element or its parent is a link
        let targetElement = e.target;
        let linkFound = false;
        
        // Check up to 3 levels up for a link
        for (let i = 0; i < 3; i++) {
            if (targetElement.tagName === 'A') {
                linkFound = true;
                break;
            }
            if (targetElement.parentElement) {
                targetElement = targetElement.parentElement;
            } else {
                break;
            }
        }
        
        if (linkFound) {
            const href = targetElement.getAttribute('href');
            
            // Only handle internal links (not external, anchor, or javascript links)
            if (href && 
                !href.startsWith('http') && 
                !href.startsWith('//') && 
                !href.startsWith('#') && 
                !href.startsWith('javascript:')) {
                
                e.preventDefault();
                
                // Show loading before navigation
                showLoading();
                
                // Navigate after a short delay
                setTimeout(function() {
                    window.location.href = href;
                }, 300);
            }
        }
    });
    
    // Handle back/forward browser buttons
    window.addEventListener('popstate', function(e) {
        showLoading();
    });
    
    // Add custom state changes for dynamic content loading
    // This can be used for AJAX content changes
    window.navigateTo = function(url, pushState = true) {
        showLoading();
        
        // Fetch content (example)
        fetch(url)
            .then(response => response.text())
            .then(html => {
                // Update content and push state
                if (pushState) {
                    history.pushState({url: url}, '', url);
                }
                
                // Hide loading when done
                hideLoading();
            })
            .catch(error => {
                console.error('Navigation error:', error);
                hideLoading();
            });
    };
})(); 