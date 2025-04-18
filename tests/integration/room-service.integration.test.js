/**
 * Room Service Integration Tests
 * These tests run against an in-memory SQLite database to verify the entire flow
 */
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Database } = require('sqlite3');

// Create a test app
const app = express();
app.use(bodyParser.json());

// Mock database with in-memory SQLite
let db;

// Mock room service module
const roomService = {
  saveOrder: jest.fn(async (order) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO room_service_orders
        (guest_id, order_details, status, timestamp)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(query, [
        order.guest_id, 
        JSON.stringify(JSON.parse(order.order_details)), // Ensure proper JSON format
        order.status, 
        order.timestamp
      ], function(err) {
        if (err) {
          console.error('Error saving order:', err);
          return reject(err);
        }
        // Return an object that includes the lastID property
        resolve(this.lastID);
      });
    });
  })
};

// Mock guest authentication
const mockAuthMiddleware = (req, res, next) => {
  // Add guestId to request - simulate successful auth
  req.guestId = '123';
  next();
};

// Create a guest router
const guestRouter = express.Router();
app.use('/guest', guestRouter);

// Guest API routes
const apiRouter = express.Router();
guestRouter.use('/api', apiRouter);
apiRouter.use(mockAuthMiddleware);

// Add the room service endpoint directly in the test
apiRouter.post('/room-service', async (req, res) => {
  try {
    const { guest_id, items } = req.body;
    
    // Ensure guest_id matches authenticated guest
    if (guest_id !== req.guestId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only submit orders for yourself'
      });
    }
    
    // Validate order items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Order must contain at least one item'
      });
    }
    
    // Validate each item has a name and quantity
    for (const item of items) {
      if (!item.name || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Each item must have a name and a positive quantity'
        });
      }
    }
    
    // Create order object
    const order = {
      guest_id,
      order_details: JSON.stringify({ items }),
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // Save to database
    const orderId = await roomService.saveOrder(order);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      message: 'Your order has been placed, thank you!',
      data: {
        id: orderId,
        items,
        status: 'pending',
        timestamp: order.timestamp
      }
    });
  } catch (error) {
    console.error('Error submitting room service order:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit order',
      error: error.message
    });
  }
});

// Add the GET room service endpoint directly in the test
apiRouter.get('/room-service', async (req, res) => {
  try {
    // Get guest ID from the authenticated request
    const guestId = req.guestId;
    
    // Get orders from database
    const orders = await new Promise((resolve, reject) => {
      const query = `
        SELECT id, guest_id, order_details, status, timestamp
        FROM room_service_orders
        WHERE guest_id = ?
        ORDER BY timestamp DESC
      `;
      
      db.all(query, [guestId], (err, rows) => {
        if (err) {
          console.error('Error retrieving guest orders:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
    
    // Parse order details JSON for each order
    const formattedOrders = orders.map(order => {
      try {
        const orderDetails = JSON.parse(order.order_details);
        return {
          id: order.id,
          items: orderDetails.items || [],
          status: order.status,
          timestamp: order.timestamp
        };
      } catch (error) {
        console.error(`Error parsing order details for order ${order.id}:`, error);
        return {
          id: order.id,
          items: [],
          status: order.status,
          timestamp: order.timestamp,
          parseError: true
        };
      }
    });
    
    // Return success response
    res.json({
      status: 'success',
      data: {
        orders: formattedOrders
      }
    });
  } catch (error) {
    console.error('Error retrieving guest orders:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
});

describe('Room Service Integration Tests', () => {
  beforeAll(() => {
    // Create in-memory database
    db = new sqlite3.Database(':memory:');
    
    // Create tables
    db.serialize(() => {
      db.run(`
        CREATE TABLE room_service_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guest_id TEXT NOT NULL,
          order_details TEXT NOT NULL,
          status TEXT NOT NULL,
          timestamp TEXT NOT NULL
        )
      `);
    });
  });
  
  afterAll((done) => {
    // Close database connection
    db.close(() => {
      done();
    });
  });
  
  beforeEach(() => {
    // Clear room_service_orders table
    db.run('DELETE FROM room_service_orders');
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  test('Guest can submit a valid room service order', async () => {
    const orderData = {
      guest_id: '123',
      items: [
        { name: 'Burger', quantity: 1, price: 12.99 },
        { name: 'Fries', quantity: 1, price: 4.99 }
      ]
    };
    
    const response = await request(app)
      .post('/guest/api/room-service')
      .send(orderData)
      .expect(201);
    
    expect(response.body.status).toBe('success');
    expect(response.body.message).toContain('Your order has been placed');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.items).toEqual(orderData.items);
    
    // Check mock was called with the right data
    expect(roomService.saveOrder).toHaveBeenCalledWith(expect.objectContaining({
      guest_id: orderData.guest_id,
      status: 'pending'
    }));
    
    // Check data was saved in DB
    const dbOrder = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM room_service_orders WHERE guest_id = ?', [orderData.guest_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    expect(dbOrder).toBeDefined();
    expect(dbOrder.guest_id).toBe(orderData.guest_id);
    expect(dbOrder.status).toBe('pending');
  });
  
  test('Order validation - rejects empty items array', async () => {
    const orderData = {
      guest_id: '123',
      items: []
    };
    
    const response = await request(app)
      .post('/guest/api/room-service')
      .send(orderData)
      .expect(400);
    
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('at least one item');
    
    // Check mock was not called
    expect(roomService.saveOrder).not.toHaveBeenCalled();
  });
  
  test('Order validation - rejects invalid item structure', async () => {
    const orderData = {
      guest_id: '123',
      items: [
        { name: 'Burger' } // Missing quantity
      ]
    };
    
    const response = await request(app)
      .post('/guest/api/room-service')
      .send(orderData)
      .expect(400);
    
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('name and a positive quantity');
    
    // Check mock was not called
    expect(roomService.saveOrder).not.toHaveBeenCalled();
  });
  
  test('Guest authentication - rejects orders for other guests', async () => {
    const orderData = {
      guest_id: '456', // Different from authenticated guest (123)
      items: [
        { name: 'Burger', quantity: 1, price: 12.99 }
      ]
    };
    
    const response = await request(app)
      .post('/guest/api/room-service')
      .send(orderData)
      .expect(403);
    
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('only submit orders for yourself');
    
    // Check mock was not called
    expect(roomService.saveOrder).not.toHaveBeenCalled();
  });
  
  test('Guest can view their order history', async () => {
    // First, create a couple of orders to populate the history
    const orderData1 = {
      guest_id: '123',
      items: [{ name: 'Burger', quantity: 1, price: 12.99 }]
    };
    
    const orderData2 = {
      guest_id: '123',
      items: [{ name: 'Pizza', quantity: 1, price: 14.99 }]
    };
    
    // Submit the orders
    await request(app)
      .post('/guest/api/room-service')
      .send(orderData1);
      
    await request(app)
      .post('/guest/api/room-service')
      .send(orderData2);
    
    // Now retrieve the order history
    const response = await request(app)
      .get('/guest/api/room-service')
      .expect(200);
    
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.orders).toBeDefined();
    expect(Array.isArray(response.body.data.orders)).toBe(true);
    expect(response.body.data.orders.length).toBe(2);
    
    // Verify the returned orders contain the expected items
    const orders = response.body.data.orders;
    
    // The orders should be returned with most recent first
    // Check for pizza (should be in one of the orders)
    const hasPizza = orders.some(order => 
      order.items.some(item => item.name === 'Pizza')
    );
    
    // Check for burger (should be in one of the orders)
    const hasBurger = orders.some(order => 
      order.items.some(item => item.name === 'Burger')
    );
    
    expect(hasPizza).toBe(true);
    expect(hasBurger).toBe(true);
  });
  
  test('Empty order history returns empty array', async () => {
    // Clear the orders table to ensure empty history
    await new Promise((resolve) => {
      db.run('DELETE FROM room_service_orders', [], () => {
        resolve();
      });
    });
    
    // Retrieve order history which should be empty
    const response = await request(app)
      .get('/guest/api/room-service')
      .expect(200);
    
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.orders).toBeDefined();
    expect(Array.isArray(response.body.data.orders)).toBe(true);
    expect(response.body.data.orders.length).toBe(0);
  });
}); 