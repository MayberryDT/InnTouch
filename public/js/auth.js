/**
 * Inn Touch - Authentication Protection
 * Checks for valid JWT token and redirects to login page if not found
 * Should be included in all guest-only pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Function to check if user is logged in
    function checkAuthentication() {
        const token = sessionStorage.getItem('guestToken');
        
        // If no token exists, redirect to login page
        if (!token) {
            console.log('No authentication token found, redirecting to login');
            window.location.href = '/login.html';
            return false;
        }
        
        try {
            // Basic JWT structure validation (not full verification - that happens on the server)
            // Just check if it has the correct format (header.payload.signature)
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('Invalid token format');
                sessionStorage.removeItem('guestToken');
                window.location.href = '/login.html';
                return false;
            }
            
            // Check if token is expired by decoding the payload
            // Note: This is just a basic check - the server will do the full validation
            const payload = JSON.parse(atob(parts[1]));
            
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.error('Token expired');
                sessionStorage.removeItem('guestToken');
                window.location.href = '/login.html';
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            sessionStorage.removeItem('guestToken');
            window.location.href = '/login.html';
            return false;
        }
    }
    
    // Perform the check
    checkAuthentication();
    
    // Update guest information if available
    const guestNameElement = document.getElementById('guest-name');
    const roomNumberElement = document.getElementById('room-number');
    
    if (guestNameElement && sessionStorage.getItem('guestName')) {
        guestNameElement.textContent = sessionStorage.getItem('guestName');
    }
    
    if (roomNumberElement && sessionStorage.getItem('guestRoomNumber')) {
        roomNumberElement.textContent = sessionStorage.getItem('guestRoomNumber');
    }
}); 