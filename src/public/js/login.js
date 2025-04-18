/**
 * Inn Touch - Guest Login Handler
 * Handles the login form submission for guests
 */

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('login-error');
    
    if (!loginForm) {
        console.error('Login form not found');
        return;
    }
    
    // The critical line - preventing form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault(); // This stops the form from submitting normally
        handleLogin();
    });
    
    // Also attach a click handler to the submit button as a backup
    const submitButton = loginForm.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    async function handleLogin() {
        // Hide any previous error message
        errorMessage.style.display = 'none';
        
        // Get form data
        const roomNumber = document.getElementById('room-number').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        
        // Basic validation
        if (!roomNumber || !lastName) {
            errorMessage.textContent = 'Please enter both room number and last name.';
            errorMessage.style.display = 'block';
            return;
        }
        
        try {
            // Disable form while submitting
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';
            
            // Send login request
            const response = await fetch('/auth/guest/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomNumber: roomNumber,
                    lastName: lastName
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Login successful - store token in sessionStorage
                sessionStorage.setItem('guestToken', data.token);
                sessionStorage.setItem('guestName', data.guest.name);
                sessionStorage.setItem('guestRoomNumber', data.guest.roomNumber);
                
                console.log('Login successful, redirecting to home page...');
                
                // Redirect to home page
                window.location.href = '/index.html';
            } else {
                // Login failed - show error message
                errorMessage.textContent = data.error || 'Login failed. Please check your room number and last name, or contact the front desk.';
                errorMessage.style.display = 'block';
                
                // Enable form again
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'An error occurred. Please try again later or contact the front desk.';
            errorMessage.style.display = 'block';
            
            // Enable form again
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    }
}); 