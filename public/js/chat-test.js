/**
 * Test script for chat.js
 * Simulates WebSocket messages for testing chat functionality
 */

// Wait for the chat module to be initialized
document.addEventListener('DOMContentLoaded', function() {
  console.log('Chat test module loaded');
  
  setTimeout(() => {
    // Override WebSocket behavior for testing
    simulateWebSocketMessaging();
  }, 1000);
});

/**
 * Simulates WebSocket messaging for testing
 */
function simulateWebSocketMessaging() {
  // Reference to the original WebSocket constructor
  const OriginalWebSocket = window.WebSocket;
  
  // Check if we already have chat elements available
  const chatHistory = document.getElementById('chat-history');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  if (!chatHistory || !messageInput || !sendButton) {
    console.warn('Chat elements not found, skipping WebSocket simulation');
    return;
  }
  
  // Clear chat history for clean testing
  chatHistory.innerHTML = '';
  
  console.log('Simulating WebSocket for testing');
  addTestMessage('system', 'WebSocket simulation active. This is a test environment.');
  
  // Show an example of each message type
  setTimeout(() => {
    addTestMessage('ai', 'Hello! I am the Inn Touch AI assistant. How can I help you today?');
  }, 1000);
  
  setTimeout(() => {
    addTestMessage('system', 'Type a message or click one of the quick action buttons below to start a conversation.');
  }, 2000);
  
  // Simulate WebSocket events for the "Talk to Staff" button
  const staffButton = document.querySelector('.chat-help-button:nth-child(1)');
  if (staffButton) {
    const originalClick = staffButton.onclick;
    staffButton.onclick = function(event) {
      if (originalClick) originalClick.call(this, event);
      
      // Simulate staff joining after a delay
      setTimeout(() => {
        const staffJoinedEvent = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'staff_joined',
            staffName: 'Emma',
            timestamp: new Date().toISOString()
          })
        });
        handleTestMessage(staffJoinedEvent);
        
        // Simulate staff response
        setTimeout(() => {
          addTestMessage('staff', 'Hi there! This is Emma from the front desk. How may I assist you today?');
        }, 1500);
      }, 2000);
    };
  }
  
  // Handle user sending messages
  if (sendButton) {
    const originalClick = sendButton.onclick;
    sendButton.onclick = function(event) {
      const message = messageInput.value.trim();
      if (!message) return;
      
      // Call the original click handler if present
      if (typeof window.sendMessage === 'function') {
        window.sendMessage();
      } else if (originalClick) {
        originalClick.call(this, event);
      }
      
      // Simulate AI or staff response based on context
      simulateResponse(message);
    };
  }
  
  // Also handle Enter key in the input field
  if (messageInput) {
    messageInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        const message = this.value.trim();
        if (!message) return;
        
        // Simulate response after a delay
        setTimeout(() => {
          simulateResponse(message);
        }, 1000);
      }
    });
  }
}

/**
 * Simulate a response to a user message
 * @param {string} userMessage - The message from the user
 */
function simulateResponse(userMessage) {
  // Different responses based on message content
  const lowerMessage = userMessage.toLowerCase();
  
  setTimeout(() => {
    // Simulate typing indicator
    addTestMessage('system', '...');
    
    setTimeout(() => {
      // Remove typing indicator
      const typingIndicator = document.querySelector('.chat-message.system:last-child');
      if (typingIndicator && typingIndicator.querySelector('.message-content').textContent === '...') {
        typingIndicator.remove();
      }
      
      // Determine appropriate response
      if (lowerMessage.includes('checkout') || lowerMessage.includes('check out')) {
        addTestMessage('ai', 'Checkout time is at 11:00 AM. If you need a late checkout, please let us know and we\'ll do our best to accommodate your request.');
      }
      else if (lowerMessage.includes('breakfast') || lowerMessage.includes('food')) {
        addTestMessage('ai', 'Breakfast is served from 7:00 AM to 10:30 AM in the main dining room. We offer a full buffet with both continental and hot options.');
      }
      else if (lowerMessage.includes('wifi') || lowerMessage.includes('internet') || lowerMessage.includes('password')) {
        addTestMessage('ai', 'Our WiFi network name is "InnTouch-Guest" and the password is provided in your room key card holder. If you need assistance, I can have someone bring you a new key card holder.');
      }
      else if (lowerMessage.includes('staff') || lowerMessage.includes('speak') || lowerMessage.includes('human')) {
        // Simulate escalation to staff
        addTestMessage('system', 'Connecting you with hotel staff. Please wait a moment...');
        
        setTimeout(() => {
          addTestMessage('staff', 'Hello, this is Jason from the front desk. How can I assist you today?');
        }, 2000);
      }
      else {
        // Generic AI response
        addTestMessage('ai', 'Thank you for your message. Is there anything specific you would like to know about our hotel services?');
      }
    }, 1500);
  }, 500);
}

/**
 * Add a test message to the chat history
 * @param {string} sender - Sender type (guest, staff, ai, system)
 * @param {string} content - Message content 
 */
function addTestMessage(sender, content) {
  if (typeof window.addMessageToChat === 'function') {
    window.addMessageToChat(sender, content);
  } else {
    // Fallback implementation if the main function is not available
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const messageEl = document.createElement('div');
    messageEl.classList.add('chat-message', sender);
    
    let senderLabel = sender;
    switch (sender) {
      case 'guest': senderLabel = 'You'; break;
      case 'staff': senderLabel = 'Staff'; break;
      case 'ai': senderLabel = 'Assistant'; break;
      case 'system': senderLabel = 'System'; break;
    }
    
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageEl.innerHTML = `
      <span class="message-sender">${senderLabel}</span>
      <span class="message-time">${formattedTime}</span>
      <div class="message-content">${content}</div>
    `;
    
    chatHistory.appendChild(messageEl);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

/**
 * Handle a test WebSocket message event 
 * @param {MessageEvent} event - Message event
 */
function handleTestMessage(event) {
  if (typeof window.handleMessage === 'function') {
    window.handleMessage(event.data);
  }
}

/**
 * Test script for chat UI message differentiation
 * This script is for development/testing only
 */

// Wait for the DOM to be loaded
document.addEventListener('DOMContentLoaded', function() {
  // Only run tests if we're in a test environment (check URL)
  if (window.location.search.includes('test=true')) {
    console.log('Running chat UI tests...');
    setTimeout(runChatTests, 1000); // Wait for chat to initialize
  }
});

/**
 * Run tests to verify message differentiation
 */
function runChatTests() {
  const chatHistory = document.getElementById('chat-history');
  if (!chatHistory) {
    console.error('Chat history element not found');
    return;
  }
  
  // Clear the chat history
  chatHistory.innerHTML = '';
  
  // Add test messages for each sender type
  addMessageToChat('system', 'Starting chat UI test...');
  
  setTimeout(() => {
    addMessageToChat('guest', 'Hello, I need help with my room service order.');
  }, 500);
  
  setTimeout(() => {
    addMessageToChat('ai', "I'd be happy to help you with your room service order. What would you like to know?");
  }, 1000);
  
  setTimeout(() => {
    addMessageToChat('guest', "I ordered a burger 30 minutes ago but it hasn't arrived yet.");
  }, 1500);
  
  setTimeout(() => {
    addMessageToChat('ai', "I understand you're waiting for your room service order. Let me check on this for you. Would you like me to contact the staff?");
  }, 2000);
  
  setTimeout(() => {
    addMessageToChat('guest', 'Yes, please contact the staff.');
  }, 2500);
  
  setTimeout(() => {
    addMessageToChat('system', 'Connecting you with a staff member...');
  }, 3000);
  
  setTimeout(() => {
    addMessageToChat('staff', "Hello, this is Maria from the front desk. I apologize for the delay with your order. I've checked with the kitchen and your burger is being prepared now. It should arrive in about 5 minutes.");
  }, 4000);
  
  setTimeout(() => {
    addMessageToChat('guest', 'Thank you for checking. I appreciate it.');
  }, 4500);
  
  setTimeout(() => {
    addMessageToChat('error', 'Network connection interrupted. Reconnecting...');
  }, 5000);
  
  setTimeout(() => {
    addMessageToChat('system', 'Connection restored.');
  }, 5500);
  
  setTimeout(() => {
    console.log('Chat UI tests completed.');
  }, 6000);
} 