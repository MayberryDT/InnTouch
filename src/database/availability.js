/**
 * Availability module for Inn Touch
 * Manages checking availability for amenities and tours
 */

const db = require('./db');
const { amenities, tours } = require('./seed');

/**
 * Generate time slots based on start time, end time, and duration
 * @param {string} startTime - Start time (format: 'HH:MM')
 * @param {string} endTime - End time (format: 'HH:MM')
 * @param {number} duration - Duration in minutes
 * @returns {Array} Array of time slots (format: 'HH:MM')
 */
function generateTimeSlots(startTime, endTime, duration) {
  const slots = [];
  
  // Convert start and end times to minutes
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // Generate slots
  for (let time = startMinutes; time + duration <= endMinutes; time += duration) {
    const hour = Math.floor(time / 60);
    const minute = time % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
  
  return slots;
}

/**
 * Get all possible time slots for a service on a given date
 * @param {string} type - The type of service ('amenity' or 'tour')
 * @param {string} name - The name of the service
 * @param {string} date - The date to check (format: 'YYYY-MM-DD')
 * @returns {Promise<Array>} Promise resolving to array of available time slots
 */
async function getAllTimeSlots(type, name) {
  // Find the service in our data
  const serviceList = type === 'amenity' ? amenities : tours;
  const service = serviceList.find(s => s.name.toLowerCase() === name.toLowerCase());
  
  if (!service) {
    throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} '${name}' not found`);
  }
  
  // Generate all possible time slots
  return generateTimeSlots(service.start_time, service.end_time, service.duration);
}

/**
 * Get booked time slots for a service on a given date
 * @param {string} type - The type of service ('amenity' or 'tour')
 * @param {string} name - The name of the service
 * @param {string} date - The date to check (format: 'YYYY-MM-DD')
 * @returns {Promise<Array>} Promise resolving to array of booked time slots
 */
async function getBookedTimeSlots(type, name, date) {
  try {
    // Query the database for existing bookings on this date for this service
    // Use PostgreSQL JSONB path query and casting
    const query = `
      SELECT details 
      FROM bookings 
      WHERE type = $1 
        AND jsonb_path_query_first(details::jsonb, '$.name') = to_jsonb($2::text)
        AND jsonb_path_query_first(details::jsonb, '$.date')::text = to_jsonb($3::text)::text
        AND status != 'cancelled'
    `; // Changed ?, json_extract to PG equivalents, added status check
    
    const bookings = await db.all(query, [type, name, date]);
    
    // Extract the booked times
    return bookings.map(booking => {
      // Details are already JSONB in the DB, but db.all returns JS objects
      // Assuming the time is stored as HH:MM in the details.time field
      return booking.details?.time; 
    }).filter(time => !!time); // Filter out any null/undefined times
  } catch (err) {
    console.error('Error getting booked time slots:', err.message);
    throw err;
  }
}

/**
 * Get available time slots for a service on a given date
 * @param {string} type - The type of service ('amenity' or 'tour')
 * @param {string} name - The name of the service
 * @param {string} date - The date to check (format: 'YYYY-MM-DD')
 * @returns {Promise<Array>} Promise resolving to array of available time slots
 */
async function getAvailableTimeSlots(type, name, date) {
  try {
    // Get all possible time slots
    const allSlots = await getAllTimeSlots(type, name);
    
    // Get booked time slots
    const bookedSlots = await getBookedTimeSlots(type, name, date);
    
    // Filter out booked slots
    return allSlots.filter(slot => !bookedSlots.includes(slot));
  } catch (err) {
    console.error('Error getting available time slots:', err.message);
    throw err;
  }
}

module.exports = {
  getAvailableTimeSlots,
  getBookedTimeSlots,
  getAllTimeSlots
}; 