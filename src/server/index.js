const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const guestRoutes = require('./routes/guest');
const { configurePassport } = require('./middleware/auth');

const app = express();

// Configure and initialize passport
const passport = configurePassport();
app.use(passport.initialize());

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(), // Keep helmet's other defaults
        "img-src": ["'self'", "data:", "source.unsplash.com", "images.unsplash.com"], // Allow self, data:, and BOTH unsplash domains
      },
    },
  })
); // Security headers with custom CSP for images
app.use(cors()); // Enable CORS
app.use(compression()); // Compress responses
app.use(morgan(config.isDevelopment() ? 'dev' : 'combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));
console.log('Serving static files from:', path.join(__dirname, '../../public'));

// Routes
app.use('/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/guest', guestRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.isDevelopment() ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Database path: ${config.dbPath}`);
}); 