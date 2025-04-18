/**
 * Cloudbeds API Client Module
 * 
 * This module provides a client for interacting with the Cloudbeds API.
 * It handles authentication, API requests, and error handling.
 */

const fetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');
const { logApiError, formatApiErrorResponse } = require('../utils/api-error-handler');

class CloudbedsApiClient {
  constructor() {
    this.apiKey = process.env.CLOUDBEDS_API_KEY;
    this.apiBaseUrl = process.env.CLOUDBEDS_API_URL;
    this.useMockData = !this.apiKey || !this.apiBaseUrl;
    
    if (this.useMockData) {
      console.warn('Warning: Cloudbeds API credentials are missing. Using mock data for development and testing.');
    }
  }

  /**
   * Make a request to the Cloudbeds API
   * 
   * @param {string} endpoint - API endpoint path
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {Object} params - Query parameters or body for the request
   * @returns {Promise<Object>} - API response data
   * @throws {Error} - If the API request fails
   */
  async request(endpoint, method = 'GET', params = {}) {
    // If no API credentials, return mock data
    if (this.useMockData) {
      return this._getMockData(endpoint, params);
    }
    
    // Track response object for error context
    let response = null;
    
    try {
      const url = new URL(`${this.apiBaseUrl}${endpoint}`);
      
      // Configure request options
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // Add timeout to prevent hanging requests
        timeout: 10000 // 10 seconds
      };

      // Add query parameters for GET requests or body for others
      if (method === 'GET' && Object.keys(params).length > 0) {
        // Add query parameters to URL for GET requests
        url.search = new URLSearchParams(params).toString();
      } else if (Object.keys(params).length > 0) {
        // Add JSON body for non-GET requests
        options.body = JSON.stringify(params);
      }

      // Log the request (without sensitive headers)
      console.log(`Making ${method} request to Cloudbeds API: ${endpoint}`);
      
      // Send the request
      response = await fetch(url.toString(), options);
      
      // Parse the response
      const data = await response.json();
      
      // Check for API errors
      if (!response.ok) {
        // Create a more detailed error with status code
        const error = new Error(`Cloudbeds API error: ${data.message || response.statusText}`);
        error.status = response.status;
        error.data = data;
        
        // Log the error with our enhanced error handler
        logApiError(error, 'Cloudbeds API', { 
          endpoint, 
          method,
          status: response.status,
          response: response
        });
        
        throw error;
      }
      
      return data;
    } catch (error) {
      // Use our enhanced API error logging
      logApiError(error, 'Cloudbeds API', { 
        endpoint, 
        method,
        params: method === 'GET' ? params : null, // Only log GET params
        response
      });
      
      // Add more context to the error
      error.endpoint = endpoint;
      error.method = method;
      
      // Throw the enhanced error
      throw error;
    }
  }

  /**
   * Generate mock data for development
   * 
   * @param {string} endpoint - The endpoint being called
   * @param {Object} params - The parameters for the request
   * @returns {Object} - Mock data for the given endpoint
   */
  _getMockData(endpoint, params = {}) {
    console.log(`[MOCK DATA] Using mock data for Cloudbeds API call to ${endpoint}`);
    
    // Mock data for guests endpoint
    if (endpoint === '/guests') {
      return [
        {
          id: '1001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '123-456-7890',
          room_number: '101',
          check_in_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          check_out_date: new Date(Date.now() + 86400000 * 3).toISOString() // 3 days from now
        },
        {
          id: '1002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          phone: '123-456-7891',
          room_number: '102',
          check_in_date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          check_out_date: new Date(Date.now() + 86400000 * 2).toISOString() // 2 days from now
        }
      ];
    }
    
    // Mock data for specific guest
    if (endpoint.startsWith('/guests/')) {
      const guestId = endpoint.split('/')[2];
      return {
        id: guestId,
        first_name: 'Guest',
        last_name: `${guestId}`,
        email: `guest${guestId}@example.com`,
        phone: '123-456-7899',
        room_number: `10${guestId.slice(-1)}`,
        check_in_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        check_out_date: new Date(Date.now() + 86400000 * 3).toISOString() // 3 days from now
      };
    }
    
    // Mock data for reservations
    if (endpoint === '/reservations') {
      return [
        {
          id: '5001',
          guest_id: '1001',
          room_id: '101',
          arrival_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          departure_date: new Date(Date.now() + 86400000 * 3).toISOString() // 3 days from now
        },
        {
          id: '5002',
          guest_id: '1002',
          room_id: '102',
          arrival_date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          departure_date: new Date(Date.now() + 86400000 * 2).toISOString() // 2 days from now
        }
      ];
    }
    
    // Default empty response
    return {};
  }

  /**
   * Get all guests currently checked in at the property
   * 
   * @returns {Promise<Array>} - List of guests
   */
  async getActiveGuests() {
    return this.request('/guests', 'GET', { status: 'checked_in' });
  }

  /**
   * Get details for a specific guest
   * 
   * @param {string} guestId - Guest ID from Cloudbeds
   * @returns {Promise<Object>} - Guest details
   */
  async getGuest(guestId) {
    return this.request(`/guests/${guestId}`, 'GET');
  }

  /**
   * Get all reservations with optional filters
   * 
   * @param {Object} filters - Filters for the reservations query
   * @returns {Promise<Array>} - List of reservations
   */
  async getReservations(filters = {}) {
    return this.request('/reservations', 'GET', filters);
  }

  /**
   * Get details for a specific reservation
   * 
   * @param {string} reservationId - Reservation ID from Cloudbeds
   * @returns {Promise<Object>} - Reservation details
   */
  async getReservation(reservationId) {
    return this.request(`/reservations/${reservationId}`, 'GET');
  }
}

// Create and export a singleton instance
const cloudbeds = new CloudbedsApiClient();
module.exports = cloudbeds;