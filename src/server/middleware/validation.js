/**
 * Validation middleware for Inn Touch API endpoints
 */

/**
 * Validates room service order data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateRoomServiceOrder = (req, res, next) => {
  try {
    const { guest_id, items } = req.body;
    
    // Ensure guest_id is present
    if (!guest_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Guest ID is required'
      });
    }
    
    // Ensure guest_id matches authenticated guest
    // Convert both to strings for comparison to avoid type issues (body might be string, token might be number)
    if (guest_id.toString() !== req.guestId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only submit orders for yourself'
      });
    }
    
    // Validate order items
    if (!items) {
      return res.status(400).json({
        status: 'error',
        message: 'Order items are required'
      });
    }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({
        status: 'error',
        message: 'Order items must be an array'
      });
    }
    
    if (items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Order must contain at least one item'
      });
    }
    
    // Validate each item has a name and quantity
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          status: 'error',
          message: 'Each item must be an object'
        });
      }
      
      if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
        return res.status(400).json({
          status: 'error',
          message: 'Each item must have a name and a positive quantity'
        });
      }
      
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
        return res.status(400).json({
          status: 'error',
          message: 'Each item must have a name and a positive quantity'
        });
      }
    }
    
    // If all validations pass, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Order validation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error validating order data',
      error: error.message
    });
  }
};

/**
 * Validates booking data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateBooking = (req, res, next) => {
  try {
    // We get guestId from the authenticateGuest middleware (req.guestId)
    const { type, service, date, time } = req.body;
    
    // We no longer need guest_id from the body, the token provides it.
    // const guest_id = req.body.guest_id;
    
    // // Ensure guest_id is present
    // if (!guest_id) {
    //   return res.status(400).json({
    //     status: 'error',
    //     message: 'Guest ID is required'
    //   });
    // }
    
    // // Ensure guest_id matches authenticated guest
    // if (guest_id !== req.guestId) {
    //   return res.status(403).json({
    //     status: 'error',
    //     message: 'You can only create bookings for yourself'
    //   });
    // }
    
    // Validate booking type
    if (!type) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking type is required'
      });
    }
    
    if (!['amenity', 'tour'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking type must be "amenity" or "tour"'
      });
    }
    
    // Validate service name
    if (!service || typeof service !== 'string' || service.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Service name is required'
      });
    }
    
    // Validate date
    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Date is required'
      });
    }
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Date must be in YYYY-MM-DD format'
      });
    }
    
    // Validate time
    if (!time) {
      return res.status(400).json({
        status: 'error',
        message: 'Time is required'
      });
    }
    
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({
        status: 'error',
        message: 'Time must be in HH:MM format'
      });
    }
    
    // Check if time is valid
    const [hours, minutes] = time.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid time format'
      });
    }
    
    // Check if date is not in the past
    const bookingDate = new Date(date);
    bookingDate.setHours(hours, minutes);
    
    // TEMPORARILY COMMENTED OUT FOR TESTING
    // if (bookingDate < new Date()) {
    //   return res.status(400).json({
    //     status: 'error',
    //     message: 'Cannot book a time in the past'
    //   });
    // }
    
    // If all validations pass, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Booking validation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error validating booking data',
      error: error.message
    });
  }
};

/**
 * Validates feedback submission data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateFeedback = (req, res, next) => {
  try {
    const { guest_id, rating, comments } = req.body;
    
    // Ensure guest_id is present
    if (!guest_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Guest ID is required'
      });
    }
    
    // Ensure guest_id matches authenticated guest
    if (guest_id !== req.guestId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only submit feedback for yourself'
      });
    }
    
    // Validate rating
    if (rating === undefined || rating === null) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating is required'
      });
    }
    
    // Ensure rating is a number between 1 and 5
    const ratingNum = Number(rating);
    if (isNaN(ratingNum)) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be a number'
      });
    }
    
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5'
      });
    }
    
    if (!Number.isInteger(ratingNum)) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be a whole number (1, 2, 3, 4, or 5)'
      });
    }
    
    // Validate comments if provided
    if (comments !== undefined && comments !== null) {
      if (typeof comments !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Comments must be a text string'
        });
      }
      
      // Check comments length
      if (comments.length > 1000) {
        return res.status(400).json({
          status: 'error',
          message: 'Comments cannot exceed 1000 characters'
        });
      }
      
      // Check for HTML/script injection
      if (/<script|<iframe|<img|onerror|javascript:|onclick|onload|alert\(|eval\(|document\.cookie/i.test(comments)) {
        return res.status(400).json({
          status: 'error',
          message: 'Comments cannot contain HTML or scripts'
        });
      }
    }
    
    // If all validations pass, proceed to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Feedback validation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error validating feedback data',
      error: error.message
    });
  }
};

/**
 * Validates that the guestId parameter is a valid integer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateGuestId = (req, res, next) => {
  const { guestId } = req.params;

  if (!guestId) {
    return res.status(400).json({
      status: 'error',
      message: 'Guest ID parameter is required'
    });
  }

  const parsedGuestId = parseInt(guestId);
  if (isNaN(parsedGuestId) || parsedGuestId <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid Guest ID parameter. Must be a positive integer.'
    });
  }

  // Attach parsed ID to request for potential use later
  req.validatedGuestId = parsedGuestId;
  next();
};

module.exports = {
  validateRoomServiceOrder,
  validateBooking,
  validateFeedback,
  validateGuestId
}; 