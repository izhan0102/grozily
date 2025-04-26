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
const loginToggle = document.getElementById('login-toggle');
const signupToggle = document.getElementById('signup-toggle');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabSlider = document.querySelector('.tab-slider');

// Login Elements
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');

// Signup Elements
const signupName = document.getElementById('signup-name');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupConfirmPassword = document.getElementById('signup-confirm-password');
const signupBtn = document.getElementById('signup-btn');

// Toast Message
const toastMessage = document.getElementById('toast-message');
const toastText = document.querySelector('.toast-text');
const toastIcon = document.querySelector('.toast-icon');

// Toggle between login and signup forms
loginToggle.addEventListener('click', () => {
    loginToggle.classList.add('active');
    signupToggle.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    // Position slider
    tabSlider.style.transform = 'translateX(0)';
});

signupToggle.addEventListener('click', () => {
    signupToggle.classList.add('active');
    loginToggle.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    // Position slider
    tabSlider.style.transform = 'translateX(100%)';
});

// Login with Email and Password
loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    if (!password) {
        showToast('Please enter your password', 'error');
        return;
    }
    
    try {
        setButtonLoading(loginBtn, true);
        
        // Sign in with email and password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update last login time
        await database.ref('users/' + user.uid).update({
            lastLogin: new Date().toISOString()
        });
        
        showToast('Login successful!', 'success');
        
        // Redirect to index.html after successful login
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error during login:', error);
        
        let errorMessage = 'Failed to login. Please try again.';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address. Please sign up.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format. Please enter a valid email.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed login attempts. Please try again later.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
        
    } finally {
        setButtonLoading(loginBtn, false);
    }
});

// Sign up with Email and Password
signupBtn.addEventListener('click', async () => {
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    const confirmPassword = signupConfirmPassword.value.trim();
    
    if (!name) {
        showToast('Please enter your full name', 'error');
        return;
    }
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    if (!password) {
        showToast('Please enter a password', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        setButtonLoading(signupBtn, true);
        
        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: name
        });
        
        // Store basic user data in database
        await database.ref('users/' + user.uid).set({
            name: name,
            email: email,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        });
        
        showToast('Account created successfully!', 'success');
        
        // Redirect to user details page after successful signup
        setTimeout(() => {
            window.location.href = 'user-details.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error during signup:', error);
        
        let errorMessage = 'Failed to create account. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use. Please use a different email or try logging in.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format. Please enter a valid email.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please use a stronger password.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
        
    } finally {
        setButtonLoading(signupBtn, false);
    }
});

// Helper Functions
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        // Add a small delay before removing the loading state
        // to ensure the animation is visible even for fast operations
        setTimeout(() => {
            button.classList.remove('loading');
            button.disabled = false;
        }, 800);
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
        input.parentElement.querySelector('.input-icon').style.color = 'var(--primary-color)';
    });
    
    input.addEventListener('blur', () => {
        input.parentElement.querySelector('.input-icon').style.color = 'var(--text-secondary)';
    });
});

// Check if user is already logged in
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User is already signed in');
        // Uncomment to auto-redirect to index
        // window.location.href = 'index.html';
    }
});

// Add password visibility toggles
const passwordToggles = document.querySelectorAll('.password-toggle');
passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const input = toggle.parentElement.querySelector('input');
        if (input.type === 'password') {
            input.type = 'text';
            toggle.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            toggle.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
}); 