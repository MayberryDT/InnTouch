// Initialize map
function initMap() {
    const map = L.map('map-container').setView([0, 0], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add a sample marker (replace with actual hotel location)
    L.marker([0, 0]).addTo(map)
        .bindPopup('Hotel Location')
        .openPopup();
}

// Chat functionality
class Chat {
    constructor() {
        this.messages = [];
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.messagesContainer = document.getElementById('chat-messages');
        
        this.init();
    }
    
    init() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Add welcome message
        this.addMessage('Welcome to Inn Touch! How can I help you today?', 'bot');
    }
    
    sendMessage() {
        const message = this.messageInput.value.trim();
        if (message) {
            this.addMessage(message, 'user');
            this.messageInput.value = '';
            
            // Simulate bot response (replace with actual API call)
            setTimeout(() => {
                this.addMessage('Thank you for your message. Our team will assist you shortly.', 'bot');
            }, 1000);
        }
    }
    
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    new Chat();
});

// Add some basic styles for chat messages
const style = document.createElement('style');
style.textContent = `
    .message {
        margin: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 1rem;
        max-width: 80%;
    }
    
    .user-message {
        background-color: #3498db;
        color: white;
        margin-left: auto;
    }
    
    .bot-message {
        background-color: #f0f0f0;
        color: #333;
    }
`;
document.head.appendChild(style); 