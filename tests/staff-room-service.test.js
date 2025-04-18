/**
 * Staff Room Service API endpoint tests
 */
const supertest = require('supertest');

// Mock the auth middleware before importing app
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
    // Mock authenticated user
    req.user = { id: 'staff123', type: 'staff', role: 'manager' };
    next();
  }
}));

// Mock the chat routes before importing app
jest.mock('../src/server/routes/chat', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/:guestId', (req, res) => {
    res.json({ message: 'Mock chat history' });
  });
  return router;
});

const app = require('../app');
const request = supertest(app);
const roomService = require('../src/database/room-service');

// Mock the room service database functions
jest.mock('../src/database/room-service');

describe('Staff Room Service API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrders = [
    {
      id: 'order1',
      guestId: 'guest1',
      roomNumber: '101',
      timestamp: new Date('2023-04-01T10:00:00Z').toISOString(),
      status: 'pending',
      orderDetails: JSON.stringify({
        items: [
          { name: 'Club Sandwich', quantity: 1, price: 12.99 }
        ],
        specialInstructions: 'No mayo'
      })
    },
    {
      id: 'order2',
      guestId: 'guest2',
      roomNumber: '102',
      timestamp: new Date('2023-04-01T11:00:00Z').toISOString(),
      status: 'confirmed',
      orderDetails: JSON.stringify({
        items: [
          { name: 'Caesar Salad', quantity: 1, price: 9.99 },
          { name: 'Sparkling Water', quantity: 2, price: 3.99 }
        ],
        specialInstructions: 'Extra dressing'
      })
    },
    {
      id: 'order3',
      guestId: 'guest3',
      roomNumber: '103',
      timestamp: new Date('2023-04-01T09:00:00Z').toISOString(),
      status: 'delivered',
      orderDetails: JSON.stringify({
        items: [
          { name: 'Breakfast Platter', quantity: 2, price: 15.99 }
        ]
      })
    },
    {
      id: 'order4',
      guestId: 'guest1',
      roomNumber: '101',
      timestamp: new Date('2023-04-01T12:00:00Z').toISOString(),
      status: 'pending',
      orderDetails: '{malformed json}'
    }
  ];

  test('GET /api/staff/room-service - should return all active orders', async () => {
    roomService.getAllOrders.mockImplementation(async (status) => {
      if (status === 'pending') {
        return mockOrders.filter(o => o.status === 'pending');
      } else if (status === 'confirmed') {
        return mockOrders.filter(o => o.status === 'confirmed');
      }
      return [];
    });

    const response = await request.get('/api/staff/room-service');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.orders.length).toBe(3); // 2 pending + 1 confirmed
    expect(response.body.count).toBe(3);
    expect(response.body.filter).toEqual(['pending', 'confirmed']);
    
    // Orders should be sorted newest first
    expect(response.body.orders[0].id).toBe('order4');
    expect(response.body.orders[1].id).toBe('order2');
    expect(response.body.orders[2].id).toBe('order1');
    
    // Check if getAllOrders was called with the correct parameters
    expect(roomService.getAllOrders).toHaveBeenCalledWith('pending');
    expect(roomService.getAllOrders).toHaveBeenCalledWith('confirmed');
  });

  test('GET /api/staff/room-service?status=delivered - should filter by status', async () => {
    roomService.getAllOrders.mockImplementation(async (status) => {
      return mockOrders.filter(o => o.status === status);
    });

    const response = await request.get('/api/staff/room-service?status=delivered');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.orders.length).toBe(1);
    expect(response.body.count).toBe(1);
    expect(response.body.filter).toEqual(['delivered']);
    expect(response.body.orders[0].id).toBe('order3');
    
    expect(roomService.getAllOrders).toHaveBeenCalledWith('delivered');
  });

  test('GET /api/staff/room-service?limit=1 - should limit number of orders', async () => {
    roomService.getAllOrders.mockImplementation(async (status) => {
      if (status === 'pending') {
        return mockOrders.filter(o => o.status === 'pending');
      } else if (status === 'confirmed') {
        return mockOrders.filter(o => o.status === 'confirmed');
      }
      return [];
    });

    const response = await request.get('/api/staff/room-service?limit=1');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.orders.length).toBe(1);
    expect(response.body.count).toBe(1);
    
    // Only the newest order should be returned (order4)
    expect(response.body.orders[0].id).toBe('order4');
  });

  test('GET /api/staff/room-service - should handle malformed order details', async () => {
    roomService.getAllOrders.mockImplementation(async (status) => {
      if (status === 'pending') {
        return mockOrders.filter(o => o.status === 'pending');
      } else {
        return [];
      }
    });

    const response = await request.get('/api/staff/room-service');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // The malformed order should still be included but with default details
    const malformedOrder = response.body.orders.find(o => o.id === 'order4');
    expect(malformedOrder).toBeDefined();
    expect(malformedOrder.orderDetails).toEqual({ items: [], error: 'Error parsing order details' });
  });

  test('GET /api/staff/room-service - should handle database errors', async () => {
    roomService.getAllOrders.mockImplementation(async () => {
      throw new Error('Database error');
    });

    const response = await request.get('/api/staff/room-service');
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Failed to retrieve orders');
  });

  test('PATCH /api/staff/room-service/:id - should update order status', async () => {
    roomService.updateOrderStatus.mockResolvedValue(true);

    const response = await request
      .patch('/api/staff/room-service/order1')
      .send({ status: 'confirmed' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Order order1 status updated to confirmed');
    expect(response.body.orderId).toBe('order1');
    expect(response.body.newStatus).toBe('confirmed');
    
    expect(roomService.updateOrderStatus).toHaveBeenCalledWith('order1', 'confirmed');
  });

  test('PATCH /api/staff/room-service/:id - should handle missing status', async () => {
    const response = await request
      .patch('/api/staff/room-service/order1')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Status is required');
    
    expect(roomService.updateOrderStatus).not.toHaveBeenCalled();
  });

  test('PATCH /api/staff/room-service/:id - should validate status value', async () => {
    const response = await request
      .patch('/api/staff/room-service/order1')
      .send({ status: 'invalid-status' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Invalid status. Must be pending, confirmed, or delivered');
    
    expect(roomService.updateOrderStatus).not.toHaveBeenCalled();
  });

  test('PATCH /api/staff/room-service/:id - should handle order not found', async () => {
    roomService.updateOrderStatus.mockRejectedValue(new Error('Order not found'));

    const response = await request
      .patch('/api/staff/room-service/nonexistent')
      .send({ status: 'confirmed' });
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Order not found');
    
    expect(roomService.updateOrderStatus).toHaveBeenCalledWith('nonexistent', 'confirmed');
  });

  test('PATCH /api/staff/room-service/:id - should handle database errors', async () => {
    roomService.updateOrderStatus.mockRejectedValue(new Error('Database error'));

    const response = await request
      .patch('/api/staff/room-service/order1')
      .send({ status: 'confirmed' });
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Failed to update order status');
    
    expect(roomService.updateOrderStatus).toHaveBeenCalledWith('order1', 'confirmed');
  });
}); 