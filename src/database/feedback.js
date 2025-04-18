/**
 * Database operations for guest feedback
 */
const db = require('./db'); // Use the shared PostgreSQL connection pool

/**
 * Save a new feedback entry to the database
 * @param {Object} feedback - The feedback object
 * @param {number} feedback.guest_id - The guest ID
 * @param {number} feedback.rating - The rating (1-5)
 * @param {string} feedback.comments - Optional comments
 * @returns {Promise<number>} - The ID of the inserted feedback (Note: pg doesn't easily return lastID like sqlite)
 */
const saveFeedback = async (feedback) => {
  const sql = `
    INSERT INTO feedback (guest_id, rating, comments, timestamp)
    VALUES ($1, $2, $3, NOW()) RETURNING id
  `; // Use NOW() for timestamp, RETURNING id
  const params = [
    feedback.guest_id,
    feedback.rating,
    feedback.comments || null,
  ];
  
  try {
    const result = await db.query(sql, params); // Use db.query to get RETURNING value
    if (result.rows.length > 0) {
        return result.rows[0].id; // Return the generated ID
    } else {
        // This case should ideally not happen with RETURNING id if insert is successful
        console.warn('Feedback insert did not return an ID.');
        return null; 
    }
  } catch (err) {
    console.error('Error saving feedback:', err);
    throw err; // Re-throw the error to be handled by the caller
  }
};

/**
 * Get all feedback submissions for staff view with optional filtering
 * @param {Object} filters - Optional filters for feedback
 * @param {number} filters.rating - Filter by exact rating (1-5)
 * @param {number} filters.minRating - Filter by minimum rating
 * @param {number} filters.maxRating - Filter by maximum rating
 * @param {string} filters.startDate - Filter by start date (ISO string or similar format)
 * @param {string} filters.endDate - Filter by end date (ISO string or similar format)
 * @param {string} filters.sort - Sort field (timestamp, rating)
 * @param {string} filters.order - Sort order (asc, desc)
 * @returns {Promise<Array>} - Array of feedback objects
 */
const getAllFeedback = async (filters = {}) => {
  // Start building the query
  let query = `
    SELECT f.*, g.name, g.room_number 
    FROM feedback f
    JOIN guests g ON f.guest_id = g.id
  `;
  
  // Initialize parameters array
  const params = [];
  let paramIndex = 1;
  
  // Add WHERE clauses for filtering
  const whereConditions = [];
  
  // Filter by exact rating
  if (filters.rating !== undefined && filters.rating !== null) {
    whereConditions.push(`f.rating = $${paramIndex++}`);
    params.push(filters.rating);
  }
  
  // Filter by minimum rating
  if (filters.minRating !== undefined && filters.minRating !== null) {
    whereConditions.push(`f.rating >= $${paramIndex++}`);
    params.push(filters.minRating);
  }
  
  // Filter by maximum rating
  if (filters.maxRating !== undefined && filters.maxRating !== null) {
    whereConditions.push(`f.rating <= $${paramIndex++}`);
    params.push(filters.maxRating);
  }
  
  // Filter by start date (assuming timestamp is TIMESTAMPTZ)
  if (filters.startDate) {
    whereConditions.push(`f.timestamp >= $${paramIndex++}`);
    params.push(filters.startDate);
  }
  
  // Filter by end date
  if (filters.endDate) {
    whereConditions.push(`f.timestamp <= $${paramIndex++}`);
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
  
  try {
    // Execute the query using the shared db module
    const rows = await db.all(query, params);
    return rows;
  } catch (err) {
    console.error('Error getting feedback:', err);
    throw err; // Re-throw error
  }
};

module.exports = {
  saveFeedback,
  getAllFeedback
}; 