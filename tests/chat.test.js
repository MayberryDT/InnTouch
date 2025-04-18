/**
 * Chat API endpoint tests
 */
const supertest = require('supertest');

// Mock auth middleware before app import
jest.mock('../src/server/middleware/auth', () => ({
  configurePassport: jest.fn(() => ({
    initialize: jest.fn(() => (req, res, next) => next()),
    authenticate: jest.fn(() => (req, res, next) => next())
  })),
  authenticateStaff: (req, res, next) => {
    // Mock authenticated staff member
    req.user = { id: 'staff123', type: 'staff', role: 'manager' };
    next();
  },
  authenticateRequest: (req, res, next) => {
    const guestId = req.params.guestId;
    const authHeader = req.headers.authorization;
    
    // If Authorization header exists, treat as staff
    if (authHeader && authHeader.startsWith('Bearer ')) {
      req.user = { id: 'staff123', type: 'staff', role: 'manager' };
    } 
    // Otherwise check for guestId param (guest auth)
    else if (guestId) {
      // If guestId header is set, use that as the authenticated guest
      const requestingGuestId = req.headers.guestid || guestId;
      req.user = { id: requestingGuestId, type: 'guest' };
    } else {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    next();
  }
}));

// Mock database functions
jest.mock('../src/database/chat', () => ({
  getChatHistory: jest.fn().mockResolvedValue([
    { id: '1', message: 'Hello', sender_type: 'guest', timestamp: new Date().toISOString() },
    { id: '2', message: 'How can I help?', sender_type: 'ai', timestamp: new Date().toISOString() }
  ]),
  getRecentChats: jest.fn().mockResolvedValue([
    { guest_id: '123', guest_name: 'John Doe', last_message: 'Hello', timestamp: new Date().toISOString() },
    { guest_id: '456', guest_name: 'Jane Smith', last_message: 'Help', timestamp: new Date().toISOString() }
  ]),
  getEscalatedChats: jest.fn().mockResolvedValue([
    { guest_id: '789', guest_name: 'Bob Johnson', last_message: 'Urgent', timestamp: new Date().toISOString() }
  ]),
  saveChatMessage: jest.fn().mockResolvedValue('msg123')
}));

const app = require('../app');
const request = supertest(app);

describe('Chat API Endpoints', () => {
  // Test getting chat history as a guest
  test('GET /api/chat/:guestId - Guest can view their own chat history', async () => {
    const guestId = '123'; // Use a test guest ID
    
    const response = await request.get(`/api/chat/${guestId}`);
      
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.guestId).toBe(guestId);
    expect(Array.isArray(response.body.data.messages)).toBe(true);
  }, 10000); // Increase timeout to 10 seconds
  
  // Test getting chat history with an invalid guest ID
  test('GET /api/chat/:guestId - Guest cannot view another guest chat history', async () => {
    const ownGuestId = '123'; // The guest making the request
    const otherGuestId = '456'; // Another guest's ID
    
    // Try to access another guest's chat history
    const response = await request.get(`/api/chat/${otherGuestId}`)
      .set('guestId', ownGuestId); // Set the requesting guest's ID
      
    expect(response.status).toBe(403);
    expect(response.body.status).toBe('error');
  }, 10000); // Increase timeout to 10 seconds
  
  // Test getting chat history as staff with JWT
  test('GET /api/chat/:guestId - Staff can view any guest chat history', async () => {
    const guestId = '123'; // Any guest ID
    const token = 'YOUR_JWT_TOKEN'; // This should be a valid JWT for testing
    
    const response = await request.get(`/api/chat/${guestId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.guestId).toBe(guestId);
    expect(Array.isArray(response.body.data.messages)).toBe(true);
  });
  
  // Test getting recent chats as staff
  test('GET /api/chat/recent - Staff can view recent chats', async () => {
    const token = 'YOUR_JWT_TOKEN'; // This should be a valid JWT for testing
    
    const response = await request.get('/api/chat/recent')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data.chats)).toBe(true);
  });
  
  // Test getting escalated chats as staff
  test('GET /api/chat/escalated - Staff can view escalated chats', async () => {
    const token = 'YOUR_JWT_TOKEN'; // This should be a valid JWT for testing
    
    const response = await request.get('/api/chat/escalated')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data.chats)).toBe(true);
  });
}); 