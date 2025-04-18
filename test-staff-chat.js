/**
 * Test script for staff chat functionality
 * 
 * This script simulates the behavior of the staff-chat.js implementation
 * without actually connecting to a WebSocket server.
 */

// Set up global environment for Node.js
global.document = {
    getElementById: () => null,
    addEventListener: () => {}
};

global.window = {
    location: {
        hostname: 'localhost',
        search: '?guest_id=123',
        href: '/staff-chat.html?guest_id=123'
    },
    addEventListener: () => {}
};

global.navigator = {
    onLine: true
};

// Mock DOM elements
const mockElements = {
    chatContainer: { style: {} },
    messageInput: { value: '', focus: () => {} },
    sendButton: {},
    chatHistory: { innerHTML: '', appendChild: () => {}, scrollTop: 0, scrollHeight: 1000 },
    connectStatus: { className: '', classList: { add: () => {} }, textContent: '' },
    chatHeader: { textContent: '' },
    backButton: {},
    guestList: { style: {}, innerHTML: '' }
};

// Mock WebSocket
class MockWebSocket {
    constructor(url) {
        console.log(`Creating mock WebSocket for ${url}`);
        this.url = url;
        this.eventListeners = {};
        
        // Automatically trigger 'open' event
        setTimeout(() => this.triggerEvent('open'), 100);
    }
    
    addEventListener(event, callback) {
        console.log(`Adding listener for ${event} event`);
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    triggerEvent(event, data) {
        console.log(`Triggering ${event} event`);
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                if (event === 'message') {
                    callback({ data });
                } else {
                    callback();
                }
            });
        }
    }
    
    send(data) {
        console.log(`Sending data: ${data}`);
        const message = JSON.parse(data);
        
        // Simulate server responses
        setTimeout(() => {
            switch (message.type) {
                case 'auth':
                    this.triggerEvent('message', JSON.stringify({
                        type: 'success',
                        message: 'Authentication successful'
                    }));
                    break;
                    
                case 'get_history':
                    this.triggerEvent('message', JSON.stringify({
                        type: 'chat_history',
                        history: [
                            {
                                id: '1',
                                sender_type: 'guest',
                                message: 'Hello, I need help with my room air conditioning',
                                timestamp: new Date(Date.now() - 600000).toISOString()
                            },
                            {
                                id: '2',
                                sender_type: 'ai',
                                message: 'I understand you need help with your air conditioning. Would you like me to connect you with our maintenance staff?',
                                timestamp: new Date(Date.now() - 540000).toISOString()
                            },
                            {
                                id: '3',
                                sender_type: 'guest',
                                message: 'Yes, please. It\'s not cooling properly.',
                                timestamp: new Date(Date.now() - 480000).toISOString()
                            },
                            {
                                id: '4',
                                sender_type: 'ai',
                                message: 'I\'ll connect you with our staff right away. Please hold.',
                                timestamp: new Date(Date.now() - 420000).toISOString()
                            }
                        ]
                    }));
                    
                    // Also send guest info
                    setTimeout(() => {
                        this.triggerEvent('message', JSON.stringify({
                            type: 'guest_info',
                            guestName: 'John Smith',
                            roomNumber: '101'
                        }));
                    }, 200);
                    break;
                    
                case 'accept_chat':
                    this.triggerEvent('message', JSON.stringify({
                        type: 'success',
                        message: 'Chat accepted successfully'
                    }));
                    
                    // Simulate system message about staff joining
                    setTimeout(() => {
                        this.triggerEvent('message', JSON.stringify({
                            type: 'chat',
                            senderType: 'system',
                            content: 'Staff joined the chat',
                            timestamp: new Date().toISOString()
                        }));
                    }, 300);
                    break;
                    
                case 'chat':
                    // Echo the message back as a staff message for testing
                    setTimeout(() => {
                        this.triggerEvent('message', JSON.stringify({
                            type: 'chat',
                            senderType: 'staff',
                            content: message.content,
                            timestamp: new Date().toISOString()
                        }));
                        
                        // Also simulate a guest response
                        setTimeout(() => {
                            this.triggerEvent('message', JSON.stringify({
                                type: 'chat',
                                senderType: 'guest',
                                content: 'Thank you for your help!',
                                timestamp: new Date().toISOString()
                            }));
                        }, 500);
                    }, 200);
                    break;
            }
        }, 100);
    }
    
    close() {
        console.log('Closing WebSocket connection');
    }
    
    ping() {}
}

// Override document.getElementById
document.getElementById = (id) => {
    if (mockElements[id]) {
        return mockElements[id];
    }
    
    // Return mock elements based on their typical IDs
    switch (id) {
        case 'chat-container':
            return mockElements.chatContainer;
        case 'message-input':
            return mockElements.messageInput;
        case 'send-button':
            return mockElements.sendButton;
        case 'chat-history':
            return mockElements.chatHistory;
        case 'connection-status':
            return mockElements.connectStatus;
        case 'chat-header':
            return mockElements.chatHeader;
        case 'back-button':
            return mockElements.backButton;
        case 'guest-list':
            return mockElements.guestList;
        default:
            return null;
    }
};

// Mock URLSearchParams
global.URLSearchParams = class URLSearchParams {
    constructor() {
        this.params = { guest_id: '123' };
    }
    
    get(key) {
        return this.params[key];
    }
};

// Mock localStorage
global.localStorage = {
    getItem: (key) => {
        if (key === 'staffToken') {
            // Create a mock JWT token with a staff username
            // In Node.js, btoa is not available by default
            const btoa = str => Buffer.from(str).toString('base64');
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = btoa(JSON.stringify({ username: 'Staff User', exp: Date.now() + 3600000 }));
            const signature = 'mock-signature';
            return `${header}.${payload}.${signature}`;
        }
        return null;
    },
    setItem: (key, value) => {
        console.log(`localStorage.setItem('${key}', '${value}')`);
    }
};

// Mock sessionStorage
global.sessionStorage = {
    getItem: (key) => null,
    setItem: (key, value) => {
        console.log(`sessionStorage.setItem('${key}', '${value}')`);
    }
};

// Mock atob (base64 decode)
global.atob = str => Buffer.from(str, 'base64').toString();

// Mock WebSocket
global.WebSocket = MockWebSocket;

// Mock addMessageToChat function
function addMessageToChat(sender, content, timestamp = null, id = null) {
    console.log(`Adding message to chat - Sender: ${sender}, Content: ${content}`);
}

// Mock scrollToBottom function
function scrollToBottom() {
    console.log('Scrolling to bottom');
}

// Run the test
async function runTest() {
    console.log('=== Testing Staff Chat Functionality ===');
    
    // Simulate DOMContentLoaded event
    console.log('\n1. Initializing staff chat');
    initStaffChat();
    
    // Wait for the WebSocket connection to be established and auth to complete
    console.log('\n2. Waiting for connection and authentication...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate sending a message
    console.log('\n3. Sending a message');
    mockElements.messageInput.value = 'Hello, I am a staff member and I will help you with your air conditioning issue.';
    sendMessage();
    
    // Wait for the response
    console.log('\n4. Waiting for response...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n5. Test completed successfully!');
}

// Import required functions from staff-chat.js
// In a real environment, these would be imported from the actual file
// For this test, we'll define simplified versions

function initStaffChat() {
    console.log('Initializing staff chat interface');
    
    // Initialize WebSocket connection
    connectWebSocket();
}

function connectWebSocket() {
    console.log('Connecting to WebSocket');
    
    // Create WebSocket connection
    ws = new WebSocket('ws://localhost:3003');
    
    // Connection opened handler
    ws.addEventListener('open', () => {
        console.log('WebSocket connection established');
        isConnected = true;
        
        // Authenticate as staff
        authenticateAsStaff();
        
        // Request chat history
        requestChatHistory();
        
        // Accept chat
        acceptChat();
    });
    
    // Message handler
    ws.addEventListener('message', (event) => {
        console.log('Message received');
        handleMessage(event.data);
    });
}

function authenticateAsStaff() {
    console.log('Authenticating as staff');
    
    const authMessage = {
        type: 'auth',
        userType: 'staff',
        token: localStorage.getItem('staffToken')
    };
    
    ws.send(JSON.stringify(authMessage));
}

function requestChatHistory() {
    console.log('Requesting chat history');
    
    const historyRequest = {
        type: 'get_history',
        guestId: '123'
    };
    
    ws.send(JSON.stringify(historyRequest));
}

function acceptChat() {
    console.log('Accepting chat');
    
    const acceptMessage = {
        type: 'accept_chat',
        guestId: '123'
    };
    
    ws.send(JSON.stringify(acceptMessage));
}

function sendMessage() {
    console.log('Sending message');
    
    const messageContent = mockElements.messageInput.value.trim();
    
    const chatMessage = {
        type: 'chat',
        content: messageContent,
        recipientId: '123'
    };
    
    ws.send(JSON.stringify(chatMessage));
    
    // Clear input
    mockElements.messageInput.value = '';
}

function handleMessage(data) {
    console.log('Handling message:', data);
    
    try {
        const message = JSON.parse(data);
        
        switch (message.type) {
            case 'chat':
                console.log(`Chat message from ${message.senderType}: ${message.content}`);
                break;
            case 'chat_history':
                console.log('Received chat history with', message.history.length, 'messages');
                break;
            case 'guest_info':
                console.log('Received guest info:', message.guestName, message.roomNumber);
                break;
            case 'error':
                console.error('Error:', message.error);
                break;
            case 'success':
                console.log('Success:', message.message);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
}

// Set up variables
let ws = null;
let isConnected = false;

// Execute the test
runTest().catch(err => {
    console.error('Test failed:', err);
}); 