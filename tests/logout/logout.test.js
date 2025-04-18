/**
 * Tests for the logout functionality
 */

// Mock DOM functions
const mockDocument = {
    getElementById: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn()
};

const mockWindow = {
    location: {
        href: '',
        pathname: '/',
        search: '',
        hash: ''
    },
    history: {
        replaceState: jest.fn()
    }
};

// Mock sessionStorage
const mockSessionStorage = {
    items: {
        jwt: 'test-jwt-token',
        guestId: '123',
        guestName: 'Test User',
        roomNumber: '101'
    },
    getItem: function(key) {
        return this.items[key] || null;
    },
    removeItem: function(key) {
        delete this.items[key];
    }
};

// Mocks
global.document = mockDocument;
global.window = mockWindow;
global.sessionStorage = mockSessionStorage;

describe('Logout Functionality', () => {
    let logoutLink;
    let clickEvent;
    let eventListener;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup mock element
        logoutLink = {
            addEventListener: jest.fn((event, callback) => {
                if (event === 'click') {
                    eventListener = callback;
                }
            })
        };
        
        // Setup click event
        clickEvent = {
            preventDefault: jest.fn()
        };
        
        // Setup sessionStorage
        mockSessionStorage.items = {
            jwt: 'test-jwt-token',
            guestId: '123',
            guestName: 'Test User',
            roomNumber: '101'
        };
        
        // Setup mock document.getElementById to return our button
        mockDocument.getElementById.mockImplementation((id) => {
            if (id === 'logout-link') {
                return logoutLink;
            }
            return null;
        });
    });
    
    test('Click event on logout link clears sessionStorage and redirects to login page', () => {
        // Require navigation.js (as if it would execute)
        require('../../public/js/navigation');
        
        // Verify that addEventListener was called on our element
        expect(logoutLink.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        
        // Simulate click event
        eventListener(clickEvent);
        
        // Verify that preventDefault was called
        expect(clickEvent.preventDefault).toHaveBeenCalled();
        
        // Verify that sessionStorage items were removed
        expect(mockSessionStorage.items.jwt).toBeUndefined();
        expect(mockSessionStorage.items.guestId).toBeUndefined();
        expect(mockSessionStorage.items.guestName).toBeUndefined();
        expect(mockSessionStorage.items.roomNumber).toBeUndefined();
        
        // Verify that window.location.href was set to the login page
        expect(window.location.href).toBe('/login.html');
    });
}); 