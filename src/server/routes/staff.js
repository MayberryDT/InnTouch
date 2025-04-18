const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const cloudbedsClient = require('../api/cloudbeds');
const db = require('../db');
const { formatApiErrorResponse } = require('../utils/api-error-handler');
const roomService = require('../../database/room-service');
const feedback = require('../../database/feedback');
const { findActiveGuestByRoom } = require('../db/guests');

// Apply the authentication middleware to all staff routes
router.use(auth.authenticateStaff);

/**
 * @route GET /api/staff/dashboard
 * @desc Get staff dashboard data
 * @access Private
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Fetch data for staff dashboard
    const chats = await db.getAllEscalatedChats();
    const orders = await db.getRecentRoomServiceOrders();
    const bookings = await db.getRecentBookings();
    
    res.json({
      chats,
      orders,
      bookings
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

/**
 * @route POST /api/staff/import-cloudbeds
 * @desc Import guest data from Cloudbeds API
 * @access Private
 */
router.post('/import-cloudbeds', async (req, res) => {
  try {
    console.log('Starting Cloudbeds data import process');
    
    // Get active guests from Cloudbeds
    const activeGuests = await cloudbedsClient.getActiveGuests();
    
    if (!activeGuests || !Array.isArray(activeGuests)) {
      console.error('Invalid response from Cloudbeds API:', activeGuests);
      return res.status(502).json({
        success: false,
        message: 'Invalid data format received from Cloudbeds API',
        details: process.env.NODE_ENV === 'development' ? 
          `Expected array but got: ${typeof activeGuests}` : undefined
      });
    }
    
    console.log(`Retrieved ${activeGuests.length} active guests from Cloudbeds`);
    
    // Process guest data
    const savedGuests = [];
    const errors = [];
    
    for (const guest of activeGuests) {
      try {
        // Validate required guest fields
        if (!guest.first_name || !guest.last_name || !guest.check_in_date || !guest.check_out_date) {
          throw new Error(`Missing required guest fields for guest ID ${guest.id}`);
        }
        
        // Format guest data for our database
        const guestData = {
          name: `${guest.first_name} ${guest.last_name}`,
          room_number: guest.room_number || 'Unassigned',
          check_in: guest.check_in_date,
          check_out: guest.check_out_date,
          cloudbeds_data: JSON.stringify(guest)
        };
        
        // Save to database (insert or update)
        const savedGuest = await db.saveGuest(guestData);
        savedGuests.push(savedGuest);
        console.log(`Processed guest: ${guestData.name}, Room: ${guestData.room_number}`);
      } catch (guestError) {
        // Track individual guest errors but continue processing others
        console.error(`Error processing guest ${guest.id}:`, guestError);
        errors.push({
          guestId: guest.id || 'unknown',
          name: guest.first_name && guest.last_name ? 
            `${guest.first_name} ${guest.last_name}` : 'Unknown Guest',
          room: guest.room_number || 'Unknown',
          error: guestError.message,
          stack: process.env.NODE_ENV === 'development' ? guestError.stack : undefined
        });
      }
    }
    
    // Respond with detailed results
    const response = {
      success: true,
      message: errors.length === 0 ? 
        'All guests successfully imported from Cloudbeds' : 
        `Imported ${savedGuests.length} guests with ${errors.length} errors`,
      summary: {
        total: activeGuests.length,
        imported: savedGuests.length,
        failed: errors.length,
        timestamp: new Date().toISOString()
      },
      imported: savedGuests.map(guest => ({
        id: guest.id,
        name: guest.name,
        room: guest.room_number,
        status: guest.created ? 'created' : 'updated'
      })),
      errors: errors.length > 0 ? errors : null
    };
    
    console.log(`Cloudbeds import completed: ${savedGuests.length} successes, ${errors.length} failures`);
    res.json(response);
  } catch (error) {
    console.error('Error importing Cloudbeds data:', error);
    
    // Use our enhanced API error formatter
    const errorResponse = formatApiErrorResponse(error, 'Cloudbeds API', {
      operation: 'import-guests',
      endpoint: error.endpoint, // Added by our enhanced API client
      method: error.method      // Added by our enhanced API client
    });
    
    // Send appropriate status code and error details
    res.status(errorResponse.statusCode).json({
      success: false,
      message: `Failed to import Cloudbeds data: ${errorResponse.error.message}`,
      error: errorResponse.error
    });
  }
});

/**
 * @route GET /api/guests/room/:roomNumber
 * @desc Find an active guest by room number (for staff starting a chat)
 * @access Private (Staff Only)
 * @param {string} roomNumber - The room number to search for.
 */
router.get('/guests/room/:roomNumber', async (req, res) => {
  try {
    const { roomNumber } = req.params;

    if (!roomNumber) {
      return res.status(400).json({ status: 'error', message: 'Room number parameter is required.' });
    }

    // Use the imported function to find the guest
    const guest = await findActiveGuestByRoom(roomNumber);

    if (!guest) {
      // Return 404 if no *active* guest is found for that room
      console.log(`Staff lookup: No active guest found for room ${roomNumber}`);
      return res.status(404).json({ status: 'error', message: `No active guest found in room ${roomNumber}.` });
    }

    // Return the found guest's basic info (including ID)
    console.log(`Staff lookup: Found guest ${guest.id} in room ${roomNumber}`);
    res.json({
      status: 'success',
      data: {
        guest_id: guest.id, // Frontend expects guest_id
        name: guest.name,
        room_number: guest.room_number
      }
    });

  } catch (error) {
    console.error(`Error fetching guest by room number ${req.params.roomNumber}:`, error);
    res.status(500).json({ status: 'error', message: 'Internal server error finding guest by room.' });
  }
});

// Get all chats for a specific guest
router.get('/chat/:guest_id', (req, res) => {
  // This will be implemented in a later step
  res.status(501).json({ message: 'Not implemented yet' });
});

// Get all room service orders
router.get('/room-service', async (req, res) => {
  try {
    // Get optional status filter from query parameters
    const { status, limit } = req.query;
    
    // If no specific status is provided, default to showing pending and confirmed orders
    let activeOrders = [];
    let filterStatus = [];
    
    if (status) {
      // If specific status is requested, return just those orders
      activeOrders = await roomService.getAllOrders(status);
      filterStatus = [status];
    } else {
      // Get pending orders
      const pendingOrders = await roomService.getAllOrders('pending');
      filterStatus.push('pending');
      
      // Get confirmed orders
      const confirmedOrders = await roomService.getAllOrders('confirmed');
      filterStatus.push('confirmed');
      
      // Combine and sort by timestamp (newest first)
      activeOrders = [...pendingOrders, ...confirmedOrders]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    // Apply limit if provided
    if (limit) {
      activeOrders = activeOrders.slice(0, parseInt(limit));
    }
    
    // Format the order details for each order
    const formattedOrders = activeOrders.map(order => {
      try {
        const orderDetails = JSON.parse(order.orderDetails || order.order_details);
        return {
          id: order.id,
          guestId: order.guestId || order.guest_id,
          guest_name: order.guest_name,
          roomNumber: order.roomNumber || order.room_number,
          items: orderDetails.items || [],
          specialInstructions: orderDetails.specialInstructions || '',
          orderDetails: orderDetails,
          status: order.status,
          timestamp: order.timestamp
        };
      } catch (error) {
        console.error(`Error parsing order details for order ${order.id}:`, error);
        return {
          id: order.id,
          guestId: order.guestId || order.guest_id,
          guest_name: order.guest_name,
          roomNumber: order.roomNumber || order.room_number,
          orderDetails: { items: [], error: 'Error parsing order details' },
          status: order.status,
          timestamp: order.timestamp
        };
      }
    });
    
    // Return formatted orders
    res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length,
      filter: filterStatus
    });
  } catch (error) {
    console.error('Error retrieving room service orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve orders'
    });
  }
});

// Update room service order status
router.patch('/room-service/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Check if status is provided
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    // Validate that status is one of the allowed values
    if (!['pending', 'confirmed', 'delivered'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be pending, confirmed, or delivered'
      });
    }
    
    // Update order status
    await roomService.updateOrderStatus(id, status);
    
    // Return success response
    res.json({
      success: true,
      message: `Order ${id} status updated to ${status}`,
      orderId: id,
      newStatus: status
    });
  } catch (error) {
    console.error(`Error updating order ${req.params.id} status:`, error);
    
    // Check if the error is that the order wasn't found
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

/**
 * @route GET /api/staff/booking
 * @desc Get all bookings for staff overview
 * @access Private (staff only)
 */
router.get('/booking', async (req, res) => {
  try {
    // Get optional status filter from query parameters
    const { status, type, limit } = req.query;
    
    // Get all bookings
    let allBookings = await db.getAllBookings();
    
    // Apply filters if provided
    if (status) {
      allBookings = allBookings.filter(booking => booking.status === status);
    }
    
    if (type) {
      allBookings = allBookings.filter(booking => booking.type === type);
    }
    
    // Apply limit if provided
    if (limit && !isNaN(parseInt(limit))) {
      allBookings = allBookings.slice(0, parseInt(limit));
    }
    
    // Format the response
    res.json({
      success: true,
      bookings: allBookings,
      count: allBookings.length,
      filters: {
        status: status || 'all',
        type: type || 'all'
      }
    });
  } catch (error) {
    console.error('Error retrieving bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bookings'
    });
  }
});

// Update booking status
router.patch('/booking/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Check if status is provided
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    // Validate that status is one of the allowed values
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be pending, confirmed, or cancelled'
      });
    }
    
    // Update booking status
    await db.updateBookingStatus(id, status);
    
    // Return success response
    res.json({
      success: true,
      message: `Booking ${id} status updated to ${status}`,
      bookingId: id,
      newStatus: status
    });
  } catch (error) {
    console.error(`Error updating booking ${req.params.id} status:`, error);
    
    // Check if the error is that the booking wasn't found
    if (error.message === 'Booking not found') {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      error: 'Failed to update booking status'
    });
  }
});

/**
 * @route GET /api/staff/feedback
 * @desc Get all feedback submissions with optional filtering
 * @access Private (Staff only)
 */
router.get('/feedback', async (req, res) => {
  try {
    // Extract filter parameters from query
    const { 
      rating, 
      minRating, 
      maxRating, 
      startDate, 
      endDate, 
      sort, 
      order 
    } = req.query;
    
    // Convert numeric filters to numbers if provided
    const filters = {};
    
    if (rating !== undefined) {
      filters.rating = parseInt(rating);
      if (isNaN(filters.rating)) {
        return res.status(400).json({
          status: 'error',
          message: 'Rating must be a number between 1 and 5'
        });
      }
    }
    
    if (minRating !== undefined) {
      filters.minRating = parseInt(minRating);
      if (isNaN(filters.minRating)) {
        return res.status(400).json({
          status: 'error',
          message: 'Minimum rating must be a number'
        });
      }
    }
    
    if (maxRating !== undefined) {
      filters.maxRating = parseInt(maxRating);
      if (isNaN(filters.maxRating)) {
        return res.status(400).json({
          status: 'error',
          message: 'Maximum rating must be a number'
        });
      }
    }
    
    // Validate date filters if provided
    if (startDate) {
      if (!isValidISODate(startDate)) {
        return res.status(400).json({
          status: 'error',
          message: 'Start date must be a valid ISO date string'
        });
      }
      filters.startDate = startDate;
    }
    
    if (endDate) {
      if (!isValidISODate(endDate)) {
        return res.status(400).json({
          status: 'error',
          message: 'End date must be a valid ISO date string'
        });
      }
      filters.endDate = endDate;
    }
    
    // Add sorting parameters if provided
    if (sort) {
      if (!['timestamp', 'rating'].includes(sort)) {
        return res.status(400).json({
          status: 'error',
          message: 'Sort parameter must be either "timestamp" or "rating"'
        });
      }
      filters.sort = sort;
    }
    
    if (order) {
      if (!['asc', 'desc'].includes(order.toLowerCase())) {
        return res.status(400).json({
          status: 'error',
          message: 'Order parameter must be either "asc" or "desc"'
        });
      }
      filters.order = order.toLowerCase();
    }
    
    // Get filtered feedback
    const allFeedback = await feedback.getAllFeedback(filters);
    
    // Calculate average rating
    const totalRating = allFeedback.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = allFeedback.length > 0 ? (totalRating / allFeedback.length).toFixed(1) : 0;
    
    // Group feedback by rating
    const ratingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    allFeedback.forEach(item => {
      ratingDistribution[item.rating]++;
    });
    
    res.json({
      status: 'success',
      data: {
        feedback: allFeedback,
        meta: {
          count: allFeedback.length,
          averageRating: parseFloat(averageRating),
          ratingDistribution
        },
        filters: Object.keys(filters).length > 0 ? filters : 'none'
      }
    });
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve feedback',
      error: error.message
    });
  }
});

// Helper function to validate ISO date strings
function isValidISODate(dateString) {
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(dateString) && 
      !/\d{4}-\d{2}-\d{2}/.test(dateString) &&
      !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = router; 