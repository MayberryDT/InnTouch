# Step 71: Frontend Logout

## Task Description
Add a logout button/link in the main navigation and implement JavaScript to remove the JWT from sessionStorage and redirect the user back to the login.html page when clicked.

## Implementation Details

### 1. Added Logout Link to Navigation
Added a logout link with an appropriate icon to the navigation menu in `index.html`:

```html
<a href="#" id="logout-link"><i class="fas fa-sign-out-alt"></i> Logout</a>
```

The link is placed at the end of the navigation menu to follow standard convention.

### 2. Added Logout Functionality in navigation.js
Implemented JavaScript code to handle the logout functionality when the logout link is clicked:

```javascript
// Handle logout functionality
const logoutLink = document.getElementById('logout-link');
if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Clear JWT from sessionStorage
        sessionStorage.removeItem('jwt');
        
        // Clear any other guest-related data
        sessionStorage.removeItem('guestId');
        sessionStorage.removeItem('guestName');
        sessionStorage.removeItem('roomNumber');
        
        // Redirect to login page
        window.location.href = '/login.html';
        
        console.log('User logged out successfully');
    });
}
```

The implementation:
- Prevents the default link behavior
- Removes JWT and other guest-related data from sessionStorage
- Redirects the user to the login page
- Logs a message to the console for debugging purposes

### 3. Testing
Created a test to verify the logout functionality in `tests/logout/logout.test.js`. The test confirms that:
- The event listener is attached to the logout link
- Clicking the link clears all user data from sessionStorage
- The user is redirected to the login page

## Conclusion
The logout functionality has been successfully implemented according to the requirements. The feature allows users to securely log out from the application by clearing their session data and redirecting them to the login page. 