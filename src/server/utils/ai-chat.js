/**
 * AI Chat Utility for Inn Touch
 * 
 * Implements a simple rule-based AI system to respond to common guest queries.
 * This module handles message analysis, response generation, and escalation logic.
 */

// Database connection for saving AI responses
const chatDb = require('../../database/chat');
const chatStatusDb = require('../../database/chat-status');

// Keywords that immediately trigger escalation to staff
const escalationKeywords = [
  'help',
  'human',
  'staff',
  'manager',
  'front desk',
  'emergency',
  'urgent',
  'problem',
  'issue',
  'complaint'
];

// Common guest queries and their responses
const responses = {
  // Check-in/Check-out
  'check in': 'Check-in is at 3:00 PM. If you arrive earlier, we can store your luggage at the front desk.',
  'check-in': 'Check-in is at 3:00 PM. If you arrive earlier, we can store your luggage at the front desk.',
  'checkout': 'Check-out is at 11:00 AM. Late check-out might be available for an additional fee, please contact the front desk.',
  'check out': 'Check-out is at 11:00 AM. Late check-out might be available for an additional fee, please contact the front desk.',
  'check-out': 'Check-out is at 11:00 AM. Late check-out might be available for an additional fee, please contact the front desk.',
  'late checkout': 'Late check-out might be available for an additional fee, please contact the front desk.',
  'early check-in': 'Early check-in depends on room availability. Please contact the front desk upon arrival.',
  
  // Facilities
  'wifi': 'Our WiFi network name is "Inn-Guest" and the password is in your welcome packet. If you need any assistance connecting, please let us know.',
  'password': 'Your WiFi password is in your welcome packet. If you need any assistance, please let us know.',
  'internet': 'Our WiFi network name is "Inn-Guest" and the password is in your welcome packet. If you need any assistance connecting, please let us know.',
  'swimming pool': 'Our swimming pool is open from 7:00 AM to 9:00 PM. Towels are available at the pool entrance.',
  'pool': 'Our swimming pool is open from 7:00 AM to 9:00 PM. Towels are available at the pool entrance.',
  'gym': 'Our fitness center is open 24 hours. You can access it with your room key.',
  'fitness': 'Our fitness center is open 24 hours. You can access it with your room key.',
  'breakfast': 'Breakfast is served in the main restaurant from 6:30 AM to 10:30 AM on weekdays, and 7:00 AM to 11:00 AM on weekends.',
  'restaurant': 'Our restaurant is open for breakfast from 6:30 AM to 10:30 AM, lunch from 12:00 PM to 2:30 PM, and dinner from 6:00 PM to 10:00 PM.',
  
  // Services
  'housekeeping': 'Housekeeping services are provided daily between 9:00 AM and 4:00 PM. If you prefer a specific time, please let us know.',
  'cleaning': 'Housekeeping services are provided daily between 9:00 AM and 4:00 PM. If you prefer a specific time, please let us know.',
  'towels': 'If you need extra towels, you can request them through the Room Service option in this app, or by calling the front desk.',
  'laundry': 'We offer laundry and dry-cleaning services. Please place your items in the laundry bag in your closet and fill out the form attached.',
  'room service': 'Room service is available from 6:30 AM to 10:30 PM. You can place your order through the Room Service option in this app.',
  
  // Local information
  'restaurant recommendations': 'We have several recommended restaurants nearby. Please check the Local Map section of this app for details.',
  'tourist attractions': 'Popular attractions near the hotel can be found in the Local Map section of this app. The front desk can also help with directions and transportation.',
  'shopping': 'The nearest shopping center is within a 10-minute walk. You can find it marked on the Local Map section of this app.',
  'transportation': 'We can arrange taxis or shuttles for you. Please contact the front desk at least 30 minutes before your desired departure time.',
  'taxi': 'We can arrange a taxi for you. Please contact the front desk at least 15 minutes before your desired departure time.',
  
  // Payment
  'bill': 'You can review your current bill through the Room Service section of this app. For specific questions about charges, please contact the front desk.',
  'invoice': 'You can review your current bill through the Room Service section of this app. For specific questions about charges, please contact the front desk.',
  'check my balance': 'You can review your current bill through the Room Service section of this app. For specific questions about charges, please contact the front desk.',
  'payment': 'We accept all major credit cards, cash, and mobile payments. For specific payment questions, please contact the front desk.',
  
  // Default responses
  'hello': 'Hello! I\'m your virtual assistant. How can I help you with your stay today?',
  'hi': 'Hi there! I\'m your virtual assistant. How can I help you with your stay today?',
  'thank you': 'You\'re welcome! If you need anything else, don\'t hesitate to ask.',
  'thanks': 'You\'re welcome! If you need anything else, don\'t hesitate to ask.'
};

/**
 * Process a guest message and generate an AI response
 * @param {number} guestId - The guest ID
 * @param {string} message - The message content
 * @returns {Promise<Object>} An object with response message and escalation status
 */
async function processMessage(guestId, message) {
  try {
    // Check if the chat is already escalated
    const isEscalated = await chatStatusDb.isChatEscalated(guestId);
    
    if (isEscalated) {
      return {
        message: 'Your conversation has been escalated to our staff. They will assist you shortly.',
        shouldEscalate: true
      };
    }
    
    // Increment message count
    const messageCount = await chatStatusDb.incrementMessageCount(guestId);
    
    // Check for escalation keywords
    const messageLC = message.toLowerCase();
    const containsEscalationKeyword = escalationKeywords.some(keyword => 
      messageLC.includes(keyword)
    );
    
    // Force escalation after 3 messages or if escalation keyword is found
    if (messageCount >= 3 || containsEscalationKeyword) {
      // Update chat status to escalated
      await chatStatusDb.updateChatStatus({
        guest_id: guestId,
        status: 'escalated',
        message_count: messageCount,
        assigned_staff_id: null
      });
      
      return {
        message: 'Would you like to speak to the front desk? They can better assist you with your request.',
        shouldEscalate: true
      };
    }
    
    // Generate a rule-based response
    const aiResponse = generateResponse(messageLC);
    
    // Save AI response to database
    await chatDb.saveChatMessage({
      guest_id: guestId,
      message: aiResponse,
      sender_type: 'ai',
      timestamp: new Date().toISOString()
    });
    
    return {
      message: aiResponse,
      shouldEscalate: false
    };
  } catch (error) {
    console.error('Error processing message with AI:', error);
    return {
      message: 'I apologize, but I encountered an error. Please try again or type "help" to connect with our staff.',
      shouldEscalate: false
    };
  }
}

/**
 * Generate a response based on message content
 * @param {string} message - Lowercase message to analyze
 * @returns {string} AI response message
 */
function generateResponse(message) {
  // Check if message contains any of our known phrases
  for (const [phrase, response] of Object.entries(responses)) {
    if (message.includes(phrase)) {
      return response;
    }
  }
  
  // Default response if no specific pattern is matched
  return "I'm not sure I understand. Could you please rephrase your question? If you need immediate assistance, please type 'help' to connect with our staff.";
}

/**
 * Reset the conversation status for a guest
 * @param {number} guestId - The guest ID
 * @returns {Promise<boolean>} Success status
 */
async function resetConversation(guestId) {
  try {
    return await chatStatusDb.resetChatStatus(guestId);
  } catch (error) {
    console.error('Error resetting conversation:', error);
    return false;
  }
}

/**
 * Check if a conversation is already escalated
 * @param {number} guestId - The guest ID
 * @returns {Promise<boolean>} True if escalated, false otherwise
 */
async function isEscalated(guestId) {
  return chatStatusDb.isChatEscalated(guestId);
}

/**
 * Escalate a conversation to staff
 * @param {number} guestId - The guest ID
 * @returns {Promise<boolean>} Success status
 */
async function escalateConversation(guestId) {
  try {
    const status = await chatStatusDb.getChatStatus(guestId);
    
    await chatStatusDb.updateChatStatus({
      guest_id: guestId,
      status: 'escalated',
      message_count: status.message_count,
      assigned_staff_id: null
    });
    
    return true;
  } catch (error) {
    console.error('Error escalating conversation:', error);
    return false;
  }
}

module.exports = {
  processMessage,
  resetConversation,
  isEscalated,
  escalateConversation
}; 