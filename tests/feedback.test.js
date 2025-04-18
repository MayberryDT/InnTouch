const request = require('supertest');
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { requireGuestAuth } = require('../src/server/middleware/guest-auth');
const { validateFeedback } = require('../src/server/middleware/validation');

// Mock dependencies
jest.mock('../src/server/middleware/guest-auth', () => ({
  requireGuestAuth: jest.fn((req, res, next) => {
    // Mock guest authentication
    req.guestId = req.body.guest_id || req.query.guest_id || req.params.guest_id;
    next();
  })
}));

// Mock the database path for testing
const mockDbPath = path.join(__dirname, 'test-hospitality.db');

jest.mock('../src/server/config', () => ({
  ...jest.requireActual('../src/server/config'),
  dbPath: mockDbPath
}));

// Create test database and tables before running tests
beforeAll(() => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(mockDbPath);
    
    db.serialize(() => {
      // Create guests table
      db.run(`
        CREATE TABLE IF NOT EXISTS guests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          room_number TEXT NOT NULL,
          check_in TEXT NOT NULL,
          check_out TEXT NOT NULL,
          cloudbeds_data TEXT
        )
      `);
      
      // Create feedback table
      db.run(`
        CREATE TABLE IF NOT EXISTS feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guest_id INTEGER NOT NULL,
          rating INTEGER NOT NULL,
          comments TEXT,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (guest_id) REFERENCES guests (id)
        )
      `);
      
      // Insert test guest
      db.run(`
        INSERT OR IGNORE INTO guests (id, name, room_number, check_in, check_out, cloudbeds_data)
        VALUES (1, 'Test Guest', '101', '2023-01-01T00:00:00Z', '2023-12-31T23:59:59Z', '{}')
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    db.close();
  });
});

// Clean up test database after tests
afterAll(() => {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    try {
      // Use sync version to ensure this completes before Jest exits
      if (fs.existsSync(mockDbPath)) {
        fs.unlinkSync(mockDbPath);
      }
      resolve();
    } catch (err) {
      console.error('Error deleting test database:', err);
      reject(err);
    }
  });
});

// Create express app for testing
const app = express();
app.use(express.json());

// Import feedback database module
const feedback = require('../src/database/feedback');

// Create feedback route
app.post('/guest/api/feedback', requireGuestAuth, validateFeedback, async (req, res) => {
  try {
    const { guest_id, rating, comments } = req.body;
    
    const feedbackData = {
      guest_id,
      rating,
      comments,
      timestamp: new Date().toISOString()
    };
    
    const feedbackId = await feedback.saveFeedback(feedbackData);
    
    res.status(201).json({
      status: 'success',
      message: 'Thank you for your feedback!',
      data: {
        id: feedbackId,
        rating,
        timestamp: feedbackData.timestamp
      }
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
});

// Create staff feedback route
app.get('/api/staff/feedback', async (req, res) => {
  try {
    // Extract filter parameters from query
    const { 
      rating, 
      minRating, 
      maxRating, 
      startDate, 
      endDate, 
      sort, 
      order 
    } = req.query;
    
    // Convert numeric filters to numbers if provided
    const filters = {};
    
    if (rating !== undefined) {
      filters.rating = parseInt(rating);
      if (isNaN(filters.rating)) {
        return res.status(400).json({
          status: 'error',
          message: 'Rating must be a number between 1 and 5'
        });
      }
    }
    
    if (minRating !== undefined) {
      filters.minRating = parseInt(minRating);
      if (isNaN(filters.minRating)) {
        return res.status(400).json({
          status: 'error',
          message: 'Minimum rating must be a number'
        });
      }
    }
    
    if (maxRating !== undefined) {
      filters.maxRating = parseInt(maxRating);
      if (isNaN(filters.maxRating)) {
        return res.status(400).json({
          status: 'error',
          message: 'Maximum rating must be a number'
        });
      }
    }
    
    // Validate date filters if provided
    if (startDate) {
      if (!isValidISODate(startDate)) {
        return res.status(400).json({
          status: 'error',
          message: 'Start date must be a valid ISO date string'
        });
      }
      filters.startDate = startDate;
    }
    
    if (endDate) {
      if (!isValidISODate(endDate)) {
        return res.status(400).json({
          status: 'error',
          message: 'End date must be a valid ISO date string'
        });
      }
      filters.endDate = endDate;
    }
    
    // Add sorting parameters if provided
    if (sort) {
      if (!['timestamp', 'rating'].includes(sort)) {
        return res.status(400).json({
          status: 'error',
          message: 'Sort parameter must be either "timestamp" or "rating"'
        });
      }
      filters.sort = sort;
    }
    
    if (order) {
      if (!['asc', 'desc'].includes(order.toLowerCase())) {
        return res.status(400).json({
          status: 'error',
          message: 'Order parameter must be either "asc" or "desc"'
        });
      }
      filters.order = order.toLowerCase();
    }
    
    // Get filtered feedback
    const allFeedback = await feedback.getAllFeedback(filters);
    
    // Calculate average rating
    const totalRating = allFeedback.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = allFeedback.length > 0 ? (totalRating / allFeedback.length).toFixed(1) : 0;
    
    // Group feedback by rating
    const ratingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    allFeedback.forEach(item => {
      ratingDistribution[item.rating]++;
    });
    
    res.json({
      status: 'success',
      data: {
        feedback: allFeedback,
        meta: {
          count: allFeedback.length,
          averageRating: parseFloat(averageRating),
          ratingDistribution
        },
        filters: Object.keys(filters).length > 0 ? filters : 'none'
      }
    });
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve feedback',
      error: error.message
    });
  }
});

// Helper function to validate ISO date strings
function isValidISODate(dateString) {
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(dateString) && 
      !/\d{4}-\d{2}-\d{2}/.test(dateString) &&
      !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

describe('Guest Feedback API', () => {
  test('Should submit feedback successfully', async () => {
    const response = await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        rating: 5,
        comments: 'Great experience!'
      });
    
    expect(response.statusCode).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('Thank you for your feedback!');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.rating).toBe(5);
  });
  
  test('Should return 400 for invalid rating', async () => {
    const response = await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        rating: 6, // Invalid rating (1-5 allowed)
        comments: 'Great experience!'
      });
    
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBe('Rating must be between 1 and 5');
  });
  
  test('Should return 400 for missing rating', async () => {
    const response = await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        comments: 'Great experience!'
      });
    
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBe('Rating is required');
  });
  
  test('Should submit feedback without comments', async () => {
    const response = await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        rating: 4
      });
    
    expect(response.statusCode).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('Thank you for your feedback!');
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.rating).toBe(4);
  });

  test('Should return 400 for non-integer rating', async () => {
    const response = await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        rating: 4.5,
        comments: 'Good but not perfect'
      });
    
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBe('Rating must be a whole number (1, 2, 3, 4, or 5)');
  });

  test('Should return 400 for non-numeric rating', async () => {
    const response = await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        rating: 'five',
        comments: 'Great experience!'
      });
    
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBe('Rating must be a number');
  });

  test('Should return 400 for comments exceeding 1000 characters', async () => {
    // Create a string longer than 1000 characters
    const longComment = 'a'.repeat(1001);
    
    const response = await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        rating: 5,
        comments: longComment
      });
    
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBe('Comments cannot exceed 1000 characters');
  });

  test('Should return 400 for comments containing HTML/scripts', async () => {
    const response = await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        rating: 5,
        comments: 'Great stay! <script>alert("XSS")</script>'
      });
    
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBe('Comments cannot contain HTML or scripts');
  });
});

describe('Staff Feedback API', () => {
  test('Should retrieve all feedback submissions with statistics', async () => {
    const response = await request(app)
      .get('/api/staff/feedback');
    
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveProperty('feedback');
    expect(Array.isArray(response.body.data.feedback)).toBe(true);
    
    // We should have at least 2 feedback items from previous tests
    expect(response.body.data.feedback.length).toBeGreaterThanOrEqual(2);
    
    // Check for statistics
    expect(response.body.data.meta).toBeDefined();
    expect(response.body.data.meta).toHaveProperty('count');
    expect(response.body.data.meta).toHaveProperty('averageRating');
    expect(response.body.data.meta).toHaveProperty('ratingDistribution');
    
    // Check the structure of a feedback item
    if (response.body.data.feedback.length > 0) {
      const feedbackItem = response.body.data.feedback[0];
      expect(feedbackItem).toHaveProperty('id');
      expect(feedbackItem).toHaveProperty('guest_id');
      expect(feedbackItem).toHaveProperty('rating');
      expect(feedbackItem).toHaveProperty('timestamp');
    }
  });
  
  test('Should filter feedback by rating', async () => {
    // First, create a feedback with a specific rating to test filtering
    await request(app)
      .post('/guest/api/feedback')
      .send({
        guest_id: 1,
        rating: 3,
        comments: 'Average experience for testing'
      });
    
    const response = await request(app)
      .get('/api/staff/feedback?rating=3');
    
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('success');
    
    // All returned items should have rating = 3
    response.body.data.feedback.forEach(item => {
      expect(item.rating).toBe(3);
    });
    
    // Check that filters are returned in response
    expect(response.body.data.filters).toHaveProperty('rating');
    expect(response.body.data.filters.rating).toBe(3);
  });
  
  test('Should filter feedback by min/max rating', async () => {
    const response = await request(app)
      .get('/api/staff/feedback?minRating=4&maxRating=5');
    
    expect(response.statusCode).toBe(200);
    
    // All returned items should have rating between 4 and 5
    response.body.data.feedback.forEach(item => {
      expect(item.rating).toBeGreaterThanOrEqual(4);
      expect(item.rating).toBeLessThanOrEqual(5);
    });
    
    // Check that filters are returned in response
    expect(response.body.data.filters).toHaveProperty('minRating');
    expect(response.body.data.filters).toHaveProperty('maxRating');
    expect(response.body.data.filters.minRating).toBe(4);
    expect(response.body.data.filters.maxRating).toBe(5);
  });
  
  test('Should sort feedback by rating in ascending order', async () => {
    const response = await request(app)
      .get('/api/staff/feedback?sort=rating&order=asc');
    
    expect(response.statusCode).toBe(200);
    
    // Check if the feedback is sorted by rating in ascending order
    const ratings = response.body.data.feedback.map(item => item.rating);
    const sortedRatings = [...ratings].sort((a, b) => a - b);
    expect(ratings).toEqual(sortedRatings);
    
    // Check that filters are returned in response
    expect(response.body.data.filters).toHaveProperty('sort');
    expect(response.body.data.filters).toHaveProperty('order');
    expect(response.body.data.filters.sort).toBe('rating');
    expect(response.body.data.filters.order).toBe('asc');
  });
  
  test('Should reject invalid filter parameters', async () => {
    const response = await request(app)
      .get('/api/staff/feedback?rating=invalid');
    
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBeDefined();
  });
}); 