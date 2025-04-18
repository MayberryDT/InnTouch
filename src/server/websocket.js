/**
 * WebSocket Server for Inn Touch
 * Handles real-time communication between guests and staff
 */
const WebSocket = require('ws');
const config = require('./config');
const chatDb = require('../database/chat');
const chatStatusDb = require('../database/chat-status');
const aiChat = require('./utils/ai-chat');
const path = require('path'); // Require the path module
const jwt = require('jsonwebtoken'); // Require jsonwebtoken

// Use the correct relative path within the same directory level
// Note: We don't actually need the auth middleware file itself here anymore
// const auth = require('./middleware/auth.js');

// Mapping of client connections
const clients = {
  // Structure:
  // guest_1: {connection: WebSocket, lastActive: Date},
  // staff_1: {connection: WebSocket, lastActive: Date}
};

// Staff members online
const onlineStaff = new Set();

// Track notification status for escalated chats
const notificationStatus = {
  // Structure:
  // guestId: { lastNotified: timestamp, notificationCount: number, acknowledged: boolean }
};

/**
 * Initialize WebSocket server
 * @returns {WebSocket.Server} The WebSocket server instance
 */
function initWebSocketServer() {
  const wss = new WebSocket.Server({ port: config.wsPort });
  
  wss.on('connection', (ws, req) => {
    console.log(`WebSocket connection established from ${req.socket.remoteAddress}`);
    
    // Initial state for the connection
    ws.isAlive = true;
    ws.userType = null; // Either 'guest' or 'staff'
    ws.userId = null;
    
    // Handle pings to keep connection alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle incoming messages
    ws.on('message', (message) => handleMessage(ws, message));
    
    // Handle disconnection
    ws.on('close', () => handleDisconnect(ws));
  });
  
  // Set up periodic ping to keep connections alive
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // ping every 30 seconds
  
  // Set up periodic check for escalated chats with no staff assigned
  const escalationCheckInterval = setInterval(async () => {
    try {
      const escalatedChats = await chatStatusDb.getEscalatedChats();
      
      for (const chat of escalatedChats) {
        // If no staff assigned and there are staff online, send escalation notifications
        if (!chat.assigned_staff_id && onlineStaff.size > 0) {
          const chatKey = chat.guest_id.toString();
          const currentTime = new Date().getTime();
          
          // Initialize notification tracking if not exists
          if (!notificationStatus[chatKey]) {
            notificationStatus[chatKey] = {
              lastNotified: 0,
              notificationCount: 0,
              acknowledged: false
            };
          }
          
          // Only send reminder notification if it's been at least 60 seconds since the last one
          // and the chat hasn't been acknowledged
          if (!notificationStatus[chatKey].acknowledged && 
              (currentTime - notificationStatus[chatKey].lastNotified > 60000)) {
            
            // Increment notification count for urgency level
            notificationStatus[chatKey].notificationCount += 1;
            notificationStatus[chatKey].lastNotified = currentTime;
            
            // Send reminder with increasing urgency based on wait time
            broadcastToStaff({
              type: 'escalation_notification',
              notificationType: 'reminder',
              guestId: chat.guest_id,
              guestName: chat.guest_name,
              roomNumber: chat.room_number,
              waitTime: getTimeDifference(chat.last_updated),
              urgencyLevel: Math.min(3, notificationStatus[chatKey].notificationCount),
              messageCount: chat.message_count,
              timestamp: new Date().toISOString()
            });
          }
        } else if (chat.assigned_staff_id) {
          // Reset notification status when staff is assigned
          const chatKey = chat.guest_id.toString();
          if (notificationStatus[chatKey]) {
            notificationStatus[chatKey].acknowledged = true;
          }
        }
        
        // If no staff assigned and guest is connected, send waiting message every 30 seconds
        const guestClientKey = `guest_${chat.guest_id}`;
        if (!chat.assigned_staff_id && clients[guestClientKey] && clients[guestClientKey].connection) {
          // Only send if it's been more than 30 seconds since the last update
          const lastMessageTime = new Date(chat.last_updated).getTime();
          const currentTime = new Date().getTime();
          
          if (currentTime - lastMessageTime > 30000) {
            sendToClient(clients[guestClientKey].connection, {
              type: 'chat',
              content: 'Our staff have been notified and will assist you shortly. Thank you for your patience.',
              senderType: 'ai',
              timestamp: new Date().toISOString()
            });
            
            // Update last_updated time
            await chatStatusDb.updateChatStatus({
              guest_id: chat.guest_id,
              status: 'escalated',
              message_count: chat.message_count,
              assigned_staff_id: null
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking escalated chats:', error);
    }
  }, 30000); // check every 30 seconds
  
  wss.on('close', () => {
    clearInterval(pingInterval);
    clearInterval(escalationCheckInterval);
  });
  
  console.log(`WebSocket server started on port ${config.wsPort}`);
  return wss;
}

/**
 * Handle incoming WebSocket messages
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} messageData - The message received
 */
function handleMessage(ws, messageData) {
  // Log raw message data
  console.log(`[DEBUG-WS] Raw message received: ${messageData}`);
  try {
    const message = JSON.parse(messageData);
    console.log(`[DEBUG-WS] Parsed message type: ${message.type}`); // Log parsed type
    
    // Handle authentication message
    if (message.type === 'auth') {
      handleAuthentication(ws, message);
      return;
    }
    
    // Ensure the client is authenticated before processing other messages
    if (!ws.userType || !ws.userId) {
      sendError(ws, 'Authentication required');
      return;
    }
    
    // Handle chat message
    if (message.type === 'chat') {
      handleChatMessage(ws, message);
      return;
    }
    
    // Handle escalation request
    if (message.type === 'escalate') {
      handleEscalation(ws, message);
      return;
    }
    
    // Handle staff accepting a chat
    if (message.type === 'accept_chat' && ws.userType === 'staff') {
      handleStaffAcceptChat(ws, message);
      return;
    }

    // Handle chat history request
    if (message.type === 'get_history') {
      handleChatHistoryRequest(ws, message);
      return;
    }
    
    // Handle notification acknowledgment
    if (message.type === 'acknowledge_notification' && ws.userType === 'staff') {
      handleNotificationAcknowledgment(ws, message);
      return;
    }
    
    // Unknown message type
    sendError(ws, 'Unknown message type');
  } catch (error) {
    console.error('[DEBUG-WS] Error handling message:', error);
    console.error(`[DEBUG-WS] Raw message data that caused error: ${messageData}`); // Log raw data on error
    // Ensure a string error message is sent
    sendError(ws, `Invalid message format or handling error: ${error.message}`); 
  }
}

/**
 * Handle notification acknowledgment from staff
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} message - The acknowledgment message
 */
function handleNotificationAcknowledgment(ws, message) {
  const { guestId } = message;
  
  if (!guestId) {
    sendError(ws, 'Guest ID is required');
    return;
  }
  
  const chatKey = guestId.toString();
  
  // Mark notification as acknowledged
  if (notificationStatus[chatKey]) {
    notificationStatus[chatKey].acknowledged = true;
    
    // Send confirmation to staff
    sendSuccess(ws, {
      message: 'Notification acknowledged'
    });
    
    // Notify other staff that this notification has been acknowledged
    broadcastToOtherStaff(ws.userId, {
      type: 'notification_acknowledged',
      guestId,
      staffId: ws.userId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle client authentication
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} message - The authentication message
 */
async function handleAuthentication(ws, message) {
  console.log('[DEBUG-WS] Entering handleAuthentication');
  const { userType, token, userId: providedUserId } = message; // Use providedUserId for clarity

  // Centralized check for required data based on type
  if (!userType || !token || (userType === 'guest' && !providedUserId)) { 
      // Both guest and staff require a token.
      // Guest also requires a userId in the message for initial mapping, though the token is the source of truth.
      sendError(ws, 'Missing required authentication data (userType, token, userId for guest)');
      return;
  }

  if (userType !== 'guest' && userType !== 'staff') {
    sendError(ws, 'Invalid user type');
    return;
  }

  // Verify JWT token for BOTH user types
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`[DEBUG-WS] JWT token verified. Payload:`, payload);

    if (userType === 'guest') {
      // Check if token payload contains guestId and matches providedUserId
      if (!payload.guestId) {
        throw new Error('Invalid guest token payload (missing guestId)');
      }
      // Use guestId from the verified token as the source of truth
      const verifiedGuestId = payload.guestId;
      
      // Log if providedUserId differs from token, but proceed with token ID
      if (providedUserId && providedUserId.toString() !== verifiedGuestId.toString()) {
         console.warn(`[DEBUG-WS] Provided userId (${providedUserId}) differs from token guestId (${verifiedGuestId}). Using token ID.`);
      }
      
      // Verify guest exists in DB (optional but good practice)
      const guestInfo = await getGuestInfo(verifiedGuestId);
      if (!guestInfo) {
          throw new Error(`Guest not found in database (ID: ${verifiedGuestId})`);
      }
      console.log(`[DEBUG-WS] Verified guest exists in DB: ${guestInfo.name}`);
      
      // Assign properties based on verified token
      ws.userType = 'guest';
      ws.userId = verifiedGuestId; // Use ID from token
      
      // Store connection using verified ID
      const clientKey = `guest_${verifiedGuestId}`;
      clients[clientKey] = { connection: ws, lastActive: new Date() };
      console.log(`[DEBUG-WS] Registered guest client: ${clientKey}`);

      // Check initial chat status (keep this logic)
      chatStatusDb.getChatStatus(verifiedGuestId)
        .then(status => {
            if (status && status.status === 'escalated' && onlineStaff.size === 0) { 
              sendToClient(ws, {
                type: 'chat',
                content: 'Our staff is currently unavailable. Your message has been received and they will respond as soon as possible.',
                senderType: 'ai',
                timestamp: new Date().toISOString()
              });
            }
        })
        .catch(err => console.error('[DEBUG-WS] Error checking chat status during guest authentication:', err));

      sendSuccess(ws, { message: 'Guest authenticated successfully', guestId: verifiedGuestId });

    } else if (userType === 'staff') {
      // Staff-specific payload checks
      if (!payload.username || !payload.role || (payload.role !== 'staff' && payload.role !== 'admin')) {
        throw new Error('Invalid staff token payload or insufficient privileges');
      }
      
      // Assign properties based on verified token
      const staffUsername = payload.username;
      ws.userType = 'staff';
      ws.userId = staffUsername; // Use username from token
      
      // Store connection using username
      const clientKey = `staff_${staffUsername}`;
      clients[clientKey] = { connection: ws, lastActive: new Date() };
      onlineStaff.add(staffUsername);
      console.log(`[DEBUG-WS] Registered staff client: ${clientKey}`);

      // Send escalation summary (keep this logic)
      chatStatusDb.getEscalatedChats()
        .then(escalatedChats => {
            if (escalatedChats.length > 0) {
              const escalatedNotifications = escalatedChats.map(chat => {
                const chatKey = chat.guest_id.toString();
                const notificationInfo = notificationStatus[chatKey] || { notificationCount: 1, acknowledged: false };
                return {
                  guestId: chat.guest_id,
                  guestName: chat.guest_name,
                  roomNumber: chat.room_number,
                  waitTime: getTimeDifference(chat.last_updated),
                  messageCount: chat.message_count,
                  urgencyLevel: Math.min(3, notificationInfo.notificationCount),
                  isAcknowledged: notificationInfo.acknowledged,
                  assignedStaffId: chat.assigned_staff_id
                };
              });
              sendToClient(ws, {
                type: 'escalation_summary',
                escalatedChats: escalatedNotifications,
                timestamp: new Date().toISOString()
              });
            }
        })
        .catch(err => console.error('[DEBUG-WS] Error fetching escalated chats for staff:', err));
        
      sendSuccess(ws, { message: 'Staff authenticated successfully', username: staffUsername });
    }

  } catch (error) {
    // Catch JWT verification errors or other errors thrown inside the try block
    console.error(`[DEBUG-WS] ${userType} authentication failed:`, error.message);
    sendError(ws, `${userType === 'guest' ? 'Guest' : 'Staff'} authentication failed: ${error.message}`);
    // Close connection on auth failure
    ws.close(1008, 'Authentication failed'); 
  }
}

/**
 * Handle chat messages
 * @param {WebSocket} ws - The WebSocket connection of the sender
 * @param {Object} message - The chat message object
 */
async function handleChatMessage(ws, message) {
  // Wrap entire function body in try...catch to prevent server crashes
  try {
    const { content, recipientId } = message; // recipientId is guest ID when staff sends
    const senderType = ws.userType;
    const senderId = ws.userId; // Staff username or Guest ID
    
    // Determine the guestId this chat thread belongs to
    const guestId = senderType === 'guest' ? senderId : recipientId;

    if (!guestId) {
      // Use return here, no need to throw inside the main try
      sendError(ws, 'Could not determine Guest ID for the chat message.');
      return; 
    }

    if (!content) {
      sendError(ws, 'Message content cannot be empty');
      return;
    }
    
    console.log(`[DEBUG-WS handleChatMessage] Processing message from ${senderType} ${senderId} for guest ${guestId}`);

    // Determine actual recipient connection key and type
    let targetClientKey = null;
    let recipientType = null;
    if (senderType === 'guest') {
        console.log(`[DEBUG-WS handleChatMessage] Guest message. Checking status for guest ${guestId}`);
        // Guest sends to assigned staff or broadcasts to all staff if none assigned
        const status = await chatStatusDb.getChatStatus(guestId); 
        console.log(`[DEBUG-WS handleChatMessage] Chat status for guest ${guestId}:`, status);
        if (status && status.assigned_staff_id) {
            targetClientKey = `staff_${status.assigned_staff_id}`;
            recipientType = 'staff';
            console.log(`[DEBUG-WS handleChatMessage] Routing to assigned staff: ${targetClientKey}`);
        } else {
            recipientType = 'staff'; // Flag to broadcast to all online staff
            console.log(`[DEBUG-WS handleChatMessage] No assigned staff, will broadcast.`);
        }
    } else if (senderType === 'staff') {
        console.log(`[DEBUG-WS handleChatMessage] Staff message to guest ${recipientId}`);
        // Staff sends to a specific guest
        if (!recipientId) {
            sendError(ws, 'Recipient ID required for staff messages');
            return;
        }
        if (recipientId.toString() !== guestId.toString()) {
            sendError(ws, 'Mismatch between recipientId and derived guestId.');
            return;
        }
        targetClientKey = `guest_${recipientId}`;
        recipientType = 'guest';
         console.log(`[DEBUG-WS handleChatMessage] Routing to guest: ${targetClientKey}`);
    } else {
        // Should not happen due to earlier checks, but good safety net
        sendError(ws, 'Invalid sender type detected within handleChatMessage');
        return;
    }

    const timestamp = new Date().toISOString();

    // Inner try...catch for specific DB save and broadcast logic
    try {
        // Save message to DB
        const savedMessageId = await chatDb.saveChatMessage({
            guest_id: guestId,
            message: content,
            sender_type: senderType,
            timestamp: timestamp
        });
        console.log(`[DEBUG-WS] Saved message ID ${savedMessageId} for guest ${guestId}`);

        // Prepare message payload to broadcast
        const guestName = senderType === 'staff' ? (await getGuestInfo(guestId))?.name : ws.userId; // Get guest name if staff sending
        const broadcastMessage = {
            id: savedMessageId,
            type: 'chat',
            senderType: senderType,
            senderName: senderType === 'staff' ? ws.userId : guestName || 'Guest', // Use staff username or retrieved guest name
            guestId: guestId, // Always include the guestId context
            content: content,
            timestamp: timestamp
        };
        console.log('[DEBUG-WS] Prepared broadcast message:', JSON.stringify(broadcastMessage));

        // 1. Send back to the original sender
        sendToClient(ws, broadcastMessage);
        console.log(`[DEBUG-WS] Sent message confirmation back to sender (${senderType}_${senderId})`);

        // 2. Send to target recipient(s)
        if (recipientType === 'guest') {
            if (targetClientKey && clients[targetClientKey]) {
                sendToClient(clients[targetClientKey].connection, broadcastMessage);
                console.log(`[DEBUG-WS] Sent message to recipient ${targetClientKey}`);
            } else {
                console.log(`[DEBUG-WS] Recipient ${targetClientKey} not connected.`);
            }
        } else if (recipientType === 'staff') {
            if (targetClientKey && clients[targetClientKey]) {
                // Send to specific assigned staff (if different from sender)
                if (ws !== clients[targetClientKey].connection) {
                   sendToClient(clients[targetClientKey].connection, broadcastMessage);
                   console.log(`[DEBUG-WS] Sent message to assigned staff ${targetClientKey}`);
                }
            } else {
                // Broadcast to all *other* online staff
                broadcastToOtherStaff(ws.userId, broadcastMessage);
                console.log(`[DEBUG-WS] Broadcasted message to other online staff`);
            }
        }

        // Update chat status (e.g., last updated time, message count)
        const currentStatus = await chatStatusDb.getChatStatus(guestId); // Re-fetch status in case it changed
        await chatStatusDb.updateChatStatus({
            guest_id: guestId,
            status: currentStatus ? currentStatus.status : 'active', // Keep existing status
            message_count: currentStatus ? (currentStatus.message_count || 0) + 1 : 1,
            assigned_staff_id: currentStatus ? currentStatus.assigned_staff_id : null,
            last_updated: timestamp // Update timestamp
        });
        console.log(`[DEBUG-WS] Updated chat status for guest ${guestId}`);

    } catch (dbError) {
        // Catch errors specifically from the DB save/broadcast block
        console.error('[DEBUG-WS handleChatMessage] Error during DB save or broadcast:', dbError);
        sendError(ws, `Failed to process message due to internal error: ${dbError.message}`);
    }

  } catch (error) {
    // Catch ANY error that occurs within handleChatMessage
    console.error('[DEBUG-WS handleChatMessage] Unhandled error in handleChatMessage:', error);
    // Send a generic error back to the client
    sendError(ws, `An unexpected error occurred while handling your message: ${error.message}`);
    // Consider closing ws connection if error is severe
    // ws.close(1011, 'Internal server error');
  }
}

/**
 * Handle escalation request
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} message - The escalation message
 */
async function handleEscalation(ws, message) {
  // Only guests can request escalation
  if (ws.userType !== 'guest') {
    sendError(ws, 'Only guests can request escalation');
    return;
  }
  
  try {
    // Mark this conversation as escalated in our database
    await aiChat.escalateConversation(ws.userId);
    
    // Send confirmation to the guest
    sendSuccess(ws, { 
      message: 'Your request has been escalated to the front desk. Our staff will assist you shortly.' 
    });
    
    // Get guest information for the notification
    const guestInfo = await getGuestInfo(ws.userId);
    
    // Initialize notification tracking
    const chatKey = ws.userId.toString();
    notificationStatus[chatKey] = {
      lastNotified: new Date().getTime(),
      notificationCount: 1,
      acknowledged: false
    };
    
    // Broadcast escalation notification to all staff with high priority
    broadcastToStaff({
      type: 'escalation_notification',
      notificationType: 'guest_requested',
      guestId: ws.userId,
      guestName: guestInfo?.name || 'Unknown Guest',
      roomNumber: guestInfo?.room_number || 'Unknown Room',
      urgencyLevel: 2, // Higher initial urgency for explicit escalation requests
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error handling escalation:', error);
    sendError(ws, 'Failed to escalate your request. Please try again.');
  }
}

/**
 * Handle staff accepting a chat
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} message - The accept chat message
 */
async function handleStaffAcceptChat(ws, message) {
  console.log('[DEBUG-WS] Entering handleStaffAcceptChat'); // Add entry log
  const { guestId } = message;
  const staffId = ws.userId;
  
  if (!guestId) {
    sendError(ws, 'Guest ID is required');
    return;
  }
  
  // Make sure the guest exists
  const guestClientKey = `guest_${guestId}`;
  const guestExists = clients[guestClientKey] && clients[guestClientKey].connection;
  
  try {
    // Get current chat status
    const status = await chatStatusDb.getChatStatus(guestId);
    
    // If it's not already escalated, escalate it now
    if (status.status !== 'escalated') {
      await chatStatusDb.updateChatStatus({
        guest_id: guestId,
        status: 'escalated',
        message_count: status.message_count,
        assigned_staff_id: staffId
      });
    } else {
      // Update the assigned staff
      await chatStatusDb.assignStaffToChat(guestId, staffId);
    }
    
    // Mark notification as acknowledged
    const chatKey = guestId.toString();
    if (notificationStatus[chatKey]) {
      notificationStatus[chatKey].acknowledged = true;
    }
    
    // Get the chat history
    const chatHistory = await chatDb.getChatHistory(guestId);
    
    // Send success response with chat history to staff
    sendSuccess(ws, {
      message: 'Chat accepted',
      chatHistory
    });
    
    // Notify the guest that staff has joined, but only if they're connected
    if (guestExists) {
      sendToClient(clients[guestClientKey].connection, {
        type: 'chat',
        content: 'A staff member has joined the chat and will assist you.',
        senderType: 'staff',
        timestamp: new Date().toISOString()
      });
      
      // Save this notification to the database
      await saveChatMessage(
        staffId,
        'staff',
        'A staff member has joined the chat and will assist you.',
        guestId
      );
    }
    
    // Notify other staff that this chat has been accepted
    broadcastToOtherStaff(staffId, {
      type: 'escalation_handled',
      guestId,
      staffId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error accepting chat:', error);
    sendError(ws, 'Failed to accept chat');
  }
}

/**
 * Get guest information from the database using async/await
 * @param {number} guestId - The guest ID
 * @returns {Promise<Object|null>} Promise resolving to guest information or null if not found
 */
async function getGuestInfo(guestId) {
  if (!guestId) {
    throw new Error('Guest ID is required to get guest info');
  }
  
  const query = `
    SELECT id, name, room_number
    FROM guests
    WHERE id = $1
  `;
  
  try {
    console.log(`[DEBUG-DB] Getting guest info for guest ${guestId}`);
    // Use the promisified db.get from src/database/db.js
    const row = await require('../database/db').get(query, [guestId]); 
    console.log(`[DEBUG-DB] Guest info query returned: ${row ? JSON.stringify(row) : 'null'}`);
    return row || null; // Return the row directly, or null if not found
  } catch (err) {
    console.error(`[DEBUG-DB] Error retrieving guest info for guest ${guestId}:`, err);
    // Re-throw the error to be caught by the calling function (handleChatHistoryRequest)
    throw err;
  }
}

/**
 * Handle request for chat history
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} message - The request message
 */
async function handleChatHistoryRequest(ws, message) {
    console.log('[DEBUG-WS] Entering handleChatHistoryRequest');
    const { guestId } = message;

    if (!guestId) {
        sendError(ws, 'Guest ID required for history request');
        return;
    }

    try {
        // Await the asynchronous database call for history
        const history = await chatDb.getChatHistory(guestId);
        console.log(`[DEBUG-WS] Fetched history for guest ${guestId}:`, history ? `${history.length} messages` : 'No history');

        // Await the asynchronous call for guest info
        const info = await getGuestInfo(guestId);
        console.log(`[DEBUG-WS] Fetched guest info for guest ${guestId}:`, info);

        const historyMessage = {
            type: 'chat_history',
            guestId: guestId,
            history: history || [] // Now contains the actual history array
        };
        sendToClient(ws, historyMessage);
        console.log(`[DEBUG-WS] Sent chat_history to client for guest ${guestId}`);

        // Also send guest info if available
        if (info) { // info now contains the actual guest info object
             sendToClient(ws, {
                type: 'guest_info',
                guestId: guestId,
                guestName: info.name,
                roomNumber: info.room_number
            });
             console.log(`[DEBUG-WS] Sent guest_info to client for guest ${guestId}`);
        } else {
            console.log(`[DEBUG-WS] No guest info found for guest ${guestId}`);
        }

    } catch (error) {
        console.error(`[DEBUG-WS] Error fetching chat history for guest ${guestId}:`, error);
        sendError(ws, `Failed to fetch chat history: ${error.message}`);
    }
}

/**
 * Handle client disconnection
 * @param {WebSocket} ws - The WebSocket connection
 */
function handleDisconnect(ws) {
  if (ws.userType === 'staff' && ws.userId) {
    // Remove from online staff
    onlineStaff.delete(ws.userId);
    delete clients[`staff_${ws.userId}`];
  }
  
  if (ws.userType === 'guest' && ws.userId) {
    delete clients[`guest_${ws.userId}`];
  }
  
  console.log(`WebSocket client disconnected (${ws.userType || 'unknown'}_${ws.userId || 'unknown'})`);
}

/**
 * Broadcast a message to all online staff
 * @param {Object} message - The message to broadcast
 */
function broadcastToStaff(message) {
  for (const userId of onlineStaff) {
    const staffClient = clients[`staff_${userId}`];
    
    if (staffClient && staffClient.connection.readyState === WebSocket.OPEN) {
      staffClient.connection.send(JSON.stringify(message));
    }
  }
}

/**
 * Save chat message to the database
 * @param {string} userId - The user ID
 * @param {string} userType - The user type (guest or staff)
 * @param {string} content - The message content
 * @param {string} recipientId - The recipient ID (if applicable)
 */
async function saveChatMessage(userId, userType, content, recipientId) {
  // For guest messages, the sender is the guest and recipient could be AI or staff
  // For staff messages, the sender is staff and recipient is always a guest
  try {
    const senderType = userType;
    const guestId = userType === 'guest' ? userId : recipientId;
    
    // Create the database record
    const chatRecord = {
      guest_id: guestId,
      message: content,
      sender_type: senderType,
      timestamp: new Date().toISOString()
    };
    
    // Save to database
    await chatDb.saveChatMessage(chatRecord);
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
}

/**
 * Send an error message to a client
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} errorMessage - The error message
 */
function sendError(ws, errorMessage) {
  ws.send(JSON.stringify({
    type: 'error',
    message: errorMessage
  }));
}

/**
 * Send a success message to a client
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} data - The success data
 */
function sendSuccess(ws, data) {
  ws.send(JSON.stringify({
    type: 'success',
    ...data
  }));
}

/**
 * Get the time difference in a friendly format
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Friendly time difference
 */
function getTimeDifference(timestamp) {
  const then = new Date(timestamp).getTime();
  const now = new Date().getTime();
  const diffSeconds = Math.floor((now - then) / 1000);
  
  if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''}`;
  }
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }
  
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
}

/**
 * Broadcast a message to all staff except the specified one
 * @param {string} excludeStaffId - Staff ID to exclude
 * @param {Object} message - The message to broadcast
 */
function broadcastToOtherStaff(excludeStaffId, message) {
  for (const userId of onlineStaff) {
    if (userId !== excludeStaffId) {
      const staffClient = clients[`staff_${userId}`];
      
      if (staffClient && staffClient.connection.readyState === WebSocket.OPEN) {
        staffClient.connection.send(JSON.stringify(message));
      }
    }
  }
}

/**
 * Send data to a specific client
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} data - The data to send
 */
function sendToClient(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

module.exports = {
  initWebSocketServer
}; 