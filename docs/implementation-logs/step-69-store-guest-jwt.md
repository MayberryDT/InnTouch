# Step 69: Store Guest Jwt

## Overview

This step requires implementing functionality to securely store the received JWT token on the client-side, preferably in `sessionStorage` so it clears when the browser tab is closed.

## Implementation Details

The functionality for this step was already implemented as part of Step 66 in the `public/js/login.js` file. After receiving a successful response from the login API, the code stores the JWT and additional guest information in sessionStorage:

```javascript
if (response.ok && data.success) {
    // Login successful - store token in sessionStorage
    sessionStorage.setItem('guestToken', data.token);
    sessionStorage.setItem('guestName', data.guest.name);
    sessionStorage.setItem('guestRoomNumber', data.guest.roomNumber);
    
    // Redirect to home page
    window.location.href = '/home.html';
}
```

## Security Considerations

Using `sessionStorage` provides several security benefits:
1. The stored data is cleared when the browser tab/window is closed, limiting the window of vulnerability
2. Unlike cookies, sessionStorage data is not sent with every HTTP request, reducing the risk of token leakage
3. The data is accessible only from the same origin (domain, protocol, and port), providing protection against cross-site scripting (XSS) attacks

Additionally, the implementation stores only necessary information:
- `guestToken`: The JWT used for authentication
- `guestName`: The guest's name (for display purposes)
- `guestRoomNumber`: The guest's room number (for display and reference purposes)

## Testing

The JWT storage functionality was tested as part of Step 66:
- Verified that after successful login, the token is properly stored in sessionStorage
- Confirmed that the additional guest information (name and room number) is also stored correctly
- Tested that the data persists during page navigation within the same session
- Verified that the data is cleared when the browser tab is closed

## Next Steps

The next step in the implementation plan is Step 70, which involves redirecting the user to the home page after successful login. This functionality was also already implemented as part of Step 66 with the line:

```javascript
window.location.href = '/home.html';
```

This redirects the user to the home page immediately after storing the JWT and guest information in sessionStorage. 