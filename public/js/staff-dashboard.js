document.addEventListener('DOMContentLoaded', function() {
    console.clear(); // Clear any previous logs
    console.log('=== STAFF DASHBOARD INITIALIZATION ===');
    
    // Check if user is logged in by checking for JWT token from localStorage (primary) or sessionStorage (fallback)
    const staffToken = localStorage.getItem('staffToken');
    const isLoggedInSession = sessionStorage.getItem('staffLoggedIn');
    
    // For debugging purposes, let's log the authentication status
    console.log('Authentication state:');
    console.log('- staffToken exists:', !!staffToken);
    console.log('- staffToken length:', staffToken ? staffToken.length : 0);
    console.log('- sessionStorage login status:', isLoggedInSession);
    
    try {
        // If we have a token, try parsing it to verify it's well-formed
        if (staffToken) {
            const tokenParts = staffToken.split('.');
            console.log('- token structure (should have 3 parts):', tokenParts.length);
            
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                console.log('- token payload successfully parsed:', payload);
                console.log('- token payload username:', payload.username);
                console.log('- token payload role:', payload.role);
                console.log('- token expiration:', new Date(payload.exp * 1000).toLocaleString());
            } else {
                console.warn('- token is not properly structured');
            }
        }
    } catch (e) {
        console.error('- error parsing token:', e.message);
    }
    
    // Store authentication state in window object for debugging in console
    window.authDebug = {
        staffToken,
        isLoggedInSession,
        loginAttempted: true
    };
    
    if (!staffToken && !isLoggedInSession) {
        console.log('No authentication detected, redirecting to login');
        window.location.href = '/staff-login.html';
        return;
    }
    
    console.log('Authentication successful, initializing dashboard');
    
    // Initialize dashboard
    initializeDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboardData();
});

/**
 * Initialize the dashboard
 */
function initializeDashboard() {
    // Display staff information (will be updated from JWT)
    updateStaffInfo();
    
    // Setup tabs
    const tabs = ['chats', 'orders', 'bookings', 'feedback'];
    tabs.forEach(tab => {
        const button = document.getElementById(`${tab}-tab`);
        if (button) {
            button.addEventListener('click', function() {
                // Remove active class from all tabs
                tabs.forEach(t => {
                    const tabButton = document.getElementById(`${t}-tab`);
                    const tabSection = document.getElementById(`${t}-section`);
                    if (tabButton) tabButton.classList.remove('active');
                    if (tabSection) tabSection.classList.remove('active');
                });
                
                // Add active class to clicked tab
                button.classList.add('active');
                const section = document.getElementById(`${tab}-section`);
                if (section) section.classList.add('active');
            });
        }
    });
    
    // Setup logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('staffToken');
            window.location.href = '/staff-login.html';
        });
    }
    
    // Setup Cloudbeds sync button
    const syncButton = document.getElementById('sync-button');
    if (syncButton) {
        syncButton.addEventListener('click', syncCloudbedsData);
    }
}

/**
 * Set up event listeners for dashboard actions
 */
function setupEventListeners() {
    // Add event delegation for accept/acknowledge buttons
    document.addEventListener('click', function(e) {
        // Handle accept chat button
        if (e.target.classList.contains('accept-btn')) {
            const notificationItem = e.target.closest('.notification-item');
            if (notificationItem) {
                const guestId = notificationItem.dataset.guestId;
                acceptChat(guestId, notificationItem);
            }
        }
        
        // Handle acknowledge button
        if (e.target.classList.contains('acknowledge-btn')) {
            const notificationItem = e.target.closest('.notification-item');
            if (notificationItem) {
                // Get guestId from the button itself, not the parent item
                const guestId = e.target.dataset.guestId; 
                if (guestId) { // Ensure guestId is found
                    acknowledgeChat(guestId, notificationItem);
                } else {
                    console.error('Could not find guestId on the clicked dismiss button:', e.target);
                    showErrorMessage('Could not process dismiss action: Missing guest ID.');
                }
            }
        }
        
        // Handle update order status
        if (e.target.classList.contains('update-order-status')) {
            const orderId = e.target.dataset.orderId;
            const newStatus = e.target.dataset.status;
            if (orderId && newStatus) {
                updateOrderStatus(orderId, newStatus);
            }
        }
        
        // Handle update booking status
        if (e.target.classList.contains('update-booking-status')) {
            const bookingId = e.target.dataset.bookingId;
            const newStatus = e.target.dataset.status;
            if (bookingId && newStatus) {
                updateBookingStatus(bookingId, newStatus);
            }
        }
    });
}

/**
 * Load dashboard data from API
 */
async function loadDashboardData() {
    try {
        // Show loading states
        showLoadingState('chats-section');
        showLoadingState('orders-section');
        showLoadingState('bookings-section');
        showLoadingState('feedback-section');
        
        // Check if the server is running first
        const isServerRunning = await checkServerStatus();
        
        if (!isServerRunning) {
            console.warn('[DEBUG] Server appears to be down, using fallback data where available');
            showServerDownWarning();
        }
        
        // Fetch escalated chats
        fetchEscalatedChats();
        
        // Fetch room service orders
        fetchRoomServiceOrders();
        
        // Fetch bookings
        fetchBookings();
        
        // Fetch feedback
        fetchFeedback();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('Failed to load dashboard data. Please try again later.');
    }
}

/**
 * Check if the server is responding
 * @returns {Promise<boolean>} True if server is responding, false otherwise
 */
async function checkServerStatus() {
    try {
        console.log('[DEBUG] Checking server status...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        try {
            const response = await fetch('/api/health', { 
                method: 'HEAD',
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('[DEBUG] Server is up and responding');
                return true;
            } else {
                console.warn('[DEBUG] Server responded with error:', response.status);
                return false;
            }
        } catch (e) {
            clearTimeout(timeoutId);
            console.warn('[DEBUG] Server check failed:', e.message);
            return false;
        }
    } catch (e) {
        console.error('[DEBUG] Error checking server status:', e);
        return false;
    }
}

/**
 * Show a warning that the server is down
 */
function showServerDownWarning() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    const warningBanner = document.createElement('div');
    warningBanner.id = 'server-down-warning';
    warningBanner.style.backgroundColor = '#f8d7da';
    warningBanner.style.color = '#721c24';
    warningBanner.style.padding = '10px 15px';
    warningBanner.style.marginBottom = '20px';
    warningBanner.style.borderRadius = '4px';
    warningBanner.style.border = '1px solid #f5c6cb';
    warningBanner.style.position = 'sticky';
    warningBanner.style.top = '0';
    warningBanner.style.zIndex = '100';
    warningBanner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>
                <strong>Server Connection Error:</strong> 
                The server appears to be down or unreachable. Some features may use mock data or be unavailable.
            </span>
            <button class="btn btn-sm" onclick="window.location.reload()">Retry Connection</button>
        </div>
    `;
    
    container.insertBefore(warningBanner, container.firstChild);
}

/**
 * Show loading state for a section
 * @param {string} sectionId - The ID of the section to show loading state for
 */
function showLoadingState(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading data...</p>
            </div>
        `;
    }
}

/**
 * Show error message
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = message;
    
    // Add to the top of the container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

/**
 * Update staff information based on JWT token or session storage
 */
function updateStaffInfo() {
    const staffToken = localStorage.getItem('staffToken');
    const staffNameFromSession = sessionStorage.getItem('staffName');
    
    // Update staff name from JWT if available
    if (staffToken) {
        try {
            // Extract payload from JWT (without verification since we're on client)
            const payload = JSON.parse(atob(staffToken.split('.')[1]));
            
            // Update staff name in UI
            const staffNameElement = document.getElementById('staff-name');
            if (staffNameElement && payload.username) {
                staffNameElement.textContent = payload.username;
            }
        } catch (error) {
            console.error('Error parsing JWT token:', error);
            
            // Fallback to session storage if JWT parsing fails
            if (staffNameFromSession) {
                const staffNameElement = document.getElementById('staff-name');
                if (staffNameElement) {
                    staffNameElement.textContent = staffNameFromSession;
                }
            }
        }
    } 
    // Fallback to session storage if no JWT 
    else if (staffNameFromSession) {
        const staffNameElement = document.getElementById('staff-name');
        if (staffNameElement) {
            staffNameElement.textContent = staffNameFromSession;
        }
    }
}

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with Authorization if token is available
 */
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    const authToken = localStorage.getItem('staffToken');
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return headers;
}

// Global variables to hold fetched data
let escalatedChatsData = [];
let roomServiceOrdersData = [];
let bookingsData = [];

/**
 * Fetch escalated chats from API
 */
async function fetchEscalatedChats() {
    try {
        console.log('[DEBUG] Starting fetchEscalatedChats function');
        const authHeaders = getAuthHeaders();
        console.log('[DEBUG] Auth headers:', JSON.stringify(authHeaders));
        
        console.log('[DEBUG] Sending fetch request to /api/chat/escalated');
        
        // Create an AbortController to handle timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
            const response = await fetch('/api/chat/escalated', {
                headers: authHeaders,
                signal: controller.signal
            });
            
            // Clear the timeout since the request completed
            clearTimeout(timeoutId);
            
            console.log('[DEBUG] Received response:', response.status, response.statusText);
            console.log('[DEBUG] Response headers:', JSON.stringify(Object.fromEntries([...response.headers])));
            
            if (!response.ok) {
                console.error('[DEBUG] Error response from /api/chat/escalated:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('[DEBUG] Error response body:', errorText);
                throw new Error(`Failed to fetch escalated chats: ${response.status} ${response.statusText}`);
            }
            
            console.log('[DEBUG] Response OK, parsing JSON');
            const responseText = await response.text();
            console.log('[DEBUG] Raw response text:', responseText);
            
            // Parse the JSON manually after logging it
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('[DEBUG] JSON parse error:', parseError);
                throw new Error(`Failed to parse response: ${parseError.message}`);
            }
            
            console.log('[DEBUG] Parsed response data:', data);
            
            if (data.status === 'success') {
                escalatedChatsData = data.data?.chats || []; // Store data
                updateChatsList(escalatedChatsData); // RE-ADD THIS: Update the main chats list content
                updateCombinedNotifications(); // Call function to update sidebar
            } else {
                console.error('[DEBUG] API returned non-success status:', data.status);
                throw new Error(data.message || 'Failed to fetch escalated chats');
            }
        } catch (fetchError) {
            // Clear the timeout in case of error
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                console.error('[DEBUG] Fetch request timed out after 5 seconds');
                console.warn('[DEBUG] Using mock data as fallback since server is unreachable');
                
                // Use mock data as fallback
                const mockData = getMockEscalatedChats();
                console.log('[DEBUG] Mock data:', mockData);
                updateChatNotifications(mockData);
                updateChatsList(mockData);
                
                // Show a warning about using mock data
                const chatsSection = document.getElementById('chats-section');
                if (chatsSection) {
                    const warningBanner = document.createElement('div');
                    warningBanner.className = 'warning-banner';
                    warningBanner.style.backgroundColor = '#fff3cd';
                    warningBanner.style.color = '#856404';
                    warningBanner.style.padding = '10px';
                    warningBanner.style.marginBottom = '15px';
                    warningBanner.style.borderRadius = '4px';
                    warningBanner.style.border = '1px solid #ffeeba';
                    warningBanner.innerHTML = `
                        <strong>Warning:</strong> Using mock data because the server is unreachable. 
                        <button class="btn btn-sm" onclick="fetchEscalatedChats()">Retry</button>
                    `;
                    
                    // Insert at the top of the chats section
                    chatsSection.insertBefore(warningBanner, chatsSection.firstChild);
                }
                
                return; // Exit without displaying error since we're showing mock data
            }
            
            throw fetchError;
        }
    } catch (error) {
        console.error('[DEBUG] Exception in fetchEscalatedChats:', error);
        console.error('[DEBUG] Error stack:', error.stack);
        const chatsSection = document.getElementById('chats-section');
        if (chatsSection) {
            displayDebugInfo(chatsSection, error, 'Error fetching chats');
        }
    }
}

/**
 * Get mock data for escalated chats (used as fallback when server is unreachable)
 * @returns {Array} Array of mock chat data
 */
function getMockEscalatedChats() {
    const now = new Date();
    return [
        {
            guest_id: 1,
            guest_name: 'John Smith',
            room_number: '101',
            timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
            last_message: 'I need help with the WiFi password'
        },
        {
            guest_id: 2,
            guest_name: 'Emma Johnson',
            room_number: '203',
            timestamp: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
            last_message: 'Can someone help with my room temperature?'
        },
        {
            guest_id: 3,
            guest_name: 'Michael Brown',
            room_number: '312',
            timestamp: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
            last_message: 'What time does the pool close tonight?'
        }
    ];
}

/**
 * Update chat notifications sidebar
 * @param {Array} chats - List of escalated chats
 */
function updateChatNotifications(chats) {
    const notificationsList = document.getElementById('notifications-list');
    const notificationCount = document.getElementById('notification-count');
    
    if (!notificationsList) {
        console.error('Notifications list element not found');
        return;
    }
    
    if (!chats || chats.length === 0) {
        console.log('No chat notifications to display');
        notificationsList.innerHTML = '<p class="text-center">No escalated chats</p>';
        if (notificationCount) {
            notificationCount.style.display = 'none';
        }
        return;
    }
    
    try {
        console.log('Updating chat notifications with data:', chats);
        let notificationsHtml = '';
        
        chats.forEach(chat => {
            // Make sure we have all the required fields with fallbacks
            const guestId = chat.guest_id || 'unknown';
            const guestName = chat.guest_name || 'Guest';
            const roomNumber = chat.room_number || 'Unknown';
            const message = chat.last_message || 'No message';
            const timestamp = chat.timestamp || chat.last_message_time || new Date().toISOString();
            
            // Determine urgency level based on wait time
            const waitTimeMinutes = calculateWaitTimeMinutes(timestamp);
            let urgencyLevel = 1;
            
            if (waitTimeMinutes > 10) {
                urgencyLevel = 3;
            } else if (waitTimeMinutes > 5) {
                urgencyLevel = 2;
            }
            
            notificationsHtml += `
                <div class="notification-item urgency-level-${urgencyLevel}" data-guest-id="${guestId}">
                    <div class="guest-info">
                        <span class="guest-name">${guestName}</span>
                        <span class="room-number">Room ${roomNumber}</span>
                    </div>
                    <p class="last-message">${message}</p>
                    <span class="wait-time">Waiting: ${formatWaitTime(timestamp)}</span>
                    <div class="notification-actions">
                        <button class="btn accept-btn">Accept</button>
                        <button class="btn acknowledge-btn">Dismiss</button>
                    </div>
                </div>
            `;
        });
        
        notificationsList.innerHTML = notificationsHtml;
        console.log('Chat notifications updated successfully');
        
        // Update notification count
        if (notificationCount) {
            notificationCount.textContent = chats.length;
            notificationCount.style.display = 'inline-flex';
        }
    } catch (error) {
        console.error('Error updating chat notifications:', error);
        notificationsList.innerHTML = `
            <div class="error">
                <p><i class="fas fa-exclamation-circle"></i> Error displaying notifications: ${error.message}</p>
            </div>
        `;
        if (notificationCount) {
            notificationCount.style.display = 'none';
        }
    }
}

/**
 * Update chats section with escalated chats
 * @param {Array} chats - List of escalated chats
 */
function updateChatsList(chats) {
    const chatsSection = document.getElementById('chats-section');
    
    if (!chatsSection) {
        console.error('Chats section element not found');
        return;
    }
    
    if (!chats || chats.length === 0) {
        console.log('No chats to display');
        chatsSection.innerHTML = '<div class="card"><p class="text-center">No escalated chats</p></div>';
        return;
    }
    
    try {
        console.log('Updating chats list with data:', chats);
        
        let chatsHtml = '<div class="card">';
        
        chats.forEach(chat => {
            // Make sure we have all the required fields with fallbacks
            const guestId = chat.guest_id || 'unknown';
            const guestName = chat.guest_name || 'Guest';
            const roomNumber = chat.room_number || 'Unknown';
            const message = chat.last_message || 'No message';
            const timestamp = chat.timestamp || chat.last_message_time || new Date().toISOString();
            
            chatsHtml += `
                <div class="dashboard-item" data-guest-id="${guestId}">
                    <div class="item-details">
                        <div class="item-title">${guestName} (Room ${roomNumber})</div>
                        <div class="item-description">${message}</div>
                        <div class="item-time">Last message: ${formatTimestamp(timestamp)}</div>
                    </div>
                    <div class="item-status status-pending">Pending</div>
                </div>
            `;
        });
        
        chatsHtml += '</div>';
        chatsSection.innerHTML = chatsHtml;
        console.log('Chats list updated successfully');
    } catch (error) {
        console.error('Error updating chats list:', error);
        displayDebugInfo(chatsSection, error, 'Error displaying chats');
    }
}

/**
 * Display debug information in the UI
 * @param {HTMLElement} container - Container element to display debug info in
 * @param {Error} error - Error object if applicable
 * @param {string} message - Message to display
 */
function displayDebugInfo(container, error, message) {
    if (!container) return;
    
    // Get auth info for debugging
    const token = localStorage.getItem('staffToken') || sessionStorage.getItem('staffToken') || 'none';
    const tokenDisplay = token !== 'none' ? `${token.substring(0, 15)}...` : 'none';
    
    container.innerHTML = `
        <div class="card">
            <h3 class="text-error"><i class="fas fa-exclamation-triangle"></i> ${message}</h3>
            <div class="debug-info" style="background: #f8f8f8; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; overflow-x: auto;">
                <p><strong>Error:</strong> ${error ? error.message : 'Unknown error'}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                <p><strong>Auth:</strong> Token exists: ${!!token}</p>
                <p><strong>Token preview:</strong> ${tokenDisplay}</p>
                <p><strong>URL:</strong> ${window.location.href}</p>
                <p><strong>User agent:</strong> ${navigator.userAgent}</p>
            </div>
            <div class="debug-actions">
                <button class="btn btn-sm" onclick="fetchEscalatedChats()">Retry</button>
                <button class="btn btn-sm" onclick="window.location.reload()">Refresh Page</button>
                <button class="btn btn-sm" onclick="testFetchApi()">Test API</button>
            </div>
        </div>
    `;
}

/**
 * Test direct fetch to API for debugging
 */
function testFetchApi() {
    const chatsSection = document.getElementById('chats-section');
    if (!chatsSection) return;
    
    chatsSection.innerHTML = `<div class="card"><p class="text-center">Testing API connection...</p></div>`;
    
    // Make a direct fetch request to the server
    fetch('/api/chat/escalated', {
        headers: getAuthHeaders()
    })
    .then(response => {
        const statusInfo = `${response.status} ${response.statusText}`;
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`API returned status ${statusInfo}: ${text}`);
            });
        }
        return response.text().then(text => ({ text, status: statusInfo }));
    })
    .then(({ text, status }) => {
        chatsSection.innerHTML = `
            <div class="card">
                <h3>API Test Result: <span style="color: green;">Success (${status})</span></h3>
                <div style="background: #f8f8f8; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; overflow-x: auto;">
                    ${text}
                </div>
                <button class="btn btn-sm" onclick="fetchEscalatedChats()">Try loading chats again</button>
            </div>
        `;
    })
    .catch(error => {
        chatsSection.innerHTML = `
            <div class="card">
                <h3>API Test Result: <span style="color: red;">Failed</span></h3>
                <div style="background: #f8f8f8; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; overflow-x: auto;">
                    ${error.message}
                </div>
                <button class="btn btn-sm" onclick="window.location.reload()">Refresh Page</button>
            </div>
        `;
    });
}

/**
 * Fetch room service orders from API
 */
async function fetchRoomServiceOrders() {
    try {
        console.log('[DEBUG] Fetching room service orders');
        
        // Create an AbortController to handle timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
            const response = await fetch('/api/staff/room-service', {
                headers: getAuthHeaders(),
                signal: controller.signal
            });
            
            // Clear the timeout since the request completed
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Failed to fetch room service orders');
            }
            
            const data = await response.json();
            
            if (data.success) {
                roomServiceOrdersData = data.orders || []; // Store data
                updateOrdersList(roomServiceOrdersData); // Keep updating the dedicated orders list
                updateCombinedNotifications(); // Call function to update sidebar
            } else {
                throw new Error(data.error || 'Failed to fetch room service orders');
            }
        } catch (fetchError) {
            // Clear the timeout in case of error
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                console.warn('[DEBUG] Room service orders request timed out, using mock data');
                updateOrdersList(getMockRoomServiceOrders());
                return;
            }
            
            throw fetchError;
        }
    } catch (error) {
        console.error('Error fetching room service orders:', error);
        const ordersSection = document.getElementById('orders-section');
        if (ordersSection) {
            ordersSection.innerHTML = `
                <div class="error">
                    <p><i class="fas fa-exclamation-circle"></i> ${error.message}</p>
                    <button class="btn btn-sm" onclick="fetchRoomServiceOrders()">Retry</button>
                </div>
            `;
        }
    }
}

/**
 * Get mock data for room service orders
 * @returns {Array} Array of mock room service orders
 */
function getMockRoomServiceOrders() {
    const now = new Date();
    return [
        {
            id: 1,
            guestId: 'John Smith',
            roomNumber: '101',
            status: 'pending',
            timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
            items: [
                { quantity: 1, name: 'Club Sandwich' },
                { quantity: 1, name: 'French Fries' },
                { quantity: 2, name: 'Sparkling Water' }
            ]
        },
        {
            id: 2,
            guestId: 'Emma Johnson',
            roomNumber: '203',
            status: 'confirmed',
            timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
            items: [
                { quantity: 1, name: 'Caesar Salad' },
                { quantity: 1, name: 'Grilled Chicken' }
            ]
        },
        {
            id: 3,
            guestId: 'Michael Brown',
            roomNumber: '312',
            status: 'delivered',
            timestamp: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
            items: [
                { quantity: 1, name: 'Bottle of Wine' },
                { quantity: 1, name: 'Cheese Platter' }
            ]
        }
    ];
}

/**
 * Update orders section with room service orders
 * @param {Array} orders - List of room service orders
 */
function updateOrdersList(orders) {
    const ordersSection = document.getElementById('orders-section');
    
    if (ordersSection) {
        if (orders.length === 0) {
            ordersSection.innerHTML = '<div class="card"><p class="text-center">No active orders</p></div>';
            return;
        }
        
        let ordersHtml = '<div class="card">';
        
        orders.forEach(order => {
            // Format order items for display
            const items = order.items || [];
            let itemsText = '';
            
            if (items.length > 0) {
                itemsText = items.map(item => `${item.quantity || 1} x ${item.name}`).join(', ');
            } else {
                itemsText = 'No items';
            }
            
            // Create action buttons based on current status
            let actionButtons = '';
            if (order.status === 'pending') {
                actionButtons = `
                    <button class="btn btn-sm update-order-status" data-order-id="${order.id}" data-status="confirmed">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                `;
            } else if (order.status === 'confirmed') {
                actionButtons = `
                    <button class="btn btn-sm update-order-status" data-order-id="${order.id}" data-status="delivered">
                        <i class="fas fa-truck"></i> Mark Delivered
                    </button>
                `;
            }
            
            ordersHtml += `
                <div class="dashboard-item" data-order-id="${order.id}">
                    <div class="item-details">
                        <div class="item-title">Room ${order.roomNumber || 'Unknown'} - ${order.guest_name || `Guest ${order.guestId}`}</div>
                        <div class="item-description">${itemsText}</div>
                        <div class="item-time">Ordered: ${formatTimestamp(order.timestamp)}</div>
                        <div class="item-actions">${actionButtons}</div>
                    </div>
                    <div class="item-status status-${order.status}">${capitalizeFirstLetter(order.status)}</div>
                </div>
            `;
        });
        
        ordersHtml += '</div>';
        ordersSection.innerHTML = ordersHtml;
    }
}

/**
 * Update order status
 * @param {string} orderId - The ID of the order to update
 * @param {string} newStatus - The new status to set
 */
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/api/staff/room-service/${orderId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update order status');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Reload orders after successful update
            fetchRoomServiceOrders();
        } else {
            throw new Error(data.error || 'Failed to update order status');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showErrorMessage(error.message);
    }
}

/**
 * Fetch bookings from API
 */
async function fetchBookings() {
    try {
        console.log('[DEBUG] Fetching bookings');
        
        // Create an AbortController to handle timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
            const response = await fetch('/api/staff/booking', {
                headers: getAuthHeaders(),
                signal: controller.signal
            });
            
            // Clear the timeout since the request completed
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }
            
            const data = await response.json();
            
            if (data.success) {
                bookingsData = data.bookings || []; // Store data
                updateBookingsList(bookingsData); // Keep updating the dedicated bookings list
                updateCombinedNotifications(); // Call function to update sidebar
            } else {
                throw new Error(data.error || 'Failed to fetch bookings');
            }
        } catch (fetchError) {
            // Clear the timeout in case of error
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                console.warn('[DEBUG] Bookings request timed out, using mock data');
                updateBookingsList(getMockBookings());
                return;
            }
            
            throw fetchError;
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        const bookingsSection = document.getElementById('bookings-section');
        if (bookingsSection) {
            bookingsSection.innerHTML = `
                <div class="error">
                    <p><i class="fas fa-exclamation-circle"></i> ${error.message}</p>
                    <button class="btn btn-sm" onclick="fetchBookings()">Retry</button>
                </div>
            `;
        }
    }
}

/**
 * Get mock data for bookings
 * @returns {Array} Array of mock bookings
 */
function getMockBookings() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return [
        {
            id: 1,
            guest_name: 'John Smith',
            room_number: '101',
            type: 'spa',
            status: 'pending',
            details: {
                name: 'Deep Tissue Massage',
                time: new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString()
            }
        },
        {
            id: 2,
            guest_name: 'Emma Johnson',
            room_number: '203',
            type: 'restaurant',
            status: 'confirmed',
            details: {
                name: 'Dinner Reservation - 2 guests',
                time: new Date(now.setHours(19, 30, 0, 0)).toISOString()
            }
        },
        {
            id: 3,
            guest_name: 'Michael Brown',
            room_number: '312',
            type: 'activity',
            status: 'confirmed',
            details: {
                name: 'City Tour',
                time: new Date(tomorrow.setHours(9, 0, 0, 0)).toISOString()
            }
        }
    ];
}

/**
 * Update bookings section with booking data
 * @param {Array} bookings - List of bookings
 */
function updateBookingsList(bookings) {
    const bookingsSection = document.getElementById('bookings-section');
    
    if (bookingsSection) {
        if (bookings.length === 0) {
            bookingsSection.innerHTML = '<div class="card"><p class="text-center">No bookings found</p></div>';
            return;
        }
        
        let bookingsHtml = '<div class="card">';
        
        bookings.forEach(booking => {
            let detailsText = '';
            try {
                // Combine date and time from details for formatting
                let combinedTimestamp = '';
                if (typeof booking.details === 'string') {
                    const details = JSON.parse(booking.details);
                    if (details.date && details.time) {
                        combinedTimestamp = `${details.date}T${details.time}:00`; // Construct ISO-like string
                    }
                    detailsText = `${details.name} - ${formatTimestamp(combinedTimestamp)}`;
                } else if (booking.details && booking.details.name) {
                    if (booking.details.date && booking.details.time) {
                        combinedTimestamp = `${booking.details.date}T${booking.details.time}:00`; // Construct ISO-like string
                    }
                    detailsText = `${booking.details.name} - ${formatTimestamp(combinedTimestamp)}`;
                }
            } catch (e) {
                console.error('Error parsing booking details:', e);
                detailsText = 'Unable to display booking details';
            }
            
            // Create action buttons based on current status
            let actionButtons = '';
            if (booking.status === 'pending') {
                actionButtons = `
                    <button class="btn btn-sm update-booking-status" data-booking-id="${booking.id}" data-status="confirmed">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                    <button class="btn btn-sm btn-secondary update-booking-status" data-booking-id="${booking.id}" data-status="cancelled">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `;
            } else if (booking.status === 'confirmed') {
                actionButtons = `
                    <button class="btn btn-sm btn-secondary update-booking-status" data-booking-id="${booking.id}" data-status="cancelled">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `;
            }
            
            bookingsHtml += `
                <div class="dashboard-item" data-booking-id="${booking.id}">
                    <div class="item-details">
                        <div class="item-title">Room ${booking.room_number || 'Unknown'} - ${booking.guest_name || 'Guest'}</div>
                        <div class="item-description">${detailsText}</div>
                        <div class="item-type">Type: ${capitalizeFirstLetter(booking.type || 'Unknown')}</div>
                        <div class="item-actions">${actionButtons}</div>
                    </div>
                    <div class="item-status status-${booking.status}">${capitalizeFirstLetter(booking.status)}</div>
                </div>
            `;
        });
        
        bookingsHtml += '</div>';
        bookingsSection.innerHTML = bookingsHtml;
    }
}

/**
 * Update booking status
 * @param {string} bookingId - The ID of the booking to update
 * @param {string} newStatus - The new status to set
 */
async function updateBookingStatus(bookingId, newStatus) {
    try {
        const response = await fetch(`/api/staff/booking/${bookingId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update booking status');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Reload bookings after successful update
            fetchBookings();
        } else {
            throw new Error(data.error || 'Failed to update booking status');
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        showErrorMessage(error.message);
    }
}

/**
 * Fetch feedback from API
 */
async function fetchFeedback() {
    try {
        console.log('[DEBUG] Fetching feedback');
        
        // Create an AbortController to handle timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
            const response = await fetch('/api/staff/feedback', {
                headers: getAuthHeaders(),
                signal: controller.signal
            });
            
            // Clear the timeout since the request completed
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Failed to fetch feedback');
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                updateFeedbackList(data.data.feedback, data.data.meta);
            } else {
                throw new Error(data.message || 'Failed to fetch feedback');
            }
        } catch (fetchError) {
            // Clear the timeout in case of error
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                console.warn('[DEBUG] Feedback request timed out, using mock data');
                const mockFeedback = getMockFeedback();
                updateFeedbackList(mockFeedback.feedback, mockFeedback.meta);
                return;
            }
            
            throw fetchError;
        }
    } catch (error) {
        console.error('Error fetching feedback:', error);
        const feedbackSection = document.getElementById('feedback-section');
        if (feedbackSection) {
            feedbackSection.innerHTML = `
                <div class="error">
                    <p><i class="fas fa-exclamation-circle"></i> ${error.message}</p>
                    <button class="btn btn-sm" onclick="fetchFeedback()">Retry</button>
                </div>
            `;
        }
    }
}

/**
 * Get mock data for feedback
 * @returns {Object} Object with feedback items and metadata
 */
function getMockFeedback() {
    const now = new Date();
    
    return {
        feedback: [
            {
                id: 1,
                name: 'John Smith',
                room_number: '101',
                rating: 5,
                comments: 'Excellent service, the staff was very attentive and helpful.',
                timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 2,
                name: 'Emma Johnson',
                room_number: '203',
                rating: 4,
                comments: 'Great stay overall. Room was clean and comfortable. Would have given 5 stars but the Wi-Fi was a bit slow.',
                timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 3,
                name: 'Michael Brown',
                room_number: '312',
                rating: 3,
                comments: 'Average experience. The room was nice but the noise from the street was disturbing.',
                timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
            }
        ],
        meta: {
            count: 3,
            averageRating: 4.0,
            ratingDistribution: {
                1: 0,
                2: 0,
                3: 1,
                4: 1,
                5: 1
            }
        }
    };
}

/**
 * Update feedback section with feedback data
 * @param {Array} feedbackItems - List of feedback items
 * @param {Object} meta - Metadata about feedback (counts, averages, etc.)
 */
function updateFeedbackList(feedbackItems, meta) {
    const feedbackSection = document.getElementById('feedback-section');
    
    if (feedbackSection) {
        if (feedbackItems.length === 0) {
            feedbackSection.innerHTML = '<div class="card"><p class="text-center">No feedback found</p></div>';
            return;
        }
        
        // Add feedback stats
        let feedbackHtml = `
            <div class="card mb-md">
                <div class="dashboard-stats">
                    <div class="stat-item">
                        <div class="stat-value">${meta.count}</div>
                        <div class="stat-label">Total Feedback</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${meta.averageRating}</div>
                        <div class="stat-label">Average Rating</div>
                    </div>
                </div>
                <div class="rating-distribution">
                    <div class="distribution-label">Rating Distribution:</div>
                    <div class="distribution-bars">
                        ${createRatingDistributionBars(meta.ratingDistribution, meta.count)}
                    </div>
                </div>
            </div>
        `;
        
        // Add feedback items
        feedbackHtml += '<div class="card">';
        
        feedbackItems.forEach(feedback => {
            const stars = generateStarsHtml(feedback.rating);
            
            feedbackHtml += `
                <div class="dashboard-item">
                    <div class="item-details">
                        <div class="item-title">Room ${feedback.room_number || 'Unknown'} - ${feedback.name || 'Guest'}</div>
                        <div class="item-description">
                            <div style="margin-bottom: 0.25rem;">
                                ${stars}
                            </div>
                            "${feedback.comments || 'No comments provided'}"
                        </div>
                        <div class="item-time">Submitted: ${formatTimestamp(feedback.timestamp)}</div>
                    </div>
                </div>
            `;
        });
        
        feedbackHtml += '</div>';
        feedbackSection.innerHTML = feedbackHtml;
    }
}

/**
 * Generate HTML for star rating display
 * @param {number} rating - Rating value (1-5)
 * @returns {string} HTML for star rating
 */
function generateStarsHtml(rating) {
    let starsHtml = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHtml += '<i class="fas fa-star" style="color: var(--accent-teal);"></i>';
        } else {
            starsHtml += '<i class="fas fa-star" style="color: #ddd;"></i>';
        }
    }
    
    return starsHtml;
}

/**
 * Create rating distribution bar chart HTML
 * @param {Object} distribution - Distribution of ratings
 * @param {number} totalCount - Total number of ratings
 */
function createRatingDistributionBars(distribution, totalCount) {
    let html = '';
    
    for (let i = 5; i >= 1; i--) {
        const count = distribution[i] || 0;
        const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        
        html += `
            <div class="distribution-row">
                <div class="distribution-label">${i} <i class="fas fa-star"></i></div>
                <div class="distribution-bar-container">
                    <div class="distribution-bar" style="width: ${percentage}%"></div>
                </div>
                <div class="distribution-count">${count} (${percentage}%)</div>
            </div>
        `;
    }
    
    return html;
}

/**
 * Accept a chat from a guest
 * @param {string} guestId - The ID of the guest
 * @param {HTMLElement} notificationItem - The notification item element
 */
function acceptChat(guestId, notificationItem) {
    console.log(`Accepting chat for guest ${guestId}`);
    
    // Remove the notification from the UI
    if (notificationItem) {
        notificationItem.remove();
        updateNotificationCount();
    }
    
    // Check if the notification contains guest info
    let guestName = 'Guest';
    let roomNumber = 'Unknown';
    
    if (notificationItem) {
        const nameElement = notificationItem.querySelector('.guest-name');
        const roomElement = notificationItem.querySelector('.room-number');
        
        if (nameElement) {
            guestName = nameElement.textContent;
        }
        
        if (roomElement) {
            roomNumber = roomElement.textContent.replace('Room ', '');
        }
    }
    
    // Store the accepted chat info in sessionStorage for reference
    // This can be used to highlight the active chat in case staff navigates back to dashboard
    sessionStorage.setItem('activeChat', JSON.stringify({
        guestId,
        guestName,
        roomNumber,
        acceptedAt: new Date().toISOString()
    }));
    
    // Redirect to staff chat page with guest ID
    window.location.href = `/staff-chat.html?guest_id=${guestId}`;
}

/**
 * Acknowledge a chat notification
 * @param {string} guestId - The ID of the guest
 * @param {HTMLElement} notificationItem - The notification item element
 */
async function acknowledgeChat(guestId, notificationItem) {
    console.log(`Acknowledging chat notification for guest ${guestId}`);
    
    // Disable buttons while processing
    const buttons = notificationItem.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    try {
        const response = await fetch(`/api/chat/acknowledge/${guestId}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            // Try to get error message from response body
            let errorMsg = 'Failed to acknowledge notification on server.';
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } catch (e) { 
                // Ignore if response is not JSON
             }
            throw new Error(`${errorMsg} Status: ${response.status}`);
        }

        // Success: Remove the item from the UI
        if (notificationItem) {
            notificationItem.remove();
            updateNotificationCount();
            console.log(`Successfully acknowledged and removed notification for guest ${guestId}`);
        }

    } catch (error) {
        console.error('Error acknowledging chat notification:', error);
        showErrorMessage(`Error dismissing notification: ${error.message}`);
        // Re-enable buttons on error
        buttons.forEach(btn => btn.disabled = false);
    }
}

/**
 * Update notification count in the UI
 */
function updateNotificationCount() {
    const count = document.querySelectorAll('.notification-item:not([style*="opacity"])').length;
    const badge = document.getElementById('notification-count');
    
    if (badge) {
        badge.textContent = count;
        
        if (count === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'inline-flex';
        }
    }
}

/**
 * Sync Cloudbeds data
 */
async function syncCloudbedsData() {
    const syncButton = document.getElementById('sync-button');
    const syncSuccess = document.getElementById('sync-success');
    const syncError = document.getElementById('sync-error');
    
    // Hide any previous messages
    if (syncSuccess) syncSuccess.style.display = 'none';
    if (syncError) syncError.style.display = 'none';
    
    // Show loading state on button
    if (syncButton) {
        const originalHtml = syncButton.innerHTML;
        syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        syncButton.disabled = true;
        
        try {
            const response = await fetch('/api/staff/import-cloudbeds', {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to sync Cloudbeds data');
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (syncSuccess) {
                    syncSuccess.style.display = 'block';
                    // If imported count is available, show it, otherwise show a generic message
                    if (data.imported !== undefined) {
                        syncSuccess.textContent = `${data.message || 'Data synced successfully!'} (${data.imported} guests)`;
                    } else {
                        syncSuccess.textContent = data.message || 'Data synced successfully!';
                    }
                }
                
                // Reload dashboard data
                loadDashboardData();
            } else {
                throw new Error(data.message || 'Failed to sync Cloudbeds data');
            }
        } catch (error) {
            console.error('Error syncing Cloudbeds data:', error);
            if (syncError) {
                syncError.style.display = 'block';
                syncError.textContent = error.message;
            }
        } finally {
            // Reset button
            if (syncButton) {
                syncButton.innerHTML = originalHtml;
                syncButton.disabled = false;
                
                // Hide the message after 3 seconds
                setTimeout(() => {
                    if (syncSuccess) syncSuccess.style.display = 'none';
                    if (syncError) syncError.style.display = 'none';
                }, 3000);
            }
        }
    }
}

/**
 * Format a timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        // Check if it's today
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();
        
        if (isToday) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
                   ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    } catch (error) {
        console.error('Error formatting timestamp:', error, timestamp);
        return 'Date error';
    }
}

/**
 * Calculate wait time in minutes
 * @param {string} timestamp - ISO timestamp
 * @returns {number} Wait time in minutes
 */
function calculateWaitTimeMinutes(timestamp) {
    if (!timestamp) return 0;
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            console.warn('Invalid timestamp format:', timestamp);
            return 0;
        }
        
        const now = new Date();
        const diffMs = now - date;
        return Math.floor(diffMs / (1000 * 60));
    } catch (error) {
        console.error('Error calculating wait time:', error, timestamp);
        return 0;
    }
}

/**
 * Format wait time for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted wait time (e.g., "5 minutes")
 */
function formatWaitTime(timestamp) {
    try {
        const minutes = calculateWaitTimeMinutes(timestamp);
        
        if (minutes < 1) {
            return 'Just now';
        } else if (minutes === 1) {
            return '1 minute';
        } else if (minutes < 60) {
            return `${minutes} minutes`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            if (hours === 1) {
                if (remainingMinutes === 0) {
                    return '1 hour';
                } else {
                    return `1 hour ${remainingMinutes} min`;
                }
            } else {
                if (remainingMinutes === 0) {
                    return `${hours} hours`;
                } else {
                    return `${hours} hours ${remainingMinutes} min`;
                }
            }
        }
    } catch (error) {
        console.error('Error formatting wait time:', error, timestamp);
        return 'Unknown';
    }
}

/**
 * Capitalize the first letter of a string
 * @param {string} string - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Update combined notifications sidebar
 */
function updateCombinedNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    const notificationCount = document.getElementById('notification-count');
    
    if (!notificationsList) return;

    let combinedNotifications = [];

    // Process chats
    escalatedChatsData.forEach(chat => {
        combinedNotifications.push({
            id: `chat-${chat.guest_id}`,
            type: 'chat',
            guestId: chat.guest_id,
            guestName: chat.guest_name || 'Guest',
            roomNumber: chat.room_number || 'Unknown',
            message: chat.last_message || 'Needs assistance',
            timestamp: chat.timestamp || chat.last_message_time || new Date(0).toISOString(), // Fallback timestamp
            status: 'pending'
        });
    });

    // Process pending room service orders
    roomServiceOrdersData.filter(order => order.status === 'pending').forEach(order => {
        const itemsText = (order.items || []).map(item => `${item.quantity || 1} x ${item.name}`).join(', ');
        combinedNotifications.push({
            id: `order-${order.id}`,
            type: 'order',
            guestId: order.guestId,
            guestName: order.guest_name || `Guest ${order.guestId}`, // Use actual name if available
            roomNumber: order.roomNumber || 'Unknown',
            message: `Order: ${itemsText}`,
            timestamp: order.timestamp || new Date(0).toISOString(),
            status: 'pending'
        });
    });

    // Process pending bookings
    bookingsData.filter(booking => booking.status === 'pending').forEach(booking => {
        let detailsName = 'Booking';
        try {
            const details = (typeof booking.details === 'string') ? JSON.parse(booking.details) : booking.details;
            if (details && details.name) {
                detailsName = details.name;
            }
        } catch (e) { console.error('Error parsing booking details for notification:', e); }
        
        combinedNotifications.push({
            id: `booking-${booking.id}`,
            type: 'booking',
            guestId: booking.guest_id,
            guestName: booking.guest_name || 'Guest',
            roomNumber: booking.room_number || 'Unknown',
            message: `Booking: ${detailsName}`,
            timestamp: booking.timestamp || new Date(0).toISOString(), // Booking might need a creation timestamp field?
            status: 'pending'
        });
    });

    // Sort combined notifications by timestamp (newest first)
    combinedNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Render notifications
    if (combinedNotifications.length === 0) {
        notificationsList.innerHTML = '<p class="text-center">No pending notifications</p>';
        if (notificationCount) notificationCount.style.display = 'none';
    } else {
        let notificationsHtml = '';
        combinedNotifications.forEach(item => {
            const waitTimeMinutes = calculateWaitTimeMinutes(item.timestamp);
            let urgencyLevel = 1;
            if (waitTimeMinutes > 10) urgencyLevel = 3;
            else if (waitTimeMinutes > 5) urgencyLevel = 2;

            let actionsHtml = '';
            if (item.type === 'chat') {
                actionsHtml = `
                    <button class="btn accept-btn" data-guest-id="${item.guestId}">Accept</button>
                    <button class="btn acknowledge-btn" data-guest-id="${item.guestId}">Dismiss</button>
                `;
            } else if (item.type === 'order') {
                 actionsHtml = `
                    <button class="btn btn-sm update-order-status" data-order-id="${item.id.replace('order-','')}" data-status="confirmed">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                `;
            } else if (item.type === 'booking') {
                actionsHtml = `
                    <button class="btn btn-sm update-booking-status" data-booking-id="${item.id.replace('booking-','')}" data-status="confirmed">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                    <button class="btn btn-sm btn-secondary update-booking-status" data-booking-id="${item.id.replace('booking-','')}" data-status="cancelled">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                `;
            }

            notificationsHtml += `
                <div class="notification-item urgency-level-${urgencyLevel}" data-type="${item.type}" data-id="${item.id}">
                    <div class="guest-info">
                        <span class="guest-name">${item.guestName}</span>
                        <span class="room-number">Room ${item.roomNumber}</span>
                    </div>
                    <p class="last-message">${item.message}</p>
                    <span class="wait-time">Waiting: ${formatWaitTime(item.timestamp)}</span>
                    <div class="notification-actions">${actionsHtml}</div>
                </div>
            `;
        });
        notificationsList.innerHTML = notificationsHtml;

        // Update count
        if (notificationCount) {
            notificationCount.textContent = combinedNotifications.length;
            notificationCount.style.display = 'inline-flex';
        }
    }
} 