# Step 67: Add Login Api Call

## Overview

This step involves using the Fetch API to send the Room Number and Last Name to the `POST /auth/guest/login` endpoint. 

## Implementation Details

The functionality for this step was already implemented as part of Step 66. In the `public/js/login.js` file, the following code was added to handle the API call:

```javascript
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
```

This code makes a POST request to the `/auth/guest/login` endpoint with a JSON payload containing the guest's room number and last name, which is exactly what Step 67 requires.

## Testing

The API call functionality was tested as part of Step 66:
- Verified that the form data is correctly sent to the backend
- Confirmed that the request includes the correct headers and JSON body structure
- Tested with the test guest account (room number 999, name "Test")

## Next Steps

The next steps in the implementation plan are Steps 68-70, which involve handling the API response, storing the JWT, and redirecting after login. These functionalities were also already implemented as part of Step 66, as they are natural parts of the login form submission handler. 