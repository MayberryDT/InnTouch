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
 * @param {string} messageData.timestamp - ISO timestamp (or use NOW())
 * @returns {Promise<number>} Promise resolving to the saved message ID
 */
async function saveChatMessage({ guest_id, message, sender_type, timestamp }) {
  // Validate input
  if (!guest_id || !message || !sender_type) {
    throw new Error('Missing required chat message fields (guest_id, message, sender_type)');
  }
  if (!['guest', 'ai', 'staff'].includes(sender_type)) {
    throw new Error('Invalid sender type. Must be guest, ai, or staff');
  }

  const query = `
    INSERT INTO chat_logs (guest_id, message, sender_type, timestamp)
    VALUES ($1, $2, $3, $4::timestamptz) RETURNING id
  `; // Changed ?, added ::timestamptz, added RETURNING id
  const effectiveTimestamp = timestamp || new Date().toISOString();
  const params = [guest_id, message, sender_type, effectiveTimestamp];

  try {
    console.log(`[DEBUG-DB] Saving chat message for guest ${guest_id}: ${message.substring(0, 30)}...`);
    const result = await db.query(query, params); // Use db.query for RETURNING
    console.log(`[DEBUG-DB] Chat message saved successfully. Result:`, result);
    
    if (result && result.rows.length > 0) {
      return result.rows[0].id; // Return the generated ID
    } else {
      console.error("[DEBUG-DB] Chat message insert did not return an ID.", result);
      throw new Error('Failed to get last inserted ID after saving message.');
    }
  } catch (err) {
    console.error(`[DEBUG-DB] Error saving chat message for guest ${guest_id}:`, err);
    throw err;
  }
}

/**
 * Get chat history for a specific guest
 * @param {number} guestId - Guest ID
 * @returns {Promise<Array>} Promise resolving to array of chat messages
 */
async function getChatHistory(guestId) {
  if (!guestId) {
    throw new Error('Guest ID is required');
  }

  const query = `
    SELECT id, guest_id, message, sender_type, timestamp
    FROM chat_logs
    WHERE guest_id = $1
    ORDER BY timestamp ASC
  `; // Changed ? to $1

  try {
    console.log(`[DEBUG-DB] Getting chat history for guest ${guestId}`);
    const rows = await db.all(query, [guestId]);
    console.log(`[DEBUG-DB] Chat history query returned ${rows ? rows.length : 0} rows for guest ${guestId}`);
    return rows || [];
  } catch (err) {
    console.error(`[DEBUG-DB] Error retrieving chat history for guest ${guestId}:`, err);
    throw err; 
  }
}

/**
 * Get recent chat messages for all guests
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Array>} Promise resolving to array of chat messages
 */
async function getRecentChats(limit = 50) {
  const query = `
    SELECT c.id, c.guest_id, c.message, c.sender_type, c.timestamp,
           g.name as guest_name, g.room_number
    FROM chat_logs c
    LEFT JOIN guests g ON c.guest_id = g.id
    ORDER BY c.timestamp DESC
    LIMIT $1
  `; // Changed ? to $1
  
  try {
      const rows = await db.all(query, [limit]);
      return rows || [];
  } catch (err) {
      console.error('Error retrieving recent chats:', err);
      throw err;
  }
}

/**
 * Get escalated chats that need staff attention
 * @returns {Promise<Array>} Promise resolving to array of escalated chats
 */
async function getEscalatedChats() {
  console.log('[DEBUG-DB] getEscalatedChats called (async version)');
  
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

  console.log('[DEBUG-DB] Executing escalated chats query:', query.replace(/\s+/g, ' ').trim());

  try {
    console.log('[DEBUG-DB] Calling db.all for escalated chats...');
    const rows = await db.all(query, []); // Query has no parameters

    console.log(`[DEBUG-DB] Escalated chats query returned ${rows ? rows.length : 0} rows`);

    // Normalize the data before returning
    const normalizedChats = (rows || []).map(chat => {
      return {
        guest_id: chat.guest_id,
        guest_name: chat.guest_name || 'Guest',
        room_number: chat.room_number || 'Unknown',
        timestamp: chat.last_message_time,
        last_message: chat.last_message || 'No message'
      };
    });

    console.log(`[DEBUG-DB] Returning ${normalizedChats.length} normalized escalated chats`);
    return normalizedChats;

  } catch (err) {
    console.error('[DEBUG-DB] Error executing getEscalatedChats query:', err);
    throw err;
  }
}

module.exports = {
  saveChatMessage,
  getChatHistory,
  getRecentChats,
  getEscalatedChats
}; 