/**
 * Test script for the saveGuest function
 * Simulates saving guest data from Cloudbeds API
 */
require('dotenv').config();
const path = require('path');
const db = require('../src/server/db');

// Mock guest data similar to what would come from Cloudbeds API
const testGuest = {
  id: '1001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '123-456-7890',
  room_number: '101',
  check_in_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  check_out_date: new Date(Date.now() + 86400000 * 3).toISOString() // 3 days from now
};

// Format guest data for database
const guestData = {
  name: `${testGuest.first_name} ${testGuest.last_name}`,
  room_number: testGuest.room_number,
  check_in: testGuest.check_in_date,
  check_out: testGuest.check_out_date,
  cloudbeds_data: JSON.stringify(testGuest)
};

// Test saveGuest function
async function testSaveGuest() {
  try {
    console.log('Testing saveGuest function...');
    console.log('Guest data:', guestData);
    
    // Save guest to database
    const savedGuest = await db.saveGuest(guestData);
    console.log('Success! Guest saved:', savedGuest);
    
    // Verify the guest was saved by retrieving it
    const retrievedGuest = await db.getGuestById(savedGuest.id);
    console.log('Retrieved guest from database:', retrievedGuest);
    
    // Get all active guests
    const activeGuests = await db.getAllActiveGuests();
    console.log('All active guests:', activeGuests);
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Error in test:', error.message);
  }
}

// Run the test
testSaveGuest(); 