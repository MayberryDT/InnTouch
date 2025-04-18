/**
 * Custom middleware for logging requests
 * Adds a timestamp to each request and logs the HTTP method and URL
 */
const requestLogger = (req, res, next) => {
  // Add timestamp to the request object
  req.requestTime = new Date().toISOString();
  
  // Log request details
  console.log(`[${req.requestTime}] ${req.method} ${req.originalUrl}`);
  
  // Call next middleware in the stack
  next();
};

module.exports = requestLogger; 