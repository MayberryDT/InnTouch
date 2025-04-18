/**
 * Chat functionality for Inn Touch
 * Handles WebSocket communication with the server
 */

// Get WebSocket URL from environment or use default
const WS_PORT = 3003; // This should match your .env WS_PORT
const WS_URL = `ws://${window.location.hostname}:${WS_PORT}`;

// Store guest ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const guestId = urlParams.get('guestId') || sessionStorage.getItem('guestId');

// WebSocket connection
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimeout = null;

// DOM elements - these will be initialized when the DOM is loaded
let chatContainer;
let messageInput;
let sendButton;
let chatHistory;
let connectStatus;
let typingIndicator = null;

/**
 * Initialize the chat interface
 */
function initChat() {
  console.log('Initializing chat interface');
  
  // Get DOM elements
  chatContainer = document.getElementById('chat-container');
  messageInput = document.getElementById('message-input');
  sendButton = document.getElementById('send-button');
  chatHistory = document.getElementById('chat-history');
  connectStatus = document.getElementById('connection-status');
  
  // Check if we have a guest ID
  if (!guestId) {
    if (chatContainer) {
      chatContainer.innerHTML = '<p class="error">No guest ID provided. Please use your unique guest link.</p>';
    }
    console.error('No guest ID provided');
    return;
  }
  
  console.log(`Guest ID: ${guestId}`);
  
  // Store the guest ID in session storage
  sessionStorage.setItem('guestId', guestId);
  
  // Initialize WebSocket connection
  connectWebSocket();
  
  // Add event listeners
  if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        sendMessage();
      }
    });
    
    // Show typing indicator as user types
    messageInput.addEventListener('input', () => {
      // Future enhancement: Send typing status to server
    });
  }
  
  // Add helper methods to quick action buttons
  setupChatButtons();
  
  // Handle window events
  window.addEventListener('online', () => {
    console.log('Browser is online, attempting to reconnect WebSocket');
    if (!isConnected) {
      connectWebSocket();
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('Browser is offline, WebSocket will disconnect');
    updateConnectionStatus('Offline - Waiting for connection');
  });
  
  // Reconnect on visibility change (when tab becomes active again)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isConnected) {
      console.log('Tab is visible again, checking connection');
      connectWebSocket();
    }
  });
}

/**
 * Set up the chat help buttons
 */
function setupChatButtons() {
  const requestEscalationButton = document.getElementById('request-escalation-button');
  const checkoutTimeButton = document.getElementById('checkout-time-button');
  const roomServiceButton = document.getElementById('room-service-button');

  if (requestEscalationButton) {
    requestEscalationButton.addEventListener('click', () => requestEscalation('Need immediate help'));
  }

  if (checkoutTimeButton) {
    checkoutTimeButton.addEventListener('click', () => addMessageToChat('guest', 'What time is checkout?'));
  }

  if (roomServiceButton) {
    roomServiceButton.addEventListener('click', () => addMessageToChat('guest', 'Can I order room service?'));
  }
  
  console.log('Chat buttons initialized with event listeners');
}

/**
 * Connect to the WebSocket server
 */
function connectWebSocket() {
  try {
    // Clear any existing reconnect timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    // Close existing connection if any
    if (ws) {
      ws.close();
    }
    
    // Update status
    updateConnectionStatus('Connecting...');
    
    console.log(`Connecting to WebSocket at ${WS_URL}`);
    
    // Create new WebSocket connection
    ws = new WebSocket(WS_URL);
    
    // Connection opened
    ws.addEventListener('open', () => {
      console.log('WebSocket connection established');
      isConnected = true;
      reconnectAttempts = 0;
      updateConnectionStatus('Connected');
      
      // Authenticate as a guest (history request moved to success handler)
      authenticate();
      
      // DO NOT Request chat history immediately
      // requestChatHistory(); 
    });
    
    // Listen for messages
    ws.addEventListener('message', (event) => {
      console.log('Message received from server');
      handleMessage(event.data);
    });
    
    // Connection closed
    ws.addEventListener('close', (event) => {
      console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      isConnected = false;
      updateConnectionStatus('Disconnected');
      
      // Try to reconnect
      if (navigator.onLine && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(2000 * reconnectAttempts, 10000); // Exponential backoff with max of 10 seconds
        updateConnectionStatus(`Reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        console.log(`Attempting to reconnect in ${delay}ms`);
        
        reconnectTimeout = setTimeout(connectWebSocket, delay);
      } else if (!navigator.onLine) {
        updateConnectionStatus('Offline - Waiting for connection');
      } else {
        updateConnectionStatus('Failed to reconnect. Please refresh the page.');
      }
    });
    
    // Connection error
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      updateConnectionStatus('Connection error');
    });
  } catch (error) {
    console.error('Failed to establish WebSocket connection:', error);
    updateConnectionStatus('Connection failed');
    
    // Try again after a delay if browser is online
    if (navigator.onLine && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(2000 * reconnectAttempts, 10000);
      reconnectTimeout = setTimeout(connectWebSocket, delay);
    }
  }
}

/**
 * Authenticate with the WebSocket server
 */
function authenticate() {
  if (!isConnected) {
    console.warn('Cannot authenticate: WebSocket not connected');
    return;
  }

  // Get the guest token from session storage
  const guestToken = sessionStorage.getItem('guestToken');

  if (!guestToken) {
    console.error('Cannot authenticate: Guest token missing from session storage. Please log in again.');
    // Optionally, redirect to login or show a persistent error
    updateConnectionStatus('Auth Error');
    addMessageToChat('error', 'Authentication failed. Please log in again.');
    // Close the WebSocket connection as we can't proceed
    if (ws) {
      ws.close(); 
    }
    return;
  }

  // Guest ID is still useful for context but token is primary for auth
  const guestId = sessionStorage.getItem('guestId'); 

  const authMessage = {
    type: 'auth',
    userType: 'guest',
    token: guestToken, // Send the token
    userId: guestId // Include guestId for potential server-side association
  };

  console.log('Sending authentication message...');
  ws.send(JSON.stringify(authMessage));
}

/**
 * Request chat history from the server
 */
function requestChatHistory() {
  if (!isConnected) {
    console.warn('Cannot request chat history: WebSocket not connected');
    return;
  }
  
  console.log('Requesting chat history...');
  
  ws.send(JSON.stringify({
    type: 'get_history',
    guestId: guestId
  }));
  
  // Show loading indicator
  addMessageToChat('system', 'Loading chat history...');
}

/**
 * Send a message via WebSocket
 */
function sendMessage() {
  if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('Cannot send message: WebSocket not connected or not open.');
    // Optionally show a user-facing error
    addMessageToChat('error', 'Connection error. Cannot send message.');
    return;
  }
  
  if (!messageInput || !messageInput.value.trim()) {
    console.warn('Cannot send message: Empty message');
    return;
  }
  
  const messageContent = messageInput.value.trim();
  
  const chatMessage = {
    type: 'chat',
    content: messageContent,
    // Staff includes recipientId, guest does not (server determines recipient)
  };
  
  console.log(`Sending message: ${messageContent}`);
  ws.send(JSON.stringify(chatMessage));
  
  // DO NOT add the message optimistically to the UI here.
  // Wait for the server to broadcast it back after saving.
  // addMessageToChat('guest', messageContent, new Date().toISOString()); 
  
  // Clear input and focus
  messageInput.value = '';
  messageInput.focus();
}

/**
 * Request escalation to staff
 * @param {string} reason - Reason for escalation
 */
function requestEscalation(reason) {
  if (!isConnected) {
    console.warn('Cannot escalate chat: WebSocket not connected');
    addMessageToChat('error', 'Unable to connect to staff: Not connected to chat server. Please try again later.');
    return;
  }
  
  console.log('Requesting escalation to staff:', reason);
  
  ws.send(JSON.stringify({
    type: 'escalate',
    reason: reason || 'Chat escalated to staff'
  }));
  
  // Add a message in the chat
  addMessageToChat('system', 'Connecting you with hotel staff. Please wait a moment...');
}

/**
 * Handle incoming WebSocket messages
 * @param {string} data - Message data
 */
function handleMessage(data) {
  try {
    const message = JSON.parse(data);
    console.log('Received message type:', message.type, 'Data:', message);
    
    // Handle different message types
    switch (message.type) {
      case 'chat':
        handleChatMessage(message);
        break;
      case 'chat_history':
        handleChatHistory(message);
        break;
      case 'staff_joined':
        handleStaffJoined(message);
        break;
      case 'guest_info':
        handleGuestInfo(message);
        break;
      case 'error':
        handleError(message);
        break;
      case 'success':
        console.log('Success message received:', message.message);
        // Check if this is the authentication success message
        if (message.message && message.message.toLowerCase().includes('authenticated')) {
          console.log('Authentication successful, now requesting chat history.');
          requestChatHistory(); 
        } else {
          // Handle other potential success messages if needed
          console.log('General success message:', message.message);
        }
        break;
      case 'typing':
        // Handle typing indicator
        handleTypingIndicator(message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('Error parsing message:', error, data);
  }
}

/**
 * Handle typing indicator messages
 * @param {Object} message - Typing indicator message
 */
function handleTypingIndicator(message) {
  // Future enhancement: Show typing indicator when someone is typing
  console.log('Typing indicator:', message);
}

/**
 * Handle chat messages
 * @param {Object} message - Chat message
 */
function handleChatMessage(message) {
  const { content, senderType, timestamp } = message;
  addMessageToChat(senderType, content, timestamp);
}

/**
 * Handle chat history
 * @param {Object} message - Chat history message { type: 'chat_history', guestId: string, history: Array }
 */
function handleChatHistory(message) {
  // Use the correct property name: 'history' instead of 'messages'
  const { history } = message; 
  
  // Clear existing chat messages
  if (chatHistory) {
    chatHistory.innerHTML = '';
  } else {
      console.error("Chat history container not found!");
      return;
  }
  
  // Check if the history array exists and is not empty
  if (!history || !Array.isArray(history) || !history.length) {
    console.log("No valid chat history found in message or history array is empty.");
    addMessageToChat('system', 'No chat history yet. Start a conversation!');
    return;
  }
  
  console.log(`Processing ${history.length} chat history messages`);
  
  // Sort messages (server already sorts, but client sort is safe)
  const sortedHistory = [...history].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
  });

  // Add messages to chat
  sortedHistory.forEach((msg, index) => {
    console.log(`Adding message ${index + 1}:`, msg);
    // Check required properties
    if (!msg || typeof msg.sender_type === 'undefined' || typeof msg.message === 'undefined') {
        console.warn(`Skipping invalid history message at index ${index}:`, msg);
        return; // Skip this message
    }
    // Pass msg.id to addMessageToChat
    addMessageToChat(msg.sender_type, msg.message, msg.timestamp, msg.id); 
  });
  
  // Scroll to bottom
  if (chatHistory) {
    // Use requestAnimationFrame for smoother scroll after DOM updates
    requestAnimationFrame(() => {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    });
  }
}

/**
 * Handle staff joining the chat
 * @param {Object} message - Staff joined message
 */
function handleStaffJoined(message) {
  const { staffName } = message;
  if (staffName) {
    addMessageToChat('system', `${staffName} from our hotel staff has joined the chat.`);
  } else {
    addMessageToChat('system', 'A staff member has joined the chat.');
  }
}

/**
 * Handle guest info message (optional, for future use or consistency)
 * @param {Object} message - The guest info message object
 */
function handleGuestInfo(message) {
    console.log('Handling guest info:', message);
    // Store guest info if needed for UI elements (e.g., displaying name)
    // Currently, chat.html doesn't display this, but we might use it later.
    // Example: Update a global variable
    // currentGuestName = message.guestName;
    // currentRoomNumber = message.roomNumber;
}

/**
 * Handle error messages
 * @param {Object} message - Error message
 */
function handleError(message) {
  console.error('Error from server:', message.message);
  // Display error in chat
  addMessageToChat('error', `Error: ${message.message}`);
}

/**
 * Add a message to the chat history
 * @param {string} sender - Sender type ('guest', 'staff', 'ai', 'system', 'error')
 * @param {string} content - Message content
 * @param {string|null} timestamp - Optional timestamp
 * @param {string} id - Optional ID for the message element
 */
function addMessageToChat(sender, content, timestamp = null, id = null) {
  if (!chatHistory) return;
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.classList.add('chat-message', sender);
  if (id) {
    messageEl.id = id;
  }
  
  // Format timestamp
  let formattedTime = '';
  if (timestamp) {
    const date = new Date(timestamp);
    formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Set message content
  messageEl.innerHTML = `
    <span class="message-sender">${getSenderLabel(sender)}</span>
    <div class="message-content">${escapeHTML(content)}</div>
    <span class="message-time">${formattedTime}</span>
  `;
  
  // Add to chat history
  chatHistory.appendChild(messageEl);
  
  // Scroll to bottom
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Get sender label for display
 * @param {string} sender - Sender type
 * @returns {string} Sender label
 */
function getSenderLabel(sender) {
  switch (sender) {
    case 'guest':
      return 'You';
    case 'staff':
      return 'Staff';
    case 'ai':
      return 'Assistant';
    case 'system':
      return 'System';
    case 'error':
      return 'Error';
    default:
      return sender;
  }
}

/**
 * Update the connection status display
 * @param {string} status - Connection status
 */
function updateConnectionStatus(status) {
  if (connectStatus) {
    connectStatus.textContent = status;
    connectStatus.className = 'status-' + status.toLowerCase().replace(/[^a-z]/g, '');
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Expose key functions for testing
window.sendMessage = sendMessage;
window.addMessageToChat = addMessageToChat;
window.handleMessage = handleMessage;
window.requestEscalation = requestEscalation;

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', initChat); 