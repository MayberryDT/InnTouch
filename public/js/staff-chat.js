/**
 * Staff Chat functionality for Inn Touch
 * Handles WebSocket communication with the server specifically for staff members
 */

// Get WebSocket URL from environment or use default
const WS_PORT = 3003; // This should match your .env WS_PORT
const WS_URL = `ws://${window.location.hostname}:${WS_PORT}`;

// Store staff token from localStorage
const staffToken = localStorage.getItem('staffToken');
// Decode token safely to get username, provide default
let staffUsername = 'Staff';
try {
    if (staffToken) {
        const payload = JSON.parse(atob(staffToken.split('.')[1] || '{}'));
        staffUsername = payload.username || staffUsername;
        // Store in localStorage as well if needed by other parts (like the nav script)
        localStorage.setItem('staffName', staffUsername);
    }
} catch (e) {
    console.error("Error decoding staff token:", e);
    // Potentially logout or handle invalid token
}

// Store guest ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const guestId = urlParams.get('guest_id');

// WebSocket connection
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimeout = null;

// Active chats (Consider if this is still needed here or just for the list)
const activeChats = new Map();

// Current selected chat (guestId from URL serves this purpose now)
// let currentGuestId = null; // Removed, use guestId directly

// Guest info
let guestInfo = {
    name: 'Guest',
    roomNumber: '000' // Default room number
};

// DOM elements
let chatContainer, messageInput, sendButton, chatHistory, connectionStatus, chatHeader;
let guestListSidebar, guestItemsContainer, guestListHeaderElem;
let startChatForm, roomNumberInput, startChatButton, startChatError;
let noChatSelectedDiv, chatAreaDiv;
let staffNameDisplay, logoutButton; // Nav elements

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initStaffChat);

/**
 * Initialize the staff chat interface
 */
function initStaffChat() {
    console.log('Initializing staff chat interface');

    // Authentication Check
    if (!staffToken) {
        console.log('No staff token found, redirecting to login.');
        window.location.href = '/staff-login.html';
        return;
    }

    // Get DOM elements
    // Nav
    staffNameDisplay = document.getElementById('staff-name-display');
    logoutButton = document.getElementById('logout-button');

    // Sidebar
    guestListSidebar = document.getElementById('guest-list-sidebar');
    startChatForm = document.getElementById('start-chat-form');
    roomNumberInput = document.getElementById('room-number-input');
    startChatButton = document.getElementById('start-chat-button');
    startChatError = document.getElementById('start-chat-error');
    guestListHeaderElem = document.getElementById('guest-list-header'); // Renamed to avoid conflict
    guestItemsContainer = document.getElementById('guest-items');

    // Chat Area
    chatContainer = document.getElementById('chat-container');
    noChatSelectedDiv = document.getElementById('no-chat-selected');
    chatAreaDiv = document.getElementById('chat-area');
    chatHeader = document.getElementById('chat-header');
    connectionStatus = document.getElementById('connection-status'); // Renamed for clarity
    chatHistory = document.getElementById('chat-history');
    messageInput = document.getElementById('message-input');
    // Use the form for submission handling
    const messageForm = document.getElementById('message-form');
    sendButton = document.getElementById('send-button'); // Keep reference if needed for enabling/disabling

    // --- Setup --- 

    // Set staff name in nav
    if (staffNameDisplay) {
        staffNameDisplay.textContent = staffUsername;
    }

    // Setup Logout Button
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutStaff);
    }

    // Setup Start Chat Form
    if (startChatForm) {
        startChatForm.addEventListener('submit', handleStartChatSubmit);
    }

    // Setup Active Chats List Click Handler
    if (guestItemsContainer) {
        // Add event listener for clicks on guest items using delegation
        guestItemsContainer.addEventListener('click', handleGuestListClick);
    }

    // Load the list of active/escalated chats
    loadEscalatedChats();

    // --- Conditional Chat Area Initialization --- 
    if (guestId) {
        console.log(`URL requests specific guest: ${guestId}. Initializing chat area and WebSocket.`);
        // Show chat area, hide placeholder
        if (noChatSelectedDiv) noChatSelectedDiv.style.display = 'none';
        if (chatAreaDiv) chatAreaDiv.style.display = 'flex'; // Use flex for proper layout

        // Initialize WebSocket connection for the specific guest
        connectWebSocket();

        // Add event listeners for sending messages (using the form submit)
        if (messageForm) {
            messageForm.addEventListener('submit', (event) => {
                event.preventDefault(); // Prevent page reload
                sendMessage();
            });
        }

        // Allow sending with Enter key in input
        if (messageInput) {
            messageInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) { // Send on Enter, allow Shift+Enter for newline
                    event.preventDefault();
                    sendMessage();
                }
            });
        }
    } else {
        console.log('No specific guest requested in URL. Displaying list and start form only.');
        // Hide chat area, show placeholder
        if (noChatSelectedDiv) noChatSelectedDiv.style.display = 'flex'; // Use flex for proper layout
        if (chatAreaDiv) chatAreaDiv.style.display = 'none';
    }

    // Setup window/document event listeners
    setupGlobalEventListeners();
}

/**
 * Handles the submission of the 'Start Chat by Room' form.
 * @param {Event} event - The form submission event.
 */
async function handleStartChatSubmit(event) {
    event.preventDefault(); // Prevent default form submission
    if (!roomNumberInput || !startChatButton || !startChatError) return;

    const roomNumber = roomNumberInput.value.trim();
    startChatError.textContent = ''; // Clear previous errors
    startChatError.style.display = 'none';

    if (!roomNumber) {
        startChatError.textContent = 'Please enter a room number.';
        startChatError.style.display = 'block';
        roomNumberInput.focus();
        return;
    }

    // ---> NEW: Check if chat already exists in the sidebar list <---
    if (guestItemsContainer) {
        const existingChatItems = guestItemsContainer.querySelectorAll('.guest-item');
        for (const item of existingChatItems) {
            const itemRoomElement = item.querySelector('.guest-room');
            // Extract room number text carefully (e.g., "Room 101" -> "101")
            const itemRoomNumber = itemRoomElement?.textContent?.replace(/Room /i, '').trim();
            const itemGuestId = item.dataset.guestId;

            if (itemRoomNumber === roomNumber && itemGuestId) {
                console.log(`Chat for room ${roomNumber} (Guest ID: ${itemGuestId}) already exists. Navigating...`);
                window.location.href = `/staff-chat.html?guest_id=${itemGuestId}`;
                return; // Stop processing, navigation will happen
            }
        }
    }
    // ---> END NEW CHECK <---

    // Disable button while processing
    startChatButton.disabled = true;
    startChatButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding Guest...';

    try {
        const guestData = await findGuestByRoomNumber(roomNumber);

        if (guestData && guestData.guest_id) {
            console.log(`Found guest ID: ${guestData.guest_id} for room ${roomNumber}. Navigating...`);
            // Navigate to the chat page for this guest
            window.location.href = `/staff-chat.html?guest_id=${guestData.guest_id}`;
        } else {
            // Handle case where API succeeded but no guest_id was returned (shouldn't happen with good API design)
            throw new Error('Guest ID not found for this room.');
        }

    } catch (error) {
        console.error(`Error starting chat for room ${roomNumber}:`, error);
        startChatError.textContent = error.message || 'Could not find an active guest in that room.';
        startChatError.style.display = 'block';
        // Re-enable button
        startChatButton.disabled = false;
        startChatButton.innerHTML = '<i class="fas fa-comments"></i> Start Chat';
    }
}

/**
 * Finds a guest's ID based on their room number.
 * Assumes an API endpoint like /api/guests/room/:roomNumber exists.
 * @param {string} roomNumber - The room number to search for.
 * @returns {Promise<Object>} - A promise that resolves with guest data (e.g., { guest_id: '...' }) or rejects.
 */
async function findGuestByRoomNumber(roomNumber) {
    console.log(`Attempting to find guest ID for room: ${roomNumber}`);
    const headers = getAuthHeaders(); // Get auth headers
    const encodedRoomNumber = encodeURIComponent(roomNumber);

    // *** Assumption: API endpoint exists at /api/guests/room/:roomNumber ***
    // This endpoint should check for *active* guests (e.g., currently checked in)
    // CORRECTED: Path needs to include the /api/staff prefix based on server setup
    const apiUrl = `/api/staff/guests/room/${encodedRoomNumber}`; 

    try {
        const response = await fetch(apiUrl, { 
            method: 'GET',
            headers: headers 
        });

        if (!response.ok) {
            let errorMsg = `Error ${response.status}`; 
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg; // Use server message if available
            } catch (e) { /* Ignore if response is not JSON */ }

            if (response.status === 404) {
                throw new Error(`No active guest found in room ${roomNumber}.`);
            } else {
                throw new Error(`Failed to fetch guest data: ${errorMsg}`);
            }
        }

        const data = await response.json();

        // Assuming the API returns { status: 'success', data: { guest_id: '...', name: '...', ... } }
        if (data.status === 'success' && data.data && data.data.guest_id) {
            return data.data; // Return the guest data object
        } else {
            throw new Error(data.message || 'Invalid response format from server.');
        }
    } catch (error) {
        console.error(`API call to ${apiUrl} failed:`, error);
        // Rethrow the error to be caught by handleStartChatSubmit
        throw error; 
    }
}

/**
 * Load escalated/active chats for the guest list sidebar
 */
async function loadEscalatedChats() {
    if (!guestListHeaderElem || !guestItemsContainer) {
        console.error("Guest list header or items container not found.");
        return;
    }

    // Show loading state
    guestListHeaderElem.textContent = 'Loading Active Chats...';
    guestItemsContainer.innerHTML = `
        <div class="loading-chats">
            <i class="fas fa-spinner fa-spin"></i> Loading...
        </div>
    `;

    try {
        const headers = getAuthHeaders();
        const response = await fetch('/api/chat/escalated', { headers: headers });

        if (!response.ok) {
            let errorBody = 'Server returned error status';
            try { errorBody = (await response.json()).message || errorBody; } catch (e) { /* ignore */ }
            throw new Error(`Failed to fetch escalated chats: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();

        if (data.status === 'success' && Array.isArray(data.data?.chats)) {
            updateGuestList(data.data.chats);
        } else {
            throw new Error(data.message || 'Invalid data format for escalated chats');
        }
    } catch (error) {
        console.error('Error loading escalated chats:', error);
        guestListHeaderElem.textContent = 'Active Chats (Error)';
        guestItemsContainer.innerHTML = `
            <div class="no-chats" style="color: var(--error-red);">
                <i class="fas fa-exclamation-circle"></i> Error loading chats.
            </div>
        `;
    }
}

/**
 * Update the guest list in the sidebar with active chats
 * @param {Array} chats - List of active/escalated chats
 */
function updateGuestList(chats) {
    if (!guestItemsContainer || !guestListHeaderElem) return;

    let html = '';

    if (chats.length === 0) {
        html = `<div class="no-chats">No active chats</div>`;
    } else {
        // Sort chats by timestamp descending (newest first)
        chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        chats.forEach(chat => {
            const waitTimeMinutes = calculateWaitTimeMinutes(chat.timestamp);
            // Determine if chat is escalated (e.g., waiting > 10 mins)
            const isEscalated = waitTimeMinutes > 10;
            const escalatedClass = isEscalated ? 'escalated' : '';
            // Check if this chat matches the currently viewed guestId
            const isActive = guestId === chat.guest_id?.toString();
            const activeClass = isActive ? 'active' : '';

            html += `
                <div class="guest-item ${escalatedClass} ${activeClass}" data-guest-id="${escapeHTML(chat.guest_id)}">
                    <div class="guest-name">${escapeHTML(chat.guest_name || 'Guest')}</div>
                    <div class="guest-room">Room ${escapeHTML(chat.room_number || 'Unknown')}</div>
                    <div class="guest-message">${escapeHTML(chat.last_message || 'No message')}</div>
                    <div class="guest-time">Waiting: ${formatWaitTime(chat.timestamp)}</div>
                </div>
            `;
        });
    }

    guestItemsContainer.innerHTML = html;
    // Update the header count
    guestListHeaderElem.textContent = `Active Chats (${chats.length})`;
}

/**
 * Handles clicks within the guest list container.
 * Navigates to the selected guest's chat.
 * @param {Event} event - The click event object
 */
function handleGuestListClick(event) {
    const guestItem = event.target.closest('.guest-item');

    if (guestItem && guestItem.dataset.guestId) {
        const clickedGuestId = guestItem.dataset.guestId;
        // Avoid unnecessary navigation if already on the page
        if (clickedGuestId !== guestId) { 
            console.log(`Guest item clicked: ${clickedGuestId}. Navigating...`);
            window.location.href = `/staff-chat.html?guest_id=${clickedGuestId}`;
        } else {
            console.log(`Guest item clicked: ${clickedGuestId}, already viewing this chat.`);
        }
    }
}

/**
 * Setup global event listeners for connectivity, visibility.
 */
function setupGlobalEventListeners() {
     window.addEventListener('online', () => {
        console.log('Browser is online, attempting to reconnect WebSocket if disconnected.');
        if (!isConnected && guestId) { // Only connect if a guest chat is active
            connectWebSocket();
        }
    });

    window.addEventListener('offline', () => {
        console.log('Browser is offline, WebSocket will likely disconnect.');
        updateConnectionStatus('Offline', 'status-offline');
    });

    // Reconnect on visibility change if needed
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !isConnected && guestId) {
            console.log('Tab is visible again, checking connection.');
            connectWebSocket();
        }
    });
}

/**
 * Connect to the WebSocket server
 */
function connectWebSocket() {
    // Only proceed if we have a guestId for this page
    if (!guestId) {
        console.log("WebSocket connection skipped: No guest ID specified for this page.");
        updateConnectionStatus('Select a Chat', 'status-offline'); // Indicate no active connection needed
        return;
    }

    try {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();

        updateConnectionStatus('Connecting...', 'status-connecting');
        console.log(`Connecting to WebSocket at ${WS_URL} for guest ${guestId}`);
        ws = new WebSocket(WS_URL);

        ws.addEventListener('open', handleWebSocketOpen);
        ws.addEventListener('message', handleWebSocketMessage);
        ws.addEventListener('close', handleWebSocketClose);
        ws.addEventListener('error', handleWebSocketError);

    } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
        updateConnectionStatus('Connection Failed', 'status-disconnected');
        scheduleReconnect(); // Attempt to reconnect even on initial error
    }
}

/** Handle WebSocket connection opening */
function handleWebSocketOpen() {
    console.log('WebSocket connection established');
    isConnected = true;
    reconnectAttempts = 0;
    updateConnectionStatus('Connected', 'status-connected');
    authenticate();
    requestChatHistory();
    acceptChat(); // Automatically accept the chat when staff opens it
}

/** Handle incoming WebSocket messages */
function handleWebSocketMessage(event) {
    console.log('Message received from server:', event.data);
    handleMessage(event.data);
}

/** Handle WebSocket connection closing */
function handleWebSocketClose(event) {
    console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
    isConnected = false;
    updateConnectionStatus('Disconnected', 'status-disconnected');
    scheduleReconnect(); // Attempt to reconnect
}

/** Handle WebSocket errors */
function handleWebSocketError(error) {
    console.error('WebSocket error:', error);
    updateConnectionStatus('Connection Error', 'status-disconnected');
    // Close event will likely follow, triggering reconnect logic
}

/** Schedule WebSocket reconnection attempts */
function scheduleReconnect() {
    if (navigator.onLine && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff up to 30s
        updateConnectionStatus(`Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`, 'status-connecting');
        console.log(`Attempting to reconnect in ${delay}ms`);
        reconnectTimeout = setTimeout(connectWebSocket, delay);
    } else if (!navigator.onLine) {
        updateConnectionStatus('Offline', 'status-offline');
    } else {
        updateConnectionStatus('Reconnect Failed', 'status-disconnected');
        console.error('Max reconnection attempts reached. Please refresh the page.');
    }
}

/**
 * Authenticate with the WebSocket server as staff
 */
function authenticate() {
    if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('Cannot authenticate: WebSocket not connected or not open.');
        return;
    }

    const authMessage = {
        type: 'auth',
        userType: 'staff',
        token: staffToken
    };

    console.log('Sending staff authentication via WebSocket');
    ws.send(JSON.stringify(authMessage));
}

/**
 * Request chat history for the current guest from the server
 */
function requestChatHistory() {
    if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('Cannot request chat history: WebSocket not connected or not open.');
        return;
    }
    if (!guestId) {
        console.warn('Cannot request chat history: No guest ID available.');
        return;
    }

    const historyRequest = {
        type: 'get_history',
        guestId: guestId
    };

    console.log(`Requesting chat history for guest ${guestId}`);
    ws.send(JSON.stringify(historyRequest));
}

/**
 * Inform the server that the staff has accepted/opened the chat
 */
function acceptChat() {
    if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('Cannot accept chat: WebSocket not connected or not open.');
        return;
    }
    if (!guestId) {
        console.warn('Cannot accept chat: No guest ID available.');
        return;
    }

    const acceptMessage = {
        type: 'accept_chat',
        guestId: guestId
    };

    console.log(`Sending 'accept_chat' for guest ${guestId}`);
    ws.send(JSON.stringify(acceptMessage));
}

/**
 * Send a chat message to the current guest
 */
function sendMessage() {
    if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('Cannot send message: WebSocket not connected or not open.');
        showErrorMessage('Not connected. Please wait or refresh.');
        return;
    }
    if (!messageInput || !messageInput.value.trim()) {
        console.warn('Cannot send message: Input is empty.');
        return;
    }
    if (!guestId) {
        console.warn('Cannot send message: No recipient guest ID.');
        showErrorMessage('Cannot send message: No active chat selected.');
        return;
    }

    const messageContent = messageInput.value.trim();

    const chatMessage = {
        type: 'chat',
        content: messageContent,
        recipientId: guestId // Server knows sender is staff from WS connection
    };

    console.log(`Sending message to guest ${guestId}: ${messageContent}`);
    ws.send(JSON.stringify(chatMessage));

    // Add message optimistically to the UI (marked as staff)
    // The server doesn't need to echo back staff messages unless confirmation is needed
    addMessageToChat('staff', messageContent, new Date().toISOString());

    // Clear input
    messageInput.value = '';
    messageInput.focus();
}

/**
 * Handle incoming WebSocket messages (parse and delegate)
 * @param {string} data - The raw message data string
 */
function handleMessage(data) {
    try {
        const message = JSON.parse(data);
        console.log('Parsed WebSocket message:', message.type, message);

        switch (message.type) {
            case 'chat': // Message from guest or potentially AI
                handleChatMessage(message);
                break;
            case 'chat_history':
                handleChatHistory(message);
                break;
            case 'guest_info': // Update guest details in the header
                handleGuestInfo(message);
                break;
            case 'error': // Error from WebSocket operation
                handleError(message);
                break;
            case 'success': // General success message from WS
                console.log('WebSocket Success:', message.message);
                // Could be used for auth confirmation, etc.
                break;
            // Add cases for 'typing_indicator', 'read_receipt', etc. if implemented
            case 'escalation_summary': // Handle updates to the active chat list
                if (message.escalatedChats && Array.isArray(message.escalatedChats)) {
                    console.log('Received escalation summary, transforming and updating guest list.');
                    // Transform the data to match the format expected by updateGuestList
                    const transformedChats = message.escalatedChats.map(chat => ({
                        guest_id: chat.guestId, // Map guestId to guest_id
                        guest_name: chat.guestName, // Map guestName to guest_name
                        room_number: chat.roomNumber, // Map roomNumber to room_number
                        // Provide defaults or attempt to find relevant info if available elsewhere
                        last_message: chat.lastMessage || 'Status update', // Use placeholder if missing
                        // Use the overall timestamp for sorting if individual ones aren't available
                        // Or use a fixed recent date if timestamp is missing entirely
                        timestamp: chat.timestamp || message.timestamp || new Date().toISOString()
                    }));
                    updateGuestList(transformedChats);
                } else {
                    console.warn('Invalid escalation_summary format received:', message);
                }
                break;
            default:
                console.warn('Unknown WebSocket message type received:', message.type);
        }
    } catch (error) {
        console.error('Error parsing WebSocket message:', error, 'Raw data:', data);
    }
}

/**
 * Handle an incoming chat message
 * @param {Object} message - The parsed chat message object
 */
function handleChatMessage(message) {
    // Ensure message is for the currently active chat
    // The server should ideally only send relevant messages, but double-check
    if (message.senderId === guestId || message.recipientId === guestId) {
         console.log('Handling chat message:', message);
         // Use senderType if provided, otherwise infer (e.g., assume guest if senderId matches guestId)
         const senderType = message.senderType || (message.senderId === guestId ? 'guest' : 'unknown');
        addMessageToChat(senderType, message.content, message.timestamp, message.id);
    } else {
        console.warn(`Received chat message for different guest (${message.senderId || 'unknown'}) while viewing ${guestId}. Ignoring.`);
        // Optionally: Update notification count or guest list for the other chat
    }
}

/**
 * Handle the chat history received from the server
 * @param {Object} message - The parsed chat history message object
 */
function handleChatHistory(message) {
    console.log(`Handling chat history for guest ${guestId}`);
    if (!chatHistory) return;

    if (!message.history || !Array.isArray(message.history)) {
        console.warn('Invalid chat history format received:', message);
        chatHistory.innerHTML = '<div class="chat-message system">Could not load chat history.</div>';
        return;
    }

    // Clear existing messages
    chatHistory.innerHTML = '';

    // Sort messages by timestamp just in case they aren't ordered
    const sortedHistory = [...message.history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Add each message
    sortedHistory.forEach(msg => {
        // Ensure sender_type is mapped correctly
        const senderType = msg.sender_type || (msg.sender_id === guestId ? 'guest' : (msg.sender_id ? 'staff' : 'system'));
        addMessageToChat(senderType, msg.message, msg.timestamp, msg.id);
    });

    // Add a system message indicating history loaded?
    // addMessageToChat('system', 'Chat history loaded.');

    // Scroll to the most recent message
    scrollToBottom();
}

/**
 * Handle guest information update (e.g., name, room number)
 * @param {Object} message - The parsed guest info message object
 */
function handleGuestInfo(message) {
    console.log('Handling guest info update:', message);

    // Update local guestInfo object
    guestInfo = {
        name: message.guestName || guestInfo.name || 'Guest',
        roomNumber: message.roomNumber || guestInfo.roomNumber || '000'
    };

    // Update chat header spans
    const guestNameSpan = document.getElementById('current-guest-name');
    const guestRoomSpan = document.getElementById('current-guest-room');

    if (guestNameSpan) guestNameSpan.textContent = escapeHTML(guestInfo.name);
    if (guestRoomSpan) guestRoomSpan.textContent = escapeHTML(guestInfo.roomNumber);

    console.log(`Updated chat header to: ${guestInfo.name} - Room ${guestInfo.roomNumber}`);

    // Potentially update sender labels on existing messages (more complex, usually not needed)
}

/**
 * Handle an error message received via WebSocket
 * @param {Object} message - The parsed error message object
 */
function handleError(message) {
    console.error('WebSocket Server Error:', message.error);
    // Show the error in the chat interface
    showErrorMessage(message.error || 'An unknown error occurred.');
}

/**
 * Add a message element to the chat history display
 * @param {string} senderType - 'guest', 'staff', 'ai', 'system', 'error'
 * @param {string} content - The message text
 * @param {string|null} timestamp - ISO timestamp string, or null for current time
 * @param {string|null} id - Optional message ID
 */
function addMessageToChat(senderType, content, timestamp = null, id = null) {
    if (!chatHistory) {
        console.warn('Chat history element not found, cannot add message.');
        return;
    }

    const messageTime = timestamp ? new Date(timestamp) : new Date();
    // Format time more simply (e.g., 10:30 AM)
    const formattedTime = messageTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    const messageElement = document.createElement('div');
    // Add base class and specific sender class
    messageElement.classList.add('chat-message', senderType.toLowerCase());
    if (id) messageElement.dataset.messageId = id;

    // Determine sender label
    const senderLabel = getSenderLabel(senderType);

    // Construct inner HTML - include sender only if not system/error
    messageElement.innerHTML = `
        ${senderType !== 'system' && senderType !== 'error' ? `<div class="message-sender">${escapeHTML(senderLabel)}</div>` : ''}
        <div class="message-content">${escapeHTML(content)}</div>
        ${senderType !== 'system' && senderType !== 'error' ? `<div class="message-time">${formattedTime}</div>` : ''}
    `;

    // Append and scroll
    chatHistory.appendChild(messageElement);
    scrollToBottom();
}

/**
 * Get a display label for the sender based on type
 * @param {string} senderType - 'guest', 'staff', 'ai', 'system', 'error'
 * @returns {string} Display label
 */
function getSenderLabel(senderType) {
    switch (senderType.toLowerCase()) {
        case 'guest': return guestInfo.name || 'Guest';
        case 'staff': return staffUsername; // Use the variable holding staff's name
        case 'ai': return 'AI Assistant';
        case 'system': return 'System';
        case 'error': return 'Error';
        default: return 'Unknown';
    }
}

/**
 * Display an error message directly within the chat history area
 * @param {string} message - The error text to display
 */
function showErrorMessage(message) {
    addMessageToChat('error', message);
}

/**
 * Update the connection status indicator in the chat header
 * @param {string} statusText - Text to display (e.g., 'Connected', 'Offline')
 * @param {string} statusClass - CSS class to apply (e.g., 'status-connected', 'status-offline')
 */
function updateConnectionStatus(statusText, statusClass) {
    if (!connectionStatus) return;

    // Remove old status classes
    connectionStatus.classList.remove('status-connected', 'status-disconnected', 'status-connecting', 'status-offline');
    // Add new class if provided
    if (statusClass) {
        connectionStatus.classList.add(statusClass);
    }

    connectionStatus.textContent = statusText;
}

/**
 * Scroll the chat history element to the bottom
 */
function scrollToBottom() {
    if (chatHistory) {
        // Use requestAnimationFrame for smoother scrolling after content update
        requestAnimationFrame(() => {
             chatHistory.scrollTop = chatHistory.scrollHeight;
        });
    }
}

/**
 * Escape HTML special characters in a string to prevent XSS.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Get authentication headers for API requests (like loading chats or finding guest)
 * @returns {Object} Headers object containing Authorization if token exists
 */
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    if (staffToken) {
        headers['Authorization'] = `Bearer ${staffToken}`;
    }
    return headers;
}

/**
 * Logs out the staff member, clears storage, and redirects.
 */
function logoutStaff() {
    console.log('Logging out staff...');
    // Clear authentication tokens/info
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffName'); // Clear stored name if used
    sessionStorage.removeItem('staffLoggedIn'); // Clear session flag if used elsewhere

    // Optional: Inform the server via WebSocket or API call
    // if (ws && isConnected) { ws.send(JSON.stringify({ type: 'logout' })); }

    // Redirect to login page
    window.location.href = '/staff-login.html';
}

// --- Utility Functions --- 

/**
 * Calculate wait time in minutes from a timestamp
 * @param {string} timestamp - ISO 8601 timestamp string
 * @returns {number} Wait time in minutes, or 0 if invalid
 */
function calculateWaitTimeMinutes(timestamp) {
    if (!timestamp) return 0;
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 0;
        const now = new Date();
        const diffMs = now - date;
        return Math.max(0, Math.floor(diffMs / (1000 * 60))); // Ensure non-negative
    } catch (e) {
        console.error("Error calculating wait time from timestamp:", timestamp, e);
        return 0;
    }
}

/**
 * Format wait time for display (e.g., "Just now", "5 mins", "1 hr 10 mins")
 * @param {string} timestamp - ISO 8601 timestamp string
 * @returns {string} Formatted wait time string
 */
function formatWaitTime(timestamp) {
    const minutes = calculateWaitTimeMinutes(timestamp);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min';
    if (minutes < 60) return `${minutes} mins`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 1) {
        return remainingMinutes === 0 ? '1 hr' : `1 hr ${remainingMinutes} min`;
    } else {
        return remainingMinutes === 0 ? `${hours} hrs` : `${hours} hrs ${remainingMinutes} min`;
    }
} 