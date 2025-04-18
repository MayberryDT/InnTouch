/**
 * API Error Handler Module
 * 
 * This module provides utilities for handling API errors consistently across the application.
 * It includes functions for categorizing, logging, and formatting error responses.
 */

/**
 * API Error Types
 */
const API_ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  AUTH: 'AUTHENTICATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Categorize an API error based on its characteristics
 * 
 * @param {Error} error - The error object
 * @param {Object} response - The API response object (if available)
 * @returns {string} - The categorized error type
 */
function categorizeApiError(error, response = null) {
  // Network errors (no response received)
  if (error.name === 'FetchError' || error.message.includes('network')) {
    return API_ERROR_TYPES.NETWORK;
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout')) {
    return API_ERROR_TYPES.TIMEOUT;
  }

  // If we have a response object with status code, categorize by status
  if (response && response.status) {
    // Authentication errors
    if (response.status === 401 || response.status === 403) {
      return API_ERROR_TYPES.AUTH;
    }
    
    // Rate limiting
    if (response.status === 429) {
      return API_ERROR_TYPES.RATE_LIMIT;
    }
    
    // Server errors
    if (response.status >= 500) {
      return API_ERROR_TYPES.SERVER;
    }
    
    // Client errors
    if (response.status >= 400) {
      return API_ERROR_TYPES.CLIENT;
    }
  }

  // Check error message for clues
  const errorMsg = error.message.toLowerCase();
  if (errorMsg.includes('auth') || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
    return API_ERROR_TYPES.AUTH;
  }
  
  if (errorMsg.includes('validate') || errorMsg.includes('validation') || errorMsg.includes('invalid')) {
    return API_ERROR_TYPES.VALIDATION;
  }
  
  // Default to unknown error
  return API_ERROR_TYPES.UNKNOWN;
}

/**
 * Log an API error with detailed information
 * 
 * @param {Error} error - The error object
 * @param {string} source - The source of the error (e.g., 'Cloudbeds API', 'Database')
 * @param {Object} context - Additional context information
 */
function logApiError(error, source, context = {}) {
  const errorType = categorizeApiError(error, context.response);
  
  // Create structured error log with all relevant information
  const errorLog = {
    timestamp: new Date().toISOString(),
    errorType,
    source,
    message: error.message,
    stack: error.stack,
    context
  };
  
  // Log detailed error information
  console.error(`API ERROR [${source}] [${errorType}]: ${error.message}`);
  console.error(JSON.stringify(errorLog, null, 2));
}

/**
 * Format an API error response for the client
 * 
 * @param {Error} error - The error object
 * @param {string} source - The source of the error (e.g., 'Cloudbeds API')
 * @param {Object} context - Additional context information
 * @returns {Object} - Formatted error response
 */
function formatApiErrorResponse(error, source, context = {}) {
  const errorType = categorizeApiError(error, context.response);
  
  // Create user-friendly error messages
  let userMessage = 'An unexpected error occurred while processing your request.';
  let statusCode = 500;
  
  switch (errorType) {
    case API_ERROR_TYPES.NETWORK:
      userMessage = 'Cannot connect to the external service. Please check your internet connection and try again.';
      statusCode = 503;
      break;
    case API_ERROR_TYPES.TIMEOUT:
      userMessage = 'The request timed out. Please try again later.';
      statusCode = 504;
      break;
    case API_ERROR_TYPES.AUTH:
      userMessage = 'Authentication failed with the external service. Please check your credentials.';
      statusCode = 401;
      break;
    case API_ERROR_TYPES.RATE_LIMIT:
      userMessage = 'Too many requests to the external service. Please try again later.';
      statusCode = 429;
      break;
    case API_ERROR_TYPES.SERVER:
      userMessage = 'The external service is experiencing issues. Please try again later.';
      statusCode = 502;
      break;
    case API_ERROR_TYPES.CLIENT:
      userMessage = 'Invalid request to the external service. Please check your inputs.';
      statusCode = 400;
      break;
    case API_ERROR_TYPES.VALIDATION:
      userMessage = 'The data provided is invalid. Please check your inputs.';
      statusCode = 422;
      break;
  }
  
  // Return formatted error response
  return {
    success: false,
    statusCode,
    error: {
      type: errorType,
      source,
      message: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  };
}

module.exports = {
  API_ERROR_TYPES,
  categorizeApiError,
  logApiError,
  formatApiErrorResponse
}; 