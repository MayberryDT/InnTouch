/**
 * Room Service API endpoint tests
 */
const supertest = require('supertest');
const app = require('../app');
const request = supertest(app);
const roomService = require('../src/database/room-service');

// Mock the database functions
jest.mock('../src/database/room-service', () => ({
  saveOrder: jest.fn().mockResolvedValue(123), // Mock order ID
  getGuestOrders: jest.fn().mockResolvedValue([
    {
      id: 1,
      guest_id: '123',
      order_details: JSON.stringify({
        items: [
          { name: 'Burger', quantity: 1, price: 12.99 },
          { name: 'Fries', quantity: 1, price: 4.99 }
        ]
      }),
      status: 'pending',
      timestamp: '2025-03-26T16:30:00Z'
    },
    {
      id: 2,
      guest_id: '123',
      order_details: JSON.stringify({
        items: [
          { name: 'Pizza', quantity: 1, price: 14.99 }
        ]
      }),
      status: 'delivered',
      timestamp: '2025-03-26T12:30:00Z'
    }
  ]),
  getAllOrders: jest.fn().mockResolvedValue([]),
  updateOrderStatus: jest.fn().mockResolvedValue(true)
}));

// Mock the guest authentication middleware
jest.mock('../src/server/middleware/guest-auth', () => ({
  requireGuestAuth: (req, res, next) => {
    // Add guest ID to request for testing
    req.guestId = '123'; // Always mock guestId as 123 for authenticated user
    
    // Check if the guest ID in the request matches the authenticated guest ID
    const requestGuestId = req.body.guest_id || req.params.guest_id;
    if (requestGuestId && requestGuestId !== req.guestId) {
      // If guest IDs don't match, return a 403 error
      return res.status(403).json({
        status: 'error',
        message: 'You can only submit orders for yourself'
      });
    }
    
    next();
  }
}));

describe('Room Service API Endpoints', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Test order submission
  test('POST /api/room-service - Guest can submit a room service order', async () => {
    const orderData = {
      guest_id: '123',
      items: [
        { name: 'Burger', quantity: 1, price: 12.99 },
        { name: 'Fries', quantity: 1, price: 4.99 }
      ]
    };
    
    const response = await request
      .post('/guest/api/room-service')
      .send(orderData)
      .expect(201);
      
    expect(response.body.status).toBe('success');
    expect(response.body.message).toContain('Your order has been placed');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(123);
    expect(response.body.data.items).toEqual(orderData.items);
    
    // Verify saveOrder was called with the right data
    expect(roomService.saveOrder).toHaveBeenCalledWith(expect.objectContaining({
      guest_id: orderData.guest_id,
      status: 'pending'
    }));
  }, 10000); // Increase timeout to 10 seconds
  
  // Test validation - missing items
  test('POST /api/room-service - Validates order has items', async () => {
    const orderData = {
      guest_id: '123',
      items: []
    };
    
    const response = await request
      .post('/guest/api/room-service')
      .send(orderData)
      .expect(400);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('at least one item');
    
    // Verify saveOrder was not called
    expect(roomService.saveOrder).not.toHaveBeenCalled();
  }, 10000);
  
  // Test validation - invalid item
  test('POST /api/room-service - Validates item structure', async () => {
    const orderData = {
      guest_id: '123',
      items: [
        { name: 'Burger' } // Missing quantity
      ]
    };
    
    const response = await request
      .post('/guest/api/room-service')
      .send(orderData)
      .expect(400);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('name and a positive quantity');
    
    // Verify saveOrder was not called
    expect(roomService.saveOrder).not.toHaveBeenCalled();
  }, 10000);
  
  // Test guest validation - trying to order for another guest
  test('POST /api/room-service - Guest cannot order for another guest', async () => {
    const orderData = {
      guest_id: '456', // Different from authenticated guest
      items: [
        { name: 'Burger', quantity: 1 }
      ]
    };
    
    const response = await request
      .post('/guest/api/room-service')
      .send(orderData)
      .expect(403);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('only submit orders for yourself');
    
    // Verify saveOrder was not called
    expect(roomService.saveOrder).not.toHaveBeenCalled();
  }, 10000);
  
  // Test retrieving guest orders
  test('GET /api/room-service - Guest can view their own order history', async () => {
    const response = await request
      .get('/guest/api/room-service')
      .expect(200);
    
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.orders).toBeDefined();
    expect(Array.isArray(response.body.data.orders)).toBe(true);
    expect(response.body.data.orders.length).toBe(2);
    
    // Check the structure of the returned orders
    const firstOrder = response.body.data.orders[0];
    expect(firstOrder.id).toBe(1);
    expect(firstOrder.status).toBe('pending');
    expect(Array.isArray(firstOrder.items)).toBe(true);
    expect(firstOrder.items.length).toBe(2);
    expect(firstOrder.items[0].name).toBe('Burger');
    
    // Verify getGuestOrders was called with the right ID
    expect(roomService.getGuestOrders).toHaveBeenCalledWith('123');
  }, 10000);
  
  // Test error handling for malformed order details
  test('GET /api/room-service - Handles malformed order details', async () => {
    // Override mock for this specific test
    roomService.getGuestOrders.mockResolvedValueOnce([
      {
        id: 3,
        guest_id: '123',
        order_details: 'not-valid-json', // Malformed JSON
        status: 'pending',
        timestamp: '2025-03-26T16:30:00Z'
      }
    ]);
    
    const response = await request
      .get('/guest/api/room-service')
      .expect(200);
    
    expect(response.body.status).toBe('success');
    expect(response.body.data.orders[0].parseError).toBe(true);
    expect(response.body.data.orders[0].items).toEqual([]);
  }, 10000);
}); 