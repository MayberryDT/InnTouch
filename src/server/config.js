require('dotenv').config();
const path = require('path');

// Helper function to validate required environment variables
const validateEnv = (requiredVars) => {
  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
};

// Define required environment variables
const requiredEnvVars = [
  'PORT',
  'DB_PATH',
  'JWT_SECRET',
  'JWT_EXPIRES_IN'
];

// Optional but recommended environment variables
const recommendedEnvVars = [
  'CLOUDBEDS_API_KEY',
  'CLOUDBEDS_API_URL',
  'WS_PORT'
];

// Validate required environment variables
if (!validateEnv(requiredEnvVars)) {
  console.warn('Please set all required environment variables in your .env file.');
  console.warn('Application may not function correctly without them.');
}

// Check recommended variables
const missingRecommended = recommendedEnvVars.filter(varName => !process.env[varName]);
if (missingRecommended.length > 0) {
  console.warn(`Missing recommended environment variables: ${missingRecommended.join(', ')}`);
  console.warn('Some features may not work properly.');
}

// Export configuration
module.exports = {
  // Server config
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database config
  dbPath: path.resolve(process.env.DB_PATH || 'src/database/inn-touch.db'),
  
  // JWT config
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Cloudbeds API config
  cloudbedsApiKey: process.env.CLOUDBEDS_API_KEY,
  cloudbedsApiUrl: process.env.CLOUDBEDS_API_URL || 'https://api.cloudbeds.com/api/v1.1',
  
  // WebSocket config
  wsPort: parseInt(process.env.WS_PORT, 10) || 3001,
  
  // Logging config
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Utility method to check if we're in production
  isProduction: () => process.env.NODE_ENV === 'production',
  
  // Utility method to check if we're in development
  isDevelopment: () => process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
}; 