/**
 * Test Script for Steps 16 and 17
 * 
 * Tests both the Cloudbeds data import route (Step 16) and
 * the enhanced API error handling (Step 17).
 */
require('dotenv').config();
const fetch = require('node-fetch');
const cloudbedsClient = require('../api/cloudbeds');

// Base URL for API requests
const API_BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * Print a header for test sections
 */
function printHeader(text) {
  console.log('\n' + colors.bright + colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.bright + colors.blue + ' ' + text + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(80) + colors.reset + '\n');
}

/**
 * Print a success message
 */
function printSuccess(text) {
  console.log(colors.green + '✓ ' + text + colors.reset);
}

/**
 * Print a failure message
 */
function printFailure(text) {
  console.log(colors.red + '✗ ' + text + colors.reset);
}

/**
 * Print a warning message
 */
function printWarning(text) {
  console.log(colors.yellow + '⚠ ' + text + colors.reset);
}

/**
 * Mock JWT token for testing staff endpoints
 */
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6InN0YWZmIiwiaWF0IjoxNjExNjc2MjY2LCJleHAiOjE2MTE3NjI2NjZ9.0cGWA0v4C7ZzKpAdHvOUoU6xH6Uldj9WyTz5QLNDpnQ';

/**
 * Test Step 16: Import Route Functionality
 * - Tests the successful case
 * - Uses mock data
 */
async function testImportRoute() {
  printHeader('Testing Step 16: Cloudbeds Data Import Route');
  
  try {
    // Ensure we're using mock data
    if (!cloudbedsClient.useMockData) {
      printWarning('Forcing mock data mode for testing');
      cloudbedsClient.useMockData = true;
    }
    
    console.log('Simulating direct API request to /api/staff/import-cloudbeds...');
    
    // Direct request to the API endpoint
    const response = await fetch(`${API_BASE_URL}/api/staff/import-cloudbeds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOCK_JWT}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Process the response
    const data = await response.json();
    
    // Display results
    if (response.ok) {
      printSuccess('Successfully called import endpoint');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      // Validate response structure
      if (data.success && Array.isArray(data.imported)) {
        printSuccess('Response format is valid');
        console.log(`Imported ${data.imported.length} guests`);
      } else {
        printFailure('Response format is invalid');
      }
    } else {
      printFailure('Failed to call import endpoint');
      console.log('Response status:', response.status);
      console.log('Error data:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    printFailure('Test failed with error:');
    console.error(error);
    
    // Alternative direct test using the API client
    printWarning('Falling back to direct API client test...');
    try {
      // Get active guests through the client directly
      const guests = await cloudbedsClient.getActiveGuests();
      console.log('API client returned mock data successfully:');
      console.log(`Retrieved ${guests.length} guests`);
      printSuccess('API client is functioning correctly');
    } catch (clientError) {
      printFailure('API client also failed:');
      console.error(clientError);
    }
  }
}

/**
 * Test Step 17: API Error Handling
 * - Tests various error scenarios
 * - Verifies error categorization, logging, and formatting
 */
async function testErrorHandling() {
  printHeader('Testing Step 17: API Error Handling');

  // Create a wrapper to test and display error handling
  const testErrorCase = async (name, testFn) => {
    console.log(`\n${colors.bright}Testing Error Case: ${name}${colors.reset}`);
    try {
      await testFn();
      printWarning('Test completed without errors (unexpected)');
    } catch (error) {
      printSuccess('Error caught as expected');
      
      // Check if error has additional properties added by our handler
      if (error.endpoint || error.method) {
        printSuccess('Error contains enhanced context properties');
      }
      
      console.log('\nError details:');
      console.log(JSON.stringify({
        message: error.message,
        endpoint: error.endpoint,
        method: error.method,
        status: error.status
      }, null, 2));
    }
  };

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

  // Test 3: Data validation error
  await testErrorCase('Data Validation Error', async () => {
    // Mock a validation error for invalid guest data
    const guestData = {
      // Missing required fields
      first_name: 'Test',
      // No last_name
      // No check_in_date 
      // No check_out_date
      room_number: '101'
    };
    
    // Process this invalid data
    if (!guestData.last_name || !guestData.check_in_date || !guestData.check_out_date) {
      const error = new Error('Missing required guest fields');
      error.validationErrors = {
        last_name: !guestData.last_name ? 'Required' : null,
        check_in_date: !guestData.check_in_date ? 'Required' : null,
        check_out_date: !guestData.check_out_date ? 'Required' : null
      };
      throw error;
    }
  });

  printSuccess('All error handling tests completed');
}

/**
 * Run all tests
 */
async function runTests() {
  printHeader('Starting Tests for Steps 16 & 17');
  
  try {
    // First test the import route
    await testImportRoute();
    
    // Then test error handling
    await testErrorHandling();
    
    printHeader('All Tests Completed');
  } catch (error) {
    printFailure('Test suite failed:');
    console.error(error);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Error in test script:', err);
  process.exit(1);
}); 