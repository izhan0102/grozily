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
const userDetailsForm = document.getElementById('user-details-form');
const fullName = document.getElementById('full-name');
const phoneNumber = document.getElementById('phone-number');
const houseNumber = document.getElementById('house-number');
const area = document.getElementById('area');
const landmark = document.getElementById('landmark');
const address = document.getElementById('address');
const pinCode = document.getElementById('pin-code');
const saveDetailsBtn = document.getElementById('save-details-btn');

// Toast Message
const toastMessage = document.getElementById('toast-message');
const toastText = document.querySelector('.toast-text');
const toastIcon = document.querySelector('.toast-icon');

// Check if user is authenticated
auth.onAuthStateChanged(user => {
    if (!user) {
        // No user is signed in, redirect to login page
        window.location.href = 'login.html';
    } else {
        // Pre-fill name if available
        if (user.displayName) {
            fullName.value = user.displayName;
        }
        
        // Pre-fill phone if available (remove +91 prefix if present)
        if (user.phoneNumber) {
            const phone = user.phoneNumber.replace('+91', '');
            phoneNumber.value = phone;
        }
        
        // Check if user already has details saved
        database.ref('users/' + user.uid + '/details').once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    
                    // Pre-fill the form with existing data
                    if (userData.fullName) fullName.value = userData.fullName;
                    if (userData.phoneNumber) phoneNumber.value = userData.phoneNumber;
                    if (userData.houseNumber) houseNumber.value = userData.houseNumber;
                    if (userData.area) area.value = userData.area;
                    if (userData.landmark) landmark.value = userData.landmark;
                    if (userData.address) address.value = userData.address;
                    if (userData.pinCode) pinCode.value = userData.pinCode;
                }
            })
            .catch(error => {
                console.error("Error fetching user data:", error);
            });
    }
});

// Save user details
userDetailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!fullName.value || !phoneNumber.value || !houseNumber.value || 
        !area.value || !address.value || !pinCode.value) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    if (phoneNumber.value.length !== 10 || isNaN(phoneNumber.value)) {
        showToast('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (pinCode.value.length !== 6 || isNaN(pinCode.value)) {
        showToast('Please enter a valid 6-digit PIN code', 'error');
        return;
    }
    
    try {
        setButtonLoading(saveDetailsBtn, true);
        
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        // Save user details to Firebase
        const userDetails = {
            fullName: fullName.value.trim(),
            phoneNumber: phoneNumber.value.trim(),
            houseNumber: houseNumber.value.trim(),
            area: area.value.trim(),
            landmark: landmark.value.trim(),
            address: address.value.trim(),
            pinCode: pinCode.value.trim(),
            updatedAt: new Date().toISOString()
        };
        
        // Update user profile displayName if needed
        if (user.displayName !== fullName.value.trim()) {
            await user.updateProfile({
                displayName: fullName.value.trim()
            });
        }
        
        // Save to Firebase database
        await database.ref('users/' + user.uid + '/details').update(userDetails);
        
        showToast('Profile saved successfully!', 'success');
        
        // Redirect to index page after successful save
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error saving user details:', error);
        showToast(error.message || 'Failed to save details. Please try again.', 'error');
    } finally {
        setButtonLoading(saveDetailsBtn, false);
    }
});

// Helper Functions
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function showToast(message, type = 'success') {
    toastText.textContent = message;
    
    if (type === 'error') {
        toastIcon.classList.remove('fa-check-circle', 'success');
        toastIcon.classList.add('fa-times-circle', 'error');
    } else {
        toastIcon.classList.remove('fa-times-circle', 'error');
        toastIcon.classList.add('fa-check-circle', 'success');
    }
    
    toastMessage.classList.add('show');
    
    setTimeout(() => {
        toastMessage.classList.remove('show');
    }, 3000);
}

// Add animation effects to inputs
const allInputs = document.querySelectorAll('.input-group input');
allInputs.forEach(input => {
    input.addEventListener('focus', () => {
        const icon = input.parentElement.querySelector('.input-icon');
        if (icon) {
            icon.style.color = 'var(--primary-color)';
        }
    });
    
    input.addEventListener('blur', () => {
        const icon = input.parentElement.querySelector('.input-icon');
        if (icon) {
            icon.style.color = 'var(--text-secondary)';
        }
    });
}); 