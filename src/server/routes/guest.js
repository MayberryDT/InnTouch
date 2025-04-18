const express = require('express');
const router = express.Router();
const { authenticateGuest, authenticateStaff } = require('../middleware/auth');
const { validateRoomServiceOrder, validateBooking, validateFeedback } = require('../middleware/validation');
const roomService = require('../../database/room-service');
const feedback = require('../../database/feedback');
const db = require('../db');
const { getAvailableTimeSlots } = require('../../database/availability');
const { saveBooking, getGuestBookings } = require('../../database/booking');
const { getGuestById } = require('../db/guests');

// Get guest details - uses authenticated guest ID from JWT
router.get('/me', authenticateGuest, async (req, res) => {
  try {
    const guestId = req.guestId;

    if (!guestId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    }

    const guest = await getGuestById(guestId);

    if (!guest) {
      console.warn(`Authenticated guest ID ${guestId} not found in database.`);
      return res.status(404).json({ status: 'error', message: 'Guest not found.' });
    }

    res.json({
      status: 'success',
      guest: {
        id: guest.id,
        name: guest.name,
        roomNumber: guest.room_number
      }
    });

  } catch (error) {
    console.error('Error fetching guest details:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error fetching guest details.' });
  }
});

// Guest-specific API routes - all protected by guest authentication
const apiRouter = express.Router();
router.use('/api', apiRouter);

// Apply guest authentication to all guest API routes
apiRouter.use(authenticateGuest);

// Room service order submission
apiRouter.post('/room-service', validateRoomServiceOrder, async (req, res) => {
  try {
    const { guest_id, items } = req.body;
    
    // Create order object
    const order = {
      guest_id,
      order_details: JSON.stringify({ items }),
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // Save to database
    const orderId = await roomService.saveOrder(order);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      message: 'Your order has been placed, thank you!',
      data: {
        id: orderId,
        items,
        status: 'pending',
        timestamp: order.timestamp
      }
    });
  } catch (error) {
    console.error('Error submitting room service order:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit order',
      error: error.message
    });
  }
});

// Get guest's room service orders
apiRouter.get('/room-service', async (req, res) => {
  try {
    // Get guest ID from the authenticated request
    const guestId = req.guestId;
    
    // Retrieve orders from database
    const orders = await roomService.getGuestOrders(guestId);
    
    // If no orders found, return an empty array
    if (!orders || orders.length === 0) {
      return res.json({
        status: 'success',
        data: {
          orders: []
        }
      });
    }
    
    // Parse order details JSON for each order
    const formattedOrders = orders.map(order => {
      try {
        const orderDetails = JSON.parse(order.order_details);
        return {
          id: order.id,
          items: orderDetails.items || [],
          status: order.status,
          timestamp: order.timestamp
        };
      } catch (error) {
        console.error(`Error parsing order details for order ${order.id}:`, error);
        return {
          id: order.id,
          items: [],
          status: order.status,
          timestamp: order.timestamp,
          parseError: true
        };
      }
    });
    
    // Return success response
    res.json({
      status: 'success',
      data: {
        orders: formattedOrders
      }
    });
  } catch (error) {
    console.error('Error retrieving guest orders:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
});

// Get local partners and hotel location for the map
apiRouter.get('/partners', async (req, res) => {
  try {
    // Import partner functions - requires updated require statement
    const partnersData = require('../../database/partners');

    // Fetch partners and hotel location
    const partners = await partnersData.getAllPartners();
    const hotelLocation = await partnersData.getHotelLocation();

    // Return success response
    res.json({
      success: true,
      hotelLocation: hotelLocation,
      partners: partners
    });
  } catch (error) {
    console.error('Error retrieving partner data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve partner data',
      error: error.message
    });
  }
});

// Get available time slots
apiRouter.get('/availability', async (req, res) => {
  try {
    const { type, name, date } = req.query;
    
    // Validate query parameters
    if (!type || !['amenity', 'tour'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type parameter. Must be "amenity" or "tour"'
      });
    }
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name parameter is required'
      });
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    // Get available time slots from our availability module
    const availableSlots = await getAvailableTimeSlots(type, name, date);
    
    // Return the available slots
    return res.json({
      success: true,
      available_slots: availableSlots,
      service: name,
      type,
      date
    });
  } catch (error) {
    console.error('Error getting available time slots:', error);
    
    // Return a specific error message if provided
    if (error.message) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Default error message
    return res.status(500).json({
      success: false,
      message: 'Failed to get available time slots'
    });
  }
});

// Submit a booking
apiRouter.post('/booking', validateBooking, async (req, res) => {
  try {
    // Get booking details from body, guestId comes from auth token
    const { type, service, date, time } = req.body;
    const guestId = req.guestId; // Use the authenticated guestId
    
    // First check if the time slot is available
    const availableSlots = await getAvailableTimeSlots(type, service, date);
    if (!availableSlots.includes(time)) {
      return res.status(409).json({
        status: 'error',
        message: 'This time slot is no longer available. Please choose another time.'
      });
    }
    
    // Create booking details
    const bookingDetails = {
      name: service,
      date: date,
      time: time
    };
    
    // Create booking object
    const booking = {
      guest_id: guestId, // Use the authenticated guestId
      type,
      details: JSON.stringify(bookingDetails),
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // Save to database
    const bookingId = await saveBooking(booking);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      message: 'Your booking is confirmed!',
      data: {
        id: bookingId,
        type,
        service,
        date,
        time,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    // Handle different error types
    if (error.message.includes('time slot') || error.message.includes('not available')) {
      return res.status(409).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

// Get guest's bookings
apiRouter.get('/booking', async (req, res) => {
  try {
    // Get guest ID from the authenticated request
    const guestId = req.guestId;
    
    // Retrieve bookings from database
    const bookings = await getGuestBookings(guestId);
    
    // Format the bookings for the response
    const formattedBookings = bookings.map(booking => {
      try {
        const details = JSON.parse(booking.details);
        return {
          id: booking.id,
          type: booking.type,
          service: details.name,
          date: details.date,
          time: details.time,
          status: booking.status,
          timestamp: booking.timestamp
        };
      } catch (error) {
        console.error(`Error parsing booking details for booking ${booking.id}:`, error);
        return {
          id: booking.id,
          type: booking.type,
          details: booking.details,
          status: booking.status,
          timestamp: booking.timestamp,
          parseError: true
        };
      }
    });
    
    // Return success response
    res.json({
      status: 'success',
      data: {
        bookings: formattedBookings
      }
    });
  } catch (error) {
    console.error('Error retrieving guest bookings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve bookings',
      error: error.message
    });
  }
});

// Submit feedback
apiRouter.post('/feedback', validateFeedback, async (req, res) => {
  try {
    const { guest_id, rating, comments } = req.body;
    
    // Create feedback object
    const feedbackData = {
      guest_id,
      rating,
      comments,
      timestamp: new Date().toISOString()
    };
    
    // Save to database
    const feedbackId = await feedback.saveFeedback(feedbackData);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      message: 'Thank you for your feedback!',
      data: {
        id: feedbackId,
        rating,
        timestamp: feedbackData.timestamp
      }
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
});

// Submit chat message
apiRouter.post('/chat', (req, res) => {
  // This will be implemented in a later step
  res.status(501).json({ message: 'Not implemented yet' });
});

// Get guest's chat history
apiRouter.get('/chat', (req, res) => {
  // This will be implemented in a later step
  res.status(501).json({ message: 'Not implemented yet' });
});

// Get the partners route
router.get('/partners', async (req, res) => {
  try {
    const { getAllPartners, getHotelLocation } = req.app.get('db');
    
    const [partners, hotelLocation] = await Promise.all([
      getAllPartners(),
      getHotelLocation()
    ]);
    
    res.json({
      success: true,
      partners,
      hotelLocation
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners'
    });
  }
});

// --- Route to find active guest by room number ---
// Used by staff to initiate a chat
router.get('/room/:roomNumber', authenticateStaff, async (req, res) => {
  const { roomNumber } = req.params;
  console.log(`Staff request to find active guest in room: ${roomNumber}`);

  try {
    const guest = await db.findActiveGuestByRoom(roomNumber);

    if (!guest) {
      console.log(`No active guest found in room: ${roomNumber}`);
      return res.status(404).json({ status: 'error', message: `No active guest found in room ${roomNumber}.` });
    }

    console.log(`Found active guest in room ${roomNumber}: ID ${guest.id}, Name ${guest.name}`);
    res.json({
      status: 'success',
      data: {
        guest_id: guest.id, // Return guest_id as expected by frontend
        name: guest.name,
        room_number: guest.room_number
      }
    });

  } catch (error) {
    console.error(`Error finding active guest by room ${roomNumber}:`, error);
    res.status(500).json({ status: 'error', message: 'Internal server error finding guest.' });
  }
});

// Endpoint to check guest status (active/inactive)
router.get('/:guestId/status', authenticateGuest, async (req, res) => {
  try {
    // Guest ID is already validated by authenticateGuest
    // ... existing code ...
  } catch (error) {
    // ... existing code ...
  }
});

module.exports = router; 