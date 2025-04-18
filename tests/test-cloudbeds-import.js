/**
 * Test for the Cloudbeds API Import Functionality
 * 
 * This script tests the Cloudbeds API client and guest import
 * functionality by simulating what happens when the import-cloudbeds
 * endpoint is called.
 */
require('dotenv').config();

// Override environment variables to ensure mock data is used
process.env.CLOUDBEDS_API_KEY = '';
process.env.CLOUDBEDS_API_URL = '';

const cloudbedsClient = require('../src/server/api/cloudbeds');
const db = require('../src/server/db');

// Simulate what happens when /staff/api/import-cloudbeds is called
async function testCloudbedsImport() {
  try {
    console.log('===== Testing Cloudbeds API Import Functionality =====');
    console.log('1. Getting active guests from Cloudbeds API');
    
    // Get active guests from Cloudbeds (mock data in development)
    const activeGuests = await cloudbedsClient.getActiveGuests();
    console.log(`Retrieved ${activeGuests.length} active guests`);
    console.log('Sample guest:', JSON.stringify(activeGuests[0], null, 2));
    
    // Process guest data
    console.log('\n2. Processing and saving guest data to database');
    const savedGuests = [];
    const errors = [];
    
    for (const guest of activeGuests) {
      try {
        // Format guest data for our database
        const guestData = {
          name: `${guest.first_name} ${guest.last_name}`,
          room_number: guest.room_number || 'Unassigned',
          check_in: guest.check_in_date,
          check_out: guest.check_out_date,
          cloudbeds_data: JSON.stringify(guest)
        };
        
        console.log(`Processing guest: ${guestData.name} in room ${guestData.room_number}`);
        
        // Save to database (insert or update)
        const savedGuest = await db.saveGuest(guestData);
        savedGuests.push(savedGuest);
        console.log(`Guest saved with ID: ${savedGuest.id}, ${savedGuest.created ? 'Created new' : 'Updated existing'}`);
      } catch (guestError) {
        // Track individual guest errors but continue processing others
        console.error(`Error processing guest ${guest.id}:`, guestError.message);
        errors.push({
          guestId: guest.id,
          error: guestError.message
        });
      }
    }
    
    // Get all active guests from database to verify
    console.log('\n3. Verifying saved guests in database');
    const dbGuests = await db.getAllActiveGuests();
    console.log(`Found ${dbGuests.length} active guests in database`);
    console.log('Sample guest from database:', JSON.stringify(dbGuests[0], null, 2));
    
    // Display results
    console.log('\n===== Results =====');
    console.log(`Successfully processed ${savedGuests.length} guests`);
    if (errors.length > 0) {
      console.log(`Encountered ${errors.length} errors`);
      console.log('Errors:', errors);
    } else {
      console.log('No errors encountered');
    }
    
    console.log('\n===== Test Completed Successfully =====');
  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testCloudbedsImport(); 