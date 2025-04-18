const db = require('../../database/db'); // Use central DB connection helpers

/**
 * Get a guest by ID
 * @param {number} id - The guest ID
 * @returns {Promise<Object|null>} - The guest object or null if not found
 */
const getGuestById = async (id) => { // Make async
  const query = `
    SELECT id, name, room_number, check_in, check_out 
    FROM guests 
    WHERE id = $1
  `;
  // Use await with the promisified db.get
  return await db.get(query, [id]); 
};

/**
 * Check if a guest is active (has not checked out)
 * @param {number} id - The guest ID
 * @returns {Promise<boolean>} - True if the guest is active, false otherwise
 */
const isGuestActive = async (id) => {
  try {
    const guest = await getGuestById(id);
    
    if (!guest) {
      return false;
    }
    
    // Convert check_out string to Date object
    const checkOutDate = new Date(guest.check_out);
    const currentDate = new Date();
    
    // Guest is active if check_out date is in the future
    return checkOutDate > currentDate;
  } catch (error) {
    console.error('Error checking if guest is active:', error);
    return false;
  }
};

/**
 * Save guest data to the database (create or update)
 * @param {Object} guestData - The guest data to save
 * @param {string} guestData.name - Guest's full name
 * @param {string} guestData.room_number - Guest's room number
 * @param {string} guestData.check_in - Check-in date (ISO format)
 * @param {string} guestData.check_out - Check-out date (ISO format)
 * @param {string} guestData.cloudbeds_data - JSON string of Cloudbeds data
 * @returns {Promise<Object>} - The saved guest object with ID
 */
const saveGuest = async (guestData) => { // Make async
  // First check if guest with this name and room exists (for updating)
  const checkQuery = `
    SELECT id FROM guests 
    WHERE name = $1 AND room_number = $2
  `;
  
  // Use await with promisified db.get
  const existingGuest = await db.get(checkQuery, [guestData.name, guestData.room_number]);

  if (existingGuest) {
    // Update existing guest
    const updateQuery = `
      UPDATE guests
      SET check_in = $1,
          check_out = $2,
          cloudbeds_data = $3
      WHERE id = $4
    `;
    
    // Use db.run which is suitable for UPDATE/INSERT/DELETE without RETURNING
    await db.run(updateQuery, [
      guestData.check_in,
      guestData.check_out,
      guestData.cloudbeds_data,
      existingGuest.id
    ]);
    
    // Return the updated guest
    return { id: existingGuest.id, ...guestData, updated: true };
  } else {
    // Insert new guest
    const insertQuery = `
      INSERT INTO guests (name, room_number, check_in, check_out, cloudbeds_data)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `;
    
    // Use db.query for INSERT with RETURNING
    const result = await db.query(insertQuery, [
      guestData.name,
      guestData.room_number,
      guestData.check_in,
      guestData.check_out,
      guestData.cloudbeds_data
    ]);
    
    // Return the new guest with the generated ID
    const newId = result.rows[0]?.id;
    if (newId === undefined) {
      console.error("Insert query did not return an ID.");
      throw new Error("Failed to retrieve ID for new guest.");
    }
    return { id: newId, ...guestData, created: true };
  }
};

/**
 * Get all active guests (not checked out)
 * @returns {Promise<Array>} - Array of active guest objects
 */
const getAllActiveGuests = async () => { // Make async
  const currentDate = new Date().toISOString();
  
  const query = `
    SELECT id, name, room_number, check_in, check_out 
    FROM guests 
    WHERE check_out > $1
    ORDER BY room_number
  `;
  
  // Use await with promisified db.all
  return await db.all(query, [currentDate]);
};

/**
 * Find a guest by room number and last name (case-insensitive)
 * @param {string} roomNumber - The guest's room number
 * @param {string} lastName - The guest's last name
 * @returns {Promise<Object|null>} - The guest object or null if not found
 */
const findGuestByRoomAndName = async (roomNumber, lastName) => { // Make async
  // Using LOWER() for case-insensitive comparison on the name
  const query = `
    SELECT id, name, room_number, check_in, check_out 
    FROM guests 
    WHERE room_number = $1 AND LOWER(name) LIKE LOWER($2)
  `;

  // Use await with promisified db.get
  // Note: Using LIKE for flexibility with potential variations in last name format
  return await db.get(query, [roomNumber, `%${lastName}%`]); 
};

/**
 * Find an active guest by their room number.
 * An active guest is one whose check_out date is in the future.
 * @param {string} roomNumber - The guest's room number
 * @returns {Promise<Object|null>} - The active guest object or null if not found
 */
const findActiveGuestByRoom = async (roomNumber) => {
  // Get the current full ISO timestamp
  const nowISO = new Date().toISOString(); 
  const query = `
    SELECT id, name, room_number 
    FROM guests 
    WHERE room_number = $1 
      -- Compare full timestamps directly
      AND check_out > $2 
    LIMIT 1; -- Return only one guest even if multiple share a room (unlikely but safe)
  `;
  // Use await with the promisified db.get
  // Pass the full ISO string for comparison
  return await db.get(query, [roomNumber, nowISO]); 
};

module.exports = {
  getGuestById,
  isGuestActive,
  saveGuest,
  getAllActiveGuests,
  findGuestByRoomAndName,
  findActiveGuestByRoom
}; 