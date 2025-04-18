/**
 * Chat status database operations for Inn Touch
 * Manages the escalation status of chat conversations
 */
const db = require('./db');

/**
 * Create or update a chat status record using async/await
 * @param {Object} statusData - Chat status data object
 * @param {number} statusData.guest_id - Guest ID
 * @param {string} statusData.status - Chat status (active, escalated, closed)
 * @param {number} statusData.message_count - Number of messages in the conversation
 * @param {string} statusData.assigned_staff_id - ID of assigned staff member (optional)
 * @param {string} [statusData.last_updated] - Optional timestamp, defaults to now
 * @returns {Promise<number>} Promise resolving to the status ID (existing or new)
 */
async function updateChatStatus({ guest_id, status, message_count, assigned_staff_id, last_updated }) {
  // Validation
  if (!guest_id) {
    throw new Error('Guest ID is required');
  }
  if (!['active', 'escalated', 'closed'].includes(status)) {
    throw new Error('Invalid status. Must be active, escalated, or closed');
  }
  
  // Use provided timestamp or default to now
  const timestamp = last_updated || new Date().toISOString(); 
  // Ensure message_count is a number, default to 0 if undefined
  const count = typeof message_count === 'number' ? message_count : 0;
  
  try {
    console.log(`[DEBUG-DB updateChatStatus] Checking for existing status for guest ${guest_id}`);
    const existingStatus = await db.get(
      'SELECT id FROM chat_status WHERE guest_id = $1',
      [guest_id]
    );
    console.log(`[DEBUG-DB updateChatStatus] Existing status:`, existingStatus);
    
    if (existingStatus) {
      console.log(`[DEBUG-DB updateChatStatus] Updating existing record ID: ${existingStatus.id}`);
      const query = `
        UPDATE chat_status 
        SET status = $1, 
            message_count = $2, 
            last_updated = $3::timestamptz,
            assigned_staff_id = $4
        WHERE guest_id = $5
      `;
      const params = [
        status,
        count,
        timestamp,
        assigned_staff_id || null,
        guest_id
      ];
      await db.run(query, params);
      console.log(`[DEBUG-DB updateChatStatus] Record updated successfully.`);
      return existingStatus.id;
    } else {
      console.log(`[DEBUG-DB updateChatStatus] Creating new record for guest ${guest_id}`);
      const query = `
        INSERT INTO chat_status 
        (guest_id, status, message_count, last_updated, assigned_staff_id)
        VALUES ($1, $2, $3, $4::timestamptz, $5) RETURNING id
      `;
      const params = [
        guest_id,
        status,
        count,
        timestamp,
        assigned_staff_id || null
      ];
      const result = await db.query(query, params);
      console.log(`[DEBUG-DB updateChatStatus] New record created. Result:`, result);
      if (result && result.rows.length > 0) {
        return result.rows[0].id;
      } else {
        console.error("[DEBUG-DB updateChatStatus] Insert query did not return an ID.", result);
        throw new Error('Failed to get last inserted ID after creating status record.');
      }
    }
  } catch (error) {
    console.error(`[DEBUG-DB updateChatStatus] Error updating chat status for guest ${guest_id}:`, error);
    throw error; // Re-throw
  }
}

/**
 * Get chat status for a specific guest using async/await
 * @param {number} guestId - Guest ID
 * @returns {Promise<Object>} Promise resolving to chat status object (or default)
 */
async function getChatStatus(guestId) {
  if (!guestId) {
    throw new Error('Guest ID is required');
  }

  const query = `
    SELECT id, guest_id, status, message_count, last_updated, assigned_staff_id
    FROM chat_status
    WHERE guest_id = $1
  `;

  try {
    console.log(`[DEBUG-DB] Getting chat status for guest ${guestId}`);
    // Use promisified db.get
    const row = await db.get(query, [guestId]);
    console.log(`[DEBUG-DB] Chat status query returned:`, row);

    if (!row) {
      // If no status exists yet, return a default active status
      console.log(`[DEBUG-DB] No status found for guest ${guestId}, returning default.`);
      return {
        guest_id: guestId,
        status: 'active',
        message_count: 0,
        last_updated: new Date().toISOString(),
        assigned_staff_id: null
      };
    }
    
    return row; // Return the found row directly

  } catch (err) {
    console.error(`[DEBUG-DB] Error retrieving chat status for guest ${guestId}:`, err);
    // Re-throw error to be caught by calling function (handleChatMessage)
    throw err;
  }
}

/**
 * Get all escalated chats using async/await
 * @returns {Promise<Array>} Promise resolving to array of escalated chat statuses with guest info
 */
async function getEscalatedChats() {
  console.log('[DEBUG-DB] Getting escalated chats (async version)');
  const query = `
    SELECT cs.id, cs.guest_id, cs.status, cs.message_count, cs.last_updated, cs.assigned_staff_id,
           g.name as guest_name, g.room_number
    FROM chat_status cs
    JOIN guests g ON cs.guest_id = g.id
    WHERE cs.status = 'escalated'
    ORDER BY cs.last_updated DESC
  `;
  
  try {
    const rows = await db.all(query, []);
    console.log(`[DEBUG-DB] Escalated chats query returned ${rows ? rows.length : 0} rows`);
    return rows || [];
  } catch (err) {
    console.error('[DEBUG-DB] Error retrieving escalated chats:', err);
    throw err; // Re-throw
  }
}

/**
 * Check if a chat is escalated
 * @param {number} guestId - Guest ID
 * @returns {Promise<boolean>} Promise resolving to true if chat is escalated
 */
async function isChatEscalated(guestId) {
  try {
    const status = await getChatStatus(guestId);
    return status.status === 'escalated';
  } catch (error) {
    console.error('Error checking if chat is escalated:', error);
    return false;
  }
}

/**
 * Increment message count for a guest
 * @param {number} guestId - Guest ID
 * @returns {Promise<number>} Promise resolving to new message count
 */
async function incrementMessageCount(guestId) {
  try {
    const status = await getChatStatus(guestId);
    const newCount = (status.message_count || 0) + 1;
    
    await updateChatStatus({
      guest_id: guestId,
      status: status.status,
      message_count: newCount,
      assigned_staff_id: status.assigned_staff_id
    });
    
    return newCount;
  } catch (error) {
    console.error('Error incrementing message count:', error);
    throw error;
  }
}

/**
 * Assign a staff member to an escalated chat
 * @param {number} guestId - Guest ID
 * @param {string} staffId - Staff ID
 * @returns {Promise} Promise resolving when assignment is complete
 */
async function assignStaffToChat(guestId, staffId) {
  try {
    const status = await getChatStatus(guestId);
    
    if (status.status !== 'escalated') {
      // Auto-escalate if not already escalated
      status.status = 'escalated';
    }
    
    await updateChatStatus({
      guest_id: guestId,
      status: status.status,
      message_count: status.message_count,
      assigned_staff_id: staffId
    });
    
    return true;
  } catch (error) {
    console.error('Error assigning staff to chat:', error);
    throw error;
  }
}

/**
 * Reset chat status to active (de-escalate)
 * @param {number} guestId - Guest ID
 * @returns {Promise} Promise resolving when reset is complete
 */
async function resetChatStatus(guestId) {
  try {
    await updateChatStatus({
      guest_id: guestId,
      status: 'active',
      message_count: 0,
      assigned_staff_id: null
    });
    
    return true;
  } catch (error) {
    console.error('Error resetting chat status:', error);
    throw error;
  }
}

/**
 * Mark a chat as acknowledged, typically removing it from the escalated list
 * @param {number} guestId - Guest ID
 * @returns {Promise<boolean>} Promise resolving to true if status was updated
 */
async function markChatAcknowledged(guestId) {
  if (!guestId) {
    throw new Error('Guest ID is required for acknowledging chat');
  }
  try {
    console.log(`[DEBUG-DB] Marking chat acknowledged for guest ${guestId}`);
    const query = 'UPDATE chat_status SET status = $1, assigned_staff_id = NULL WHERE guest_id = $2';
    const result = await db.run(
      query,
      ['closed', guestId]
    );
    console.log(`[DEBUG-DB] Acknowledgment result for guest ${guestId}:`, result);
    return result > 0;
  } catch (error) {
    console.error(`[DEBUG-DB] Error marking chat acknowledged for guest ${guestId}:`, error);
    throw error;
  }
}

module.exports = {
  updateChatStatus,
  getChatStatus,
  getEscalatedChats,
  isChatEscalated,
  incrementMessageCount,
  assignStaffToChat,
  resetChatStatus,
  markChatAcknowledged
}; 