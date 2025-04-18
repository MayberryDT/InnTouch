/**
 * Debug middleware to log all API requests and responses
 * Useful for troubleshooting API issues
 */

const debugRoutes = (req, res, next) => {
  // Log the request
  console.log(`\n[DEBUG] ${new Date().toISOString()}`);
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  
  // Capture the original json method
  const originalJson = res.json;
  
  // Override the json method to log the response
  res.json = function(obj) {
    console.log('Response:', JSON.stringify(obj, null, 2));
    console.log(`Status: ${res.statusCode}`);
    console.log('[DEBUG END]\n');
    
    // Call the original method
    return originalJson.call(this, obj);
  };
  
  next();
};

module.exports = debugRoutes; 