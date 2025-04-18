/**
 * Chat database operations for Inn Touch
 */
const db = require('./db');

/**
 * Save a chat message to the database using async/await
 * @param {Object} messageData - Chat message object
 * @param {number} messageData.guest_id - Guest ID
 * @param {string} messageData.message - Message content
 * @param {string} messageData.sender_type - Sender type (guest, ai, or staff)
 * @param {string} messageData.timestamp - ISO timestamp
 * @returns {Promise<number>} Promise resolving to the saved message ID
 */
async function saveChatMessage({ guest_id, message, sender_type, timestamp }) {
  // Validate input
  if (!guest_id || !message || !sender_type || !timestamp) {
    throw new Error('Missing required chat message fields');
  }
  if (!['guest', 'ai', 'staff'].includes(sender_type)) {
    throw new Error('Invalid sender type. Must be guest, ai, or staff');
  }

  const query = `
    INSERT INTO chat_logs (guest_id, message, sender_type, timestamp)
    VALUES (?, ?, ?, ?)
  `;
  const params = [guest_id, message, sender_type, timestamp];

  try {
    console.log(`[DEBUG-DB] Saving chat message for guest ${guest_id}: ${message.substring(0, 30)}...`);
    // Use the promisified db.run from db.js
    // It resolves with { lastID, changes }
    const result = await db.run(query, params); 
    console.log(`[DEBUG-DB] Chat message saved successfully. Result:`, result);
    
    if (result && typeof result.lastID !== 'undefined') {
        return result.lastID; // Return the ID of the inserted row
    } else {
        console.error("[DEBUG-DB] db.run did not return expected result object with lastID.", result);
        throw new Error('Failed to get last inserted ID after saving message.');
    }
  } catch (err) {
    console.error(`[DEBUG-DB] Error saving chat message for guest ${guest_id}:`, err);
    // Re-throw the error to be caught by the calling function (handleChatMessage)
    throw err;
  }
}

/**
 * Get chat history for a specific guest
 * @param {number} guestId - Guest ID
 * @returns {Promise<Array>} Promise resolving to array of chat messages
 */
async function getChatHistory(guestId) {
  // Use async/await with the promisified db.all from db.js
  if (!guestId) {
    // Throw error directly for async function
    throw new Error('Guest ID is required');
  }

  const query = `
    SELECT id, guest_id, message, sender_type, timestamp
    FROM chat_logs
    WHERE guest_id = ?
    ORDER BY timestamp ASC
  `;

  try {
    console.log(`[DEBUG-DB] Getting chat history for guest ${guestId}`);
    const rows = await db.all(query, [guestId]); // Await the promisified db.all
    console.log(`[DEBUG-DB] Chat history query returned ${rows ? rows.length : 0} rows for guest ${guestId}`);
    return rows || []; // Return the result directly
  } catch (err) {
    console.error(`[DEBUG-DB] Error retrieving chat history for guest ${guestId}:`, err);
    // Re-throw the error to be caught by the calling function (handleChatHistoryRequest)
    throw err; 
  }
}

/**
 * Get recent chat messages for all guests
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise} Promise resolving to array of chat messages
 */
async function getRecentChats(limit = 50) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT c.id, c.guest_id, c.message, c.sender_type, c.timestamp,
             g.name as guest_name, g.room_number
      FROM chat_logs c
      LEFT JOIN guests g ON c.guest_id = g.id
      ORDER BY c.timestamp DESC
      LIMIT ?
    `;
    
    db.all(query, [limit], (err, rows) => {
      if (err) {
        console.error('Error retrieving recent chats:', err);
        return reject(err);
      }
      
      resolve(rows || []);
    });
  });
}

/**
 * Get escalated chats that need staff attention
 * @returns {Promise<Array>} Promise resolving to array of escalated chats
 */
async function getEscalatedChats() {
  console.log('[DEBUG-DB] getEscalatedChats called');
  
  // Modify the query to join with chat_status and filter by status = 'escalated'
  const query = `
      SELECT 
        cl.guest_id, 
        g.name as guest_name, 
        g.room_number, 
        cl.message as last_message,
        cl.timestamp as last_message_time
      FROM chat_logs cl
      JOIN (
          SELECT guest_id, MAX(id) as max_id
          FROM chat_logs
          WHERE sender_type = 'guest'
          GROUP BY guest_id
      ) latest_msg ON cl.id = latest_msg.max_id
      JOIN guests g ON cl.guest_id = g.id
      -- Join with chat_status table
      JOIN chat_status cs ON cl.guest_id = cs.guest_id 
      -- Filter for chats explicitly marked as escalated
      WHERE cs.status = 'escalated' 
      ORDER BY cl.timestamp DESC;
    `;

  console.log('[DEBUG-DB] Executing MODIFIED complex query:', query.replace(/\s+/g, ' ').trim());

  try {
    // Add detailed logging before db.all
    console.log('[DEBUG-DB] Preparing to call db.all (using promisified version from db.js)...');
    if (!db || typeof db.all !== 'function') {
        console.error('[DEBUG-DB] FATAL: db object or db.all method is invalid!');
        // Throw an error instead of rejecting, as we are not inside a new Promise anymore
        throw new Error('Database connection is invalid');
    }
    console.log('[DEBUG-DB] db object appears valid. Calling await db.all now.');

    // Directly await the promisified db.all imported from db.js
    const rows = await db.all(query, []);

    // Log after await completes
    console.log('[DEBUG-DB] await db.all completed.');
    console.log(`[DEBUG-DB] Query returned ${rows ? rows.length : 0} rows`);

    if (rows && rows.length > 0) {
      console.log('[DEBUG-DB] First row from query:', JSON.stringify(rows[0]));
    } else {
      console.log('[DEBUG-DB] No rows returned from query');
    }

    // Normalize the data before returning
    const normalizedChats = (rows || []).map(chat => {
      // Removed redundant log here, already logged rows
      return {
        guest_id: chat.guest_id,
        guest_name: chat.guest_name || 'Guest',
        room_number: chat.room_number || 'Unknown',
        timestamp: chat.last_message_time,
        last_message: chat.last_message || 'No message'
      };
    });

    console.log(`[DEBUG-DB] Returning ${normalizedChats.length} normalized chats`);
    if (normalizedChats.length > 0) {
      console.log('[DEBUG-DB] First normalized chat:', JSON.stringify(normalizedChats[0]));
    }

    // Return the result directly
    return normalizedChats;

  } catch (err) {
    console.error('[DEBUG-DB] Error executing getEscalatedChats query:', err);
    // Re-throw the error to be caught by the route handler
    throw err;
  }
}

module.exports = {
  saveChatMessage,
  getChatHistory,
  getRecentChats,
  getEscalatedChats
}; 