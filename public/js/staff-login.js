document.addEventListener('DOMContentLoaded', function() {
    console.clear(); // Clear any previous logs
    console.log('=== STAFF LOGIN INITIALIZATION ===');
    
    // Check if user is already logged in from sessionStorage
    const isLoggedIn = sessionStorage.getItem('staffLoggedIn') === 'true';
    const staffToken = localStorage.getItem('staffToken');
    
    console.log('Session check:');
    console.log('- sessionStorage login status:', isLoggedIn);
    console.log('- localStorage token exists:', !!staffToken);
    
    // If already logged in, redirect to dashboard
    if (isLoggedIn && staffToken) {
        console.log('Already logged in, redirecting to dashboard');
        window.location.href = '/staff-dashboard.html';
        return;
    }
    
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    // Clear previous login data if present but failed
    localStorage.removeItem('staffToken');
    sessionStorage.removeItem('staffLoggedIn');
    sessionStorage.removeItem('staffName');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Validate input
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }
        
        // Hide any previous error messages
        loginError.style.display = 'none';
        
        // Show loading state
        const loginButton = document.querySelector('.login-button');
        const originalButtonText = loginButton.textContent;
        loginButton.textContent = 'Logging in...';
        loginButton.disabled = true;
        
        try {
            console.log('Sending login request for:', username);
            
            // Send login request to API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            console.log('Login response status:', response.status);
            const data = await response.json();
            console.log('Login response data:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            if (!data.token) {
                throw new Error('No token received from server');
            }
            
            console.log('Login successful, token received');
            
            // Store JWT token in localStorage - will be used for API requests
            localStorage.setItem('staffToken', data.token);
            console.log('Token stored in localStorage');
            
            // Store login status in sessionStorage - backup authentication
            sessionStorage.setItem('staffLoggedIn', 'true');
            console.log('Login status stored in sessionStorage');
            
            // Store staff name in sessionStorage if available
            try {
                if (data.user && data.user.username) {
                    sessionStorage.setItem('staffName', data.user.username);
                    console.log('Staff name stored in sessionStorage:', data.user.username);
                } else {
                    const payload = JSON.parse(atob(data.token.split('.')[1]));
                    if (payload.username) {
                        sessionStorage.setItem('staffName', payload.username);
                        console.log('Staff name extracted from token:', payload.username);
                    }
                }
            } catch (e) {
                console.error('Error storing staff name:', e);
            }
            
            console.log('Redirecting to dashboard...');
            
            // Redirect to dashboard
            window.location.href = '/staff-dashboard.html';
        } catch (error) {
            console.error('Login error:', error);
            
            // Show error message
            showError(error.message || 'Invalid username or password. Please try again.');
            
            // Reset login button
            loginButton.textContent = originalButtonText;
            loginButton.disabled = false;
        }
    });
    
    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }
}); 