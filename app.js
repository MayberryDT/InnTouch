// Express application for Inn Touch
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');

// Custom middleware
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { configurePassport } = require('./src/server/middleware/auth');
const debugRoutes = require('./middleware/debugRoutes');

// API Routes
const chatRoutes = require('./src/server/routes/chat');
const guestRoutes = require('./src/server/routes/guest');
const staffRoutes = require('./src/server/routes/staff');
const authRoutes = require('./src/server/routes/auth');

// Database connection
const db = require('./src/database/db');

// Initialize Express application
const app = express();

// Configure middleware
// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(), // Start with defaults
      "default-src": ["'self'"],
      "connect-src": ["'self'", "ws://localhost:3003"], // Allow self and WebSocket
      "script-src": ["'self'", "https://cdnjs.cloudflare.com", "https://unpkg.com"], // Allow scripts from self, CDNJS, Unpkg (for Leaflet)
      "script-src-attr": ["'none'"], // Keep blocking inline event handlers for now
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"], // Allow inline styles (needed by Leaflet potentially), fonts, CDN styles
      "img-src": ["'self'", "data:", "https://unpkg.com", "https://*.tile.openstreetmap.org", "https://images.unsplash.com"], // Allow images from self, data URLs, Unpkg (Leaflet), OpenStreetMap tiles, Unsplash
      "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"], // Allow fonts from self, Google Fonts, FontAwesome CDN
      "frame-src": ["'self'"] // Adjust if embedding external content
    }
  }
}));

// CORS support
app.use(cors());

// Request logging
app.use(morgan('dev'));

// JSON and URL-encoded data parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
configurePassport();
app.use(passport.initialize());

// Custom request logger middleware
app.use(requestLogger);

// Debug middleware for API routes
app.use('/api', debugRoutes);
app.use('/guest/api', debugRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes
// Basic route to confirm the server is running
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Inn Touch API is running',
    version: '1.0.0',
    timestamp: req.requestTime
  });
});

// --- Add Health Check Route --- 
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});
// --- End Health Check Route ---

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/guest', guestRoutes); // This mounts all guest routes at /guest
app.use('/api/staff', staffRoutes);
app.use('/api/auth', authRoutes);

// API Availability Endpoint - for testing the API from frontend directly
app.get('/api/availability', (req, res) => {
  // Redirect to the proper route while preserving query parameters
  const queryString = Object.keys(req.query)
    .map(key => `${key}=${encodeURIComponent(req.query[key])}`)
    .join('&');
  
  res.redirect(`/guest/api/availability?${queryString}`);
});

// API Booking Endpoint - for testing the API from frontend directly
app.post('/api/guest/booking', (req, res) => {
  // Redirect to the proper endpoint with the body intact
  req.url = '/guest/api/booking';
  
  // Add guest_id if not present
  if (!req.body.guest_id) {
    req.body.guest_id = 1; // Default guest ID for testing
  }
  
  // Forward to /guest/api/booking
  app.handle(req, res);
});

// Root route redirects to the guest-facing home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database status route - for testing the database connection
app.get('/api/db-status', async (req, res) => {
  try {
    await db.initDatabase();
    res.json({
      status: 'connected',
      message: 'Database is connected',
      dbPath: process.env.DB_PATH || 'hospitality.db'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app; 