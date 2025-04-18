/**
 * Room Service database operations for Inn Touch
 */
const db = require('./db');

/**
 * Save a room service order to the database
 * @param {Object} order - Room service order object
 * @param {number} order.guest_id - Guest ID
 * @param {string} order.order_details - Order details JSON string
 * @param {string} order.status - Order status (default: 'pending')
 * @param {string} order.timestamp - ISO timestamp
 * @returns {Promise} Promise resolving to the saved order ID
 */
async function saveOrder({ guest_id, order_details, status = 'pending', timestamp }) {
  return new Promise((resolve, reject) => {
    if (!guest_id || !order_details || !timestamp) {
      return reject(new Error('Missing required order fields'));
    }
    
    // Validate status
    if (!['pending', 'confirmed', 'delivered'].includes(status)) {
      return reject(new Error('Invalid status. Must be pending, confirmed, or delivered'));
    }
    
    const query = `
      INSERT INTO room_service_orders (guest_id, order_details, status, timestamp)
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [guest_id, order_details, status, timestamp])
      .then(result => {
        resolve(result.id);
      })
      .catch(err => {
        console.error('Error saving room service order:', err);
        reject(err);
      });
  });
}

/**
 * Get room service orders for a specific guest
 * @param {number} guestId - Guest ID
 * @returns {Promise} Promise resolving to array of orders
 */
async function getGuestOrders(guestId) {
  return new Promise((resolve, reject) => {
    if (!guestId) {
      return reject(new Error('Guest ID is required'));
    }
    
    const query = `
      SELECT id, guest_id, order_details, status, timestamp
      FROM room_service_orders
      WHERE guest_id = ?
      ORDER BY timestamp DESC
    `;
    
    db.all(query, [guestId])
      .then(rows => {
        resolve(rows || []);
      })
      .catch(err => {
        console.error('Error retrieving guest orders:', err);
        reject(err);
      });
  });
}

/**
 * Get all room service orders
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum number of orders to retrieve (default: 50)
 * @returns {Promise} Promise resolving to array of orders
 */
async function getAllOrders(status = null, limit = 50) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT o.id, o.guest_id, o.order_details, o.status, o.timestamp,
             g.name as guest_name, g.room_number
      FROM room_service_orders o
      LEFT JOIN guests g ON o.guest_id = g.id
    `;
    
    const params = [];
    
    if (status) {
      query += ` WHERE o.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY o.timestamp DESC LIMIT ?`;
    params.push(limit);
    
    db.all(query, params)
      .then(rows => {
        resolve(rows || []);
      })
      .catch(err => {
        console.error('Error retrieving all orders:', err);
        reject(err);
      });
  });
}

/**
 * Update room service order status
 * @param {number} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise} Promise resolving to boolean success
 */
async function updateOrderStatus(orderId, status) {
  return new Promise((resolve, reject) => {
    if (!orderId || !status) {
      return reject(new Error('Order ID and status are required'));
    }
    
    // Validate status
    if (!['pending', 'confirmed', 'delivered'].includes(status)) {
      return reject(new Error('Invalid status. Must be pending, confirmed, or delivered'));
    }
    
    const query = `
      UPDATE room_service_orders
      SET status = ?
      WHERE id = ?
    `;
    
    db.run(query, [status, orderId])
      .then(result => {
        if (result.changes === 0) {
          return reject(new Error('Order not found'));
        }
        resolve(true);
      })
      .catch(err => {
        console.error('Error updating order status:', err);
        reject(err);
      });
  });
}

module.exports = {
  saveOrder,
  getGuestOrders,
  getAllOrders,
  updateOrderStatus
}; 