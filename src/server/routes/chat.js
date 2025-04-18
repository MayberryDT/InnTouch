/**
 * Chat routes for Inn Touch
 * Provides API endpoints for chat-related functionality
 */
const express = require('express');
const router = express.Router();
const chatDb = require('../../database/chat');
const auth = require('../middleware/auth');
const { authenticateGuest } = require('../middleware/auth');
const { authenticateAny } = require('../middleware/auth');
const chatStatusDb = require('../../database/chat-status');
const { validateGuestId } = require('../middleware/validation');

/**
 * @route GET /api/chat/recent/:limit?
 * @desc Get recent chats for all guests (staff only)
 * @access Staff Only
 */
router.get('/recent/:limit?', auth.authenticateStaff, async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 50;
    
    // Get recent chats
    const recentChats = await chatDb.getRecentChats(limit);
    
    // Return the recent chats
    res.json({
      status: 'success',
      data: {
        chats: recentChats
      }
    });
  } catch (error) {
    console.error('Error retrieving recent chats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve recent chats',
      error: error.message
    });
  }
});

/**
 * @route GET /api/chat/escalated
 * @desc Get escalated chats that need staff attention (staff only)
 * @access Staff Only
 */
router.get('/escalated', auth.authenticateStaff, async (req, res) => {
  console.log('[DEBUG-SERVER] /api/chat/escalated endpoint called');
  console.log('[DEBUG-SERVER] Authenticated user:', req.user);
  
  try {
    console.log('[DEBUG-SERVER] Calling database.getEscalatedChats()');
    
    // Get escalated chats
    const escalatedChats = await chatDb.getEscalatedChats();
    
    // Log the result for debugging
    console.log(`[DEBUG-SERVER] Database returned ${escalatedChats ? escalatedChats.length : 0} escalated chats`);
    if (escalatedChats && escalatedChats.length > 0) {
      console.log('[DEBUG-SERVER] First chat:', JSON.stringify(escalatedChats[0]));
    } else {
      console.log('[DEBUG-SERVER] No chats returned from database');
    }
    
    // Ensure we're returning an array even if the database returns null
    const chatsToReturn = Array.isArray(escalatedChats) ? escalatedChats : [];
    
    // Return the escalated chats
    console.log('[DEBUG-SERVER] Sending response with chats');
    res.json({
      status: 'success',
      data: {
        chats: chatsToReturn
      }
    });
    console.log('[DEBUG-SERVER] Response sent successfully');
  } catch (error) {
    console.error('[DEBUG-SERVER] Error retrieving escalated chats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve escalated chats',
      error: error.message
    });
  }
});

/**
 * @route GET /api/chat/:guestId
 * @desc Get chat history for a specific guest
 * @access Private - Guest can only access their own chat history, Staff can access any
 */
router.get('/:guestId', authenticateAny, async (req, res) => {
  try {
    const { guestId } = req.params;
    const authenticatedUser = req.user;

    // Guests can only access their own chat history
    if (authenticatedUser.type === 'guest' && authenticatedUser.id !== parseInt(guestId)) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Forbidden: You can only view your own chat history' 
      });
    }
    
    // Retrieve chat history from database
    const chatHistory = await chatDb.getChatHistory(parseInt(guestId));
    
    // Return the chat history
    res.json({
      status: 'success',
      data: {
        guestId: parseInt(guestId),
        messages: chatHistory
      }
    });
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve chat history',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chat/message
 * @desc Send a new chat message
 * @access Private - Guest can only send messages as themselves, Staff can send as staff
 */
router.post('/message', authenticateAny, async (req, res) => {
  try {
    const { guestId, message, senderType } = req.body;
    const authenticatedUser = req.user;

    // Validate request body
    if (!guestId || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Guest ID and message are required'
      });
    }

    const targetGuestId = parseInt(guestId);
    if (isNaN(targetGuestId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid Guest ID format' });
    }
    
    // Validate sender type based on user role
    let validatedSenderType = senderType;
    
    // If the sender is a guest, they can only send as "guest" for their own guestId
    if (authenticatedUser.type === 'guest') {
      if (authenticatedUser.id !== targetGuestId) {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: You can only send messages for yourself'
        });
      }
      validatedSenderType = 'guest';
    } 
    // If the sender is staff, they can send as "staff" or "ai"
    else if (authenticatedUser.type === 'staff') {
      if (!senderType || !['staff', 'ai'].includes(senderType)) {
        console.warn(`Staff user ${authenticatedUser.username} sending message without valid senderType ('${senderType}'). Defaulting to 'staff'.`);
        validatedSenderType = 'staff';
      }
    } else {
      console.error('Unauthorized user type attempting to send message:', authenticatedUser);
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    
    // Create message object
    const chatMessage = {
      guest_id: targetGuestId,
      message,
      sender_type: validatedSenderType,
      timestamp: new Date().toISOString()
    };
    
    // Save message to database
    const messageId = await chatDb.saveChatMessage(chatMessage);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      data: {
        id: messageId,
        ...chatMessage
      }
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: error.message
    });
  }
});

/**
 * @route POST /api/chat/acknowledge/:guestId
 * @desc Mark a chat notification as acknowledged by staff
 * @access Staff Only
 */
router.post('/acknowledge/:guestId', auth.authenticateStaff, validateGuestId, async (req, res) => {
  try {
    const guestId = parseInt(req.params.guestId);

    console.log(`[API] Attempting to acknowledge chat for guest ID: ${guestId}`);
    
    // Mark the chat as acknowledged in the database
    await chatStatusDb.markChatAcknowledged(guestId);
    
    console.log(`[API] Successfully acknowledged chat for guest ID: ${guestId}`);

    // TODO: Notify other staff via WebSocket that this chat was acknowledged?
    
    res.json({
      status: 'success',
      message: 'Chat notification acknowledged successfully'
    });
  } catch (error) {
    console.error(`[API] Error acknowledging chat for guest ID ${req.params.guestId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to acknowledge chat notification',
      error: error.message
    });
  }
});

module.exports = router; 