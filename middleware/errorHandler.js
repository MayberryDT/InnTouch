/**
 * Custom error handling middleware
 * Handles errors that occur during request processing
 */

// Not found error handler - for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Set status code
  const statusCode = err.status || 500;
  
  // Log error details for server-side troubleshooting
  console.error(`[ERROR] ${err.message}`);
  if (statusCode === 500) {
    console.error(err.stack);
  }
  
  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : err.message
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};