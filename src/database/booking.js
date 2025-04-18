/**
 * Booking module for Inn Touch
 * Manages booking creation and retrieval
 */

const db = require('./db');

/**
 * Get available time slots for a specific amenity or tour
 * @param {string} type - The type of booking ('amenity' or 'tour')
 * @param {string} name - The name of the amenity or tour
 * @param {string} date - The date to check availability for (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of available time slots
 */
const getAvailableTimeSlots = async (type, name, date) => {
  try {
    // Validate input parameters
    if (!type || !['amenity', 'tour'].includes(type)) {
      throw new Error('Invalid booking type. Must be "amenity" or "tour"');
    }
    
    if (!name) {
      throw new Error('Name is required');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    
    // Define all possible time slots based on type
    const allTimeSlots = getDefaultTimeSlots(type);
    
    // Get booked time slots from the database
    const bookedSlots = await getBookedTimeSlots(type, name, date);
    
    // Filter out booked slots to get available ones
    const availableSlots = allTimeSlots.filter(slot => {
      return !bookedSlots.includes(slot);
    });
    
    return availableSlots;
  } catch (error) {
    console.error('Error getting available time slots:', error);
    throw error;
  }
};

/**
 * Get already booked time slots for a specific amenity or tour on a given date
 * @param {string} type - The type of booking ('amenity' or 'tour')
 * @param {string} name - The name of the amenity or tour
 * @param {string} date - The date to check (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of booked time slots
 */
const getBookedTimeSlots = async (type, name, date) => {
  try {
    // Find bookings for this specific type, name, and date that aren't cancelled
    const query = `
      SELECT details 
      FROM bookings 
      WHERE type = ? 
      AND status != 'cancelled' 
      AND json_extract(details, '$.name') = ?
      AND date(json_extract(details, '$.time')) = ?
    `;
    
    const bookings = await db.all(query, [type, name, date]);
    
    // Extract the time from each booking's details
    const bookedTimes = bookings.map(booking => {
      const details = JSON.parse(booking.details);
      // Extract just the time portion (HH:MM) from the ISO string
      const time = new Date(details.time).toTimeString().slice(0, 5);
      return time;
    });
    
    return bookedTimes;
  } catch (error) {
    console.error('Error getting booked time slots:', error);
    throw error;
  }
};

/**
 * Get a list of all amenities or tours available in the system
 * @param {string} type - The type of booking ('amenity' or 'tour')
 * @returns {Promise<Array>} - Array of amenity or tour names
 */
const getServiceList = async (type) => {
  try {
    // Validate type
    if (!type || !['amenity', 'tour'].includes(type)) {
      throw new Error('Invalid type. Must be "amenity" or "tour"');
    }
    
    // For MVP, we're using predefined lists
    if (type === 'amenity') {
      return [
        'Spa Massage',
        'Gym Session',
        'Pool Access',
        'Sauna'
      ];
    } else {
      return [
        'City Tour',
        'Beach Trip',
        'Mountain Hike',
        'Local Winery Visit'
      ];
    }
  } catch (error) {
    console.error('Error getting service list:', error);
    throw error;
  }
};

/**
 * Returns default time slots based on the booking type
 * @param {string} type - Either 'amenity' or 'tour'
 * @returns {Array} - Array of time slots in HH:MM format
 */
const getDefaultTimeSlots = (type) => {
  if (type === 'amenity') {
    // Amenities typically available from 9 AM to 9 PM
    return [
      '09:00', '10:00', '11:00', '12:00', '13:00', 
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
    ];
  } else {
    // Tours typically available from 9 AM to 5 PM
    return [
      '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'
    ];
  }
};

/**
 * Save a new booking to the database
 * @param {Object} booking - The booking object to save
 * @returns {Promise<number>} Promise resolving to the booking ID
 */
async function saveBooking(booking) {
  try {
    // Use a transaction to ensure data integrity
    return await db.transaction(async (trx) => {
      // Insert the booking
      const result = await trx.run(
        'INSERT INTO bookings (guest_id, type, details, status, timestamp) VALUES (?, ?, ?, ?, ?)',
        [booking.guest_id, booking.type, booking.details, booking.status, booking.timestamp]
      );
      
      return result.lastID;
    });
  } catch (err) {
    console.error('Error saving booking:', err.message);
    throw new Error('Failed to save booking: ' + err.message);
  }
}

/**
 * Get all bookings for a guest
 * @param {number} guestId - The guest ID
 * @returns {Promise<Array>} Promise resolving to array of bookings
 */
async function getGuestBookings(guestId) {
  try {
    // Query the database for all bookings for this guest
    const bookings = await db.all(
      'SELECT id, guest_id, type, details, status, timestamp FROM bookings WHERE guest_id = ? ORDER BY timestamp DESC',
      [guestId]
    );
    
    // If no bookings, return an empty array
    return bookings || [];
  } catch (err) {
    console.error('Error getting guest bookings:', err.message);
    throw new Error('Failed to get guest bookings: ' + err.message);
  }
}

/**
 * Get all bookings
 * @returns {Promise<Array>} - Array of booking objects
 */
const getAllBookings = async () => {
  try {
    // Query to get all bookings with guest information joined
    const query = `
      SELECT b.id, b.guest_id, g.name as guest_name, g.room_number, 
             b.type, b.details, b.status, b.timestamp
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      ORDER BY b.timestamp DESC
    `;
    
    // Execute the query
    const bookings = await db.all(query);
    
    // Parse the details field from JSON to JavaScript object
    return bookings.map(booking => {
      try {
        return {
          ...booking,
          details: JSON.parse(booking.details)
        };
      } catch (error) {
        console.error(`Error parsing booking details for booking ${booking.id}:`, error);
        return {
          ...booking,
          details: {},
          parseError: true
        };
      }
    });
  } catch (error) {
    console.error('Error getting all bookings:', error);
    throw error;
  }
};

/**
 * Update a booking's status
 * @param {number} bookingId - The booking ID
 * @param {string} status - The new status ('pending', 'confirmed', 'cancelled')
 * @returns {Promise<boolean>} Promise resolving to true if successful
 */
async function updateBookingStatus(bookingId, status) {
  try {
    // Validate status
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      throw new Error('Invalid status. Must be "pending", "confirmed", or "cancelled"');
    }
    
    // Update the booking status
    const result = await db.run(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, bookingId]
    );
    
    // Return true if a row was updated
    return result.changes > 0;
  } catch (err) {
    console.error('Error updating booking status:', err.message);
    throw new Error('Failed to update booking status: ' + err.message);
  }
}

/**
 * Delete a booking
 * @param {number} bookingId - The booking ID
 * @param {number} guestId - The guest ID (for security)
 * @returns {Promise<boolean>} Promise resolving to true if successful
 */
async function deleteBooking(bookingId, guestId) {
  try {
    // Delete the booking, but only if it belongs to the specified guest
    const result = await db.run(
      'DELETE FROM bookings WHERE id = ? AND guest_id = ?',
      [bookingId, guestId]
    );
    
    // Return true if a row was deleted
    return result.changes > 0;
  } catch (err) {
    console.error('Error deleting booking:', err.message);
    throw new Error('Failed to delete booking: ' + err.message);
  }
}

/**
 * Prevents booking overlaps by checking availability and saving in a transaction
 * @param {Object} booking - The booking object to save
 * @param {string} type - The type of booking ('amenity' or 'tour')
 * @param {string} name - The name of the amenity or tour
 * @param {string} date - The date (YYYY-MM-DD)
 * @param {string} time - The time (HH:MM)
 * @returns {Promise<number>} - The ID of the newly created booking
 */
const preventBookingOverlaps = async (booking, type, name, date, time) => {
  try {
    // Begin a transaction for atomicity
    return await db.transaction(async (trx) => {
      // Double-check the availability within the transaction
      const query = `
        SELECT COUNT(*) as count
        FROM bookings
        WHERE type = ?
        AND status != 'cancelled'
        AND json_extract(details, '$.name') = ?
        AND date(json_extract(details, '$.time')) = ?
        AND time(json_extract(details, '$.time')) = ?
      `;
      
      const params = [type, name, date, `${time}:00`];
      const result = await trx.get(query, params);
      
      // If any bookings exist for this slot, it's no longer available
      if (result.count > 0) {
        throw new Error('This time slot is no longer available. Please choose another time.');
      }
      
      // If we get here, the slot is available, so save the booking
      const insertQuery = `
        INSERT INTO bookings (guest_id, type, details, status, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const { guest_id, details, status = 'pending', timestamp = new Date().toISOString() } = booking;
      
      const insertResult = await trx.run(insertQuery, [guest_id, type, details, status, timestamp]);
      
      // Return the ID of the newly created booking
      return insertResult.lastID;
    });
  } catch (error) {
    console.error('Error preventing booking overlap:', error);
    throw error;
  }
};

module.exports = {
  getAvailableTimeSlots,
  getBookedTimeSlots,
  getServiceList,
  saveBooking,
  getGuestBookings,
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
  preventBookingOverlaps
}; 