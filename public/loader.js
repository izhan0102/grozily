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
                    <div class="loader-container">
                        <div class="shopping-basket">
                            <div class="basket-top"></div>
                            <div class="basket-body">
                                <div class="item-container">
                                    <div class="grocery-item item-1"></div>
                                    <div class="grocery-item item-2"></div>
                                    <div class="grocery-item item-3"></div>
                                    <div class="grocery-item item-4"></div>
                                </div>
                            </div>
                        </div>
                        <div class="loader-ring">
                            <div class="loader-ring-light"></div>
                            <div class="loader-ring-track"></div>
                        </div>
                    </div>
                    <p class="loading-text">Loading<span class="dot-1">.</span><span class="dot-2">.</span><span class="dot-3">.</span></p>
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
                background-color: rgba(255, 255, 255, 0.92);
                backdrop-filter: blur(3px);
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
            
            .loader-container {
                position: relative;
                width: 120px;
                height: 120px;
                margin-bottom: 20px;
            }
            
            .shopping-basket {
                position: absolute;
                width: 60px;
                height: 60px;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2;
            }
            
            .basket-top {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 15px;
                background: #6c5ce7;
                border-radius: 8px 8px 0 0;
                box-shadow: 0 2px 5px rgba(108, 92, 231, 0.2);
            }
            
            .basket-body {
                position: absolute;
                top: 14px;
                left: 5px;
                right: 5px;
                bottom: 0;
                background: linear-gradient(135deg, #8e78ff 0%, #6c5ce7 100%);
                border-radius: 0 0 10px 10px;
                box-shadow: 0 4px 10px rgba(108, 92, 231, 0.3);
                overflow: hidden;
            }
            
            .item-container {
                position: relative;
                width: 100%;
                height: 100%;
            }
            
            .grocery-item {
                position: absolute;
                border-radius: 50%;
                opacity: 0;
                transform-origin: center;
            }
            
            .item-1 {
                width: 12px;
                height: 12px;
                background: #FFC107;
                top: 5px;
                left: 25%;
                animation: bobItem 2s infinite 0.1s, fadeItem 2s infinite 0.1s;
            }
            
            .item-2 {
                width: 10px;
                height: 10px;
                background: #4CAF50;
                top: 8px;
                left: 50%;
                animation: bobItem 2s infinite 0.3s, fadeItem 2s infinite 0.3s;
            }
            
            .item-3 {
                width: 14px;
                height: 14px;
                background: #F44336;
                top: 6px;
                left: 70%;
                animation: bobItem 2s infinite 0.5s, fadeItem 2s infinite 0.5s;
            }
            
            .item-4 {
                width: 10px;
                height: 10px;
                background: #2196F3;
                top: 10px;
                left: 40%;
                animation: bobItem 2s infinite 0.7s, fadeItem 2s infinite 0.7s;
            }
            
            @keyframes bobItem {
                0%, 100% {
                    transform: translateY(15px) scale(0.8);
                }
                50% {
                    transform: translateY(-5px) scale(1);
                }
            }
            
            @keyframes fadeItem {
                0%, 100% {
                    opacity: 0.4;
                }
                50% {
                    opacity: 1;
                }
            }
            
            .loader-ring {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                animation: spinRing 1.5s linear infinite;
            }
            
            .loader-ring-light {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                box-shadow: 0 4px 0 0 #6c5ce7;
                animation: pulseRing 1.5s ease-out infinite;
            }
            
            .loader-ring-track {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 2px solid rgba(108, 92, 231, 0.2);
            }
            
            @keyframes spinRing {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
            }
            
            @keyframes pulseRing {
                0% {
                    opacity: 0.8;
                    transform: scale(0.95);
                }
                50% {
                    opacity: 1;
                    transform: scale(1);
                }
                100% {
                    opacity: 0.8;
                    transform: scale(0.95);
                }
            }
            
            .loading-text {
                color: #4A5568;
                font-weight: 500;
                font-size: 18px;
                margin: 0;
                letter-spacing: 0.5px;
            }
            
            .loading-text span {
                display: inline-block;
            }
            
            .dot-1 {
                animation: dotFade 1.5s infinite 0.2s;
            }
            
            .dot-2 {
                animation: dotFade 1.5s infinite 0.4s;
            }
            
            .dot-3 {
                animation: dotFade 1.5s infinite 0.6s;
            }
            
            @keyframes dotFade {
                0%, 100% {
                    opacity: 0.2;
                    transform: translateY(0);
                }
                50% {
                    opacity: 1;
                    transform: translateY(-2px);
                }
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