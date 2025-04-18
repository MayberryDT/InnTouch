/**
 * Database operations for guest feedback
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../server/config');

// Get database path from config
const dbPath = config.dbPath || path.join(__dirname, '../../hospitality.db');

/**
 * Save a new feedback entry to the database
 * @param {Object} feedback - The feedback object
 * @param {number} feedback.guest_id - The guest ID
 * @param {number} feedback.rating - The rating (1-5)
 * @param {string} feedback.comments - Optional comments
 * @param {string} feedback.timestamp - ISO timestamp
 * @returns {Promise<number>} - The ID of the inserted feedback
 */
const saveFeedback = (feedback) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.run(
      `INSERT INTO feedback (guest_id, rating, comments, timestamp) 
       VALUES (?, ?, ?, ?)`,
      [
        feedback.guest_id,
        feedback.rating,
        feedback.comments || null,
        feedback.timestamp
      ],
      function(err) {
        db.close();
        
        if (err) {
          console.error('Error saving feedback:', err);
          return reject(err);
        }
        
        resolve(this.lastID);
      }
    );
  });
};

/**
 * Get all feedback submissions for staff view with optional filtering
 * @param {Object} filters - Optional filters for feedback
 * @param {number} filters.rating - Filter by exact rating (1-5)
 * @param {number} filters.minRating - Filter by minimum rating
 * @param {number} filters.maxRating - Filter by maximum rating
 * @param {string} filters.startDate - Filter by start date (ISO string)
 * @param {string} filters.endDate - Filter by end date (ISO string)
 * @param {string} filters.sort - Sort field (timestamp, rating)
 * @param {string} filters.order - Sort order (asc, desc)
 * @returns {Promise<Array>} - Array of feedback objects
 */
const getAllFeedback = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    // Start building the query
    let query = `
      SELECT f.*, g.name, g.room_number 
      FROM feedback f
      JOIN guests g ON f.guest_id = g.id
    `;
    
    // Initialize parameters array
    const params = [];
    
    // Add WHERE clauses for filtering
    const whereConditions = [];
    
    // Filter by exact rating
    if (filters.rating !== undefined && filters.rating !== null) {
      whereConditions.push('f.rating = ?');
      params.push(filters.rating);
    }
    
    // Filter by minimum rating
    if (filters.minRating !== undefined && filters.minRating !== null) {
      whereConditions.push('f.rating >= ?');
      params.push(filters.minRating);
    }
    
    // Filter by maximum rating
    if (filters.maxRating !== undefined && filters.maxRating !== null) {
      whereConditions.push('f.rating <= ?');
      params.push(filters.maxRating);
    }
    
    // Filter by start date
    if (filters.startDate) {
      whereConditions.push('f.timestamp >= ?');
      params.push(filters.startDate);
    }
    
    // Filter by end date
    if (filters.endDate) {
      whereConditions.push('f.timestamp <= ?');
      params.push(filters.endDate);
    }
    
    // Add WHERE clause if any conditions exist
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // Add ORDER BY clause for sorting
    if (filters.sort) {
      const sortField = filters.sort === 'rating' ? 'f.rating' : 'f.timestamp';
      const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      // Default sorting by timestamp descending (newest first)
      query += ' ORDER BY f.timestamp DESC';
    }
    
    // Execute the query
    db.all(query, params, (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting feedback:', err);
        return reject(err);
      }
      
      resolve(rows);
    });
  });
};

module.exports = {
  saveFeedback,
  getAllFeedback
}; 