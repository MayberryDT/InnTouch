/**
 * Test API Error Handling
 * 
 * This script tests the enhanced API error handling by simulating
 * different error scenarios when using the Cloudbeds API client.
 */
require('dotenv').config();
const cloudbedsClient = require('../api/cloudbeds');
const { formatApiErrorResponse } = require('../utils/api-error-handler');

// Create a wrapper to test and display error handling
async function testErrorCase(name, testFn) {
  console.log(`\n==== Testing Error Case: ${name} ====`);
  try {
    await testFn();
    console.log('✓ Test completed without errors (unexpected)');
  } catch (error) {
    console.log('✓ Error caught as expected');
    
    // Format the error using our enhanced error handler
    const formattedError = formatApiErrorResponse(error, 'Test', { context: name });
    
    console.log('\nFormatted error response that would be sent to client:');
    console.log(JSON.stringify(formattedError, null, 2));
  }
}

// Run all the test cases
async function runTests() {
  console.log('===== API Error Handling Test =====');

  // Test 1: Network error (invalid API URL)
  await testErrorCase('Network Error', async () => {
    // Temporarily override the API URL to an invalid one
    const original = cloudbedsClient.apiBaseUrl;
    cloudbedsClient.apiBaseUrl = 'https://invalid-api-url.example.com';
    cloudbedsClient.useMockData = false;
    
    try {
      await cloudbedsClient.getActiveGuests();
    } finally {
      // Restore original values
      cloudbedsClient.apiBaseUrl = original;
      cloudbedsClient.useMockData = !cloudbedsClient.apiKey || !cloudbedsClient.apiBaseUrl;
    }
  });

  // Test 2: Authentication error (invalid API key)
  await testErrorCase('Authentication Error', async () => {
    // Temporarily override the API key to an invalid one
    const original = cloudbedsClient.apiKey;
    cloudbedsClient.apiKey = 'invalid-api-key';
    cloudbedsClient.useMockData = false;
    
    try {
      await cloudbedsClient.getActiveGuests();
    } finally {
      // Restore original values
      cloudbedsClient.apiKey = original;
      cloudbedsClient.useMockData = !cloudbedsClient.apiKey || !cloudbedsClient.apiBaseUrl;
    }
  });

  // Test 3: Invalid request parameters
  await testErrorCase('Invalid Parameters', async () => {
    // Mock an error from invalid parameters
    const error = new Error('Invalid request parameters');
    error.message = 'Validation failed: guest_id is required';
    throw error;
  });

  // Test 4: Server error
  await testErrorCase('Server Error', async () => {
    // Mock a server error
    const error = new Error('Internal server error');
    error.status = 500;
    throw error;
  });

  // Test 5: Rate limiting
  await testErrorCase('Rate Limit Error', async () => {
    // Mock a rate limit error
    const error = new Error('Too many requests');
    error.status = 429;
    throw error;
  });

  console.log('\n===== API Error Handling Test Complete =====');
}

// Run the tests
runTests().catch(err => {
  console.error('Error in test script:', err);
  process.exit(1);
}); 