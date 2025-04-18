document.addEventListener('DOMContentLoaded', async function() {
    const guestNameEl = document.getElementById('guest-name');
    const roomNumberEl = document.getElementById('room-number');

    // Fallback guest info
    const fallbackGuestInfo = {
        name: "Guest",
        roomNumber: "-"
    };

    // Function to update UI
    const updateGuestInfo = (name, roomNumber) => {
        if (guestNameEl) {
            guestNameEl.textContent = name;
        }
        if (roomNumberEl) {
            roomNumberEl.textContent = roomNumber;
        }
    };

    // Try to get guest info from the backend
    try {
        // 1. Get token (assuming it's stored in sessionStorage or localStorage by auth.js)
        // Check both, prefer sessionStorage if it exists
        let token = sessionStorage.getItem('guestToken') || localStorage.getItem('guestToken');

        if (!token) {
            console.warn('Guest token not found. Redirecting to login.');
            // Redirect to login if no token is found
            window.location.href = '/login.html'; 
            return; // Stop execution
        }

        // 2. Fetch guest details from the backend /guest/me endpoint
        // No need to decode token here, backend uses the token from header
        const response = await fetch('/guest/me', { // Updated endpoint
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Handle authentication errors specifically
            if (response.status === 401 || response.status === 403) {
                console.warn('Authentication failed fetching guest details. Clearing token and redirecting to login.');
                sessionStorage.removeItem('guestToken');
                localStorage.removeItem('guestToken');
                window.location.href = '/login.html';
            } else {
                // Handle other server errors
                console.error(`Error fetching guest details: ${response.status} ${response.statusText}. Using fallback data.`);
                updateGuestInfo(fallbackGuestInfo.name, fallbackGuestInfo.roomNumber);
            }
            return; // Stop execution
        }

        const data = await response.json();

        // 3. Update UI with data from backend
        if (data && data.status === 'success' && data.guest) {
            // Use the actual name and roomNumber from the response
            updateGuestInfo(data.guest.name, data.guest.roomNumber);
            console.log(`Welcome ${data.guest.name} in room ${data.guest.roomNumber}`);
        } else {
            // Handle unexpected response format
            console.warn('Received unexpected data format from /guest/me endpoint. Using fallback data.', data);
            updateGuestInfo(fallbackGuestInfo.name, fallbackGuestInfo.roomNumber);
        }

    } catch (error) {
        // Handle network errors or JSON parsing errors
        console.error('Error fetching or processing guest information:', error);
        updateGuestInfo(fallbackGuestInfo.name, fallbackGuestInfo.roomNumber);
        // Optional: Add a user-facing message indicating a connection issue
    }

    // Hamburger menu toggle logic is handled by navigation.js
}); 