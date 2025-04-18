/**
 * Room Service database operations for Inn Touch
 */
const db = require('./db');

/**
 * Save a room service order to the database
 * @param {Object} order - Room service order object
 * @param {number} order.guest_id - Guest ID
 * @param {string | object} order.order_details - Order details (JSON string or object)
 * @param {string} order.status - Order status (default: 'pending')
 * @param {string} order.timestamp - ISO timestamp (or use NOW())
 * @returns {Promise<number>} Promise resolving to the saved order ID
 */
async function saveOrder({ guest_id, order_details, status = 'pending', timestamp }) {
  if (!guest_id || !order_details) {
    throw new Error('Missing required order fields (guest_id, order_details)');
  }

  // Validate status
  if (!['pending', 'confirmed', 'delivered'].includes(status)) {
    throw new Error('Invalid status. Must be pending, confirmed, or delivered');
  }

  // Ensure order_details is a JSON string if it's an object
  const detailsString = typeof order_details === 'string' ? order_details : JSON.stringify(order_details);

  const query = `
    INSERT INTO room_service_orders (guest_id, order_details, status, timestamp)
    VALUES ($1, $2::jsonb, $3, $4::timestamptz) RETURNING id
  `; // Changed ?, added type casts, added RETURNING id
  
  // Use provided timestamp or default to NOW()
  const effectiveTimestamp = timestamp || new Date().toISOString();
  const params = [guest_id, detailsString, status, effectiveTimestamp];

  try {
    const result = await db.query(query, params); // Use db.query for RETURNING
    if (result.rows.length === 0) {
      throw new Error('Order insert did not return an ID.');
    }
    return result.rows[0].id;
  } catch (err) {
    console.error('Error saving room service order:', err);
    throw err; // Re-throw error
  }
}

/**
 * Get room service orders for a specific guest
 * @param {number} guestId - Guest ID
 * @returns {Promise<Array>} Promise resolving to array of orders
 */
async function getGuestOrders(guestId) {
  if (!guestId) {
    throw new Error('Guest ID is required');
  }

  const query = `
    SELECT id, guest_id, order_details, status, timestamp
    FROM room_service_orders
    WHERE guest_id = $1
    ORDER BY timestamp DESC
  `; // Changed ? to $1

  try {
    const rows = await db.all(query, [guestId]);
    return rows || [];
  } catch (err) {
    console.error('Error retrieving guest orders:', err);
    throw err; // Re-throw error
  }
}

/**
 * Get all room service orders
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum number of orders to retrieve (default: 50)
 * @returns {Promise<Array>} Promise resolving to array of orders
 */
async function getAllOrders(status = null, limit = 50) {
  let query = `
    SELECT o.id, o.guest_id, o.order_details, o.status, o.timestamp,
           g.name as guest_name, g.room_number
    FROM room_service_orders o
    LEFT JOIN guests g ON o.guest_id = g.id
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    query += ` WHERE o.status = $${paramIndex++}`;
    params.push(status);
  }
  
  query += ` ORDER BY o.timestamp DESC LIMIT $${paramIndex++}`;
  params.push(limit);
  
  try {
    const rows = await db.all(query, params);
    return rows || [];
  } catch (err) {
    console.error('Error retrieving all orders:', err);
    throw err; // Re-throw error
  }
}

/**
 * Update room service order status
 * @param {number} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<boolean>} Promise resolving to boolean success (true if updated)
 */
async function updateOrderStatus(orderId, status) {
  if (!orderId || !status) {
    throw new Error('Order ID and status are required');
  }
  
  // Validate status
  if (!['pending', 'confirmed', 'delivered'].includes(status)) {
    throw new Error('Invalid status. Must be pending, confirmed, or delivered');
  }
  
  const query = `
    UPDATE room_service_orders
    SET status = $1
    WHERE id = $2
  `; // Changed ? to $1, $2
  
  try {
    const rowCount = await db.run(query, [status, orderId]);
    if (rowCount === 0) {
      // Consider if throwing an error or returning false is more appropriate
      // Returning false indicates the order wasn't found or status was already set
      console.warn(`Attempted to update status for non-existent order ID: ${orderId}`);
      return false; 
    }
    return true; // Successfully updated
  } catch (err) {
    console.error('Error updating order status:', err);
    throw err; // Re-throw error
  }
}

module.exports = {
  saveOrder,
  getGuestOrders,
  getAllOrders,
  updateOrderStatus
}; 