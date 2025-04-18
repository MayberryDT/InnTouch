// Main server file for Inn Touch
require('dotenv').config();
const app = require('./app');
const db = require('./src/database/db');
const { initWebSocketServer } = require('./src/server/websocket');

// Define the port to listen on
const PORT = process.env.PORT || 3000;

// Initialize the database and start the server
db.initDatabase()
  .then(() => {
    // Start the Express server
    const server = app.listen(PORT, () => {
      console.log(`Inn Touch server running on port ${PORT}`);
      console.log(`API status available at: http://localhost:${PORT}/api/status`);
    });
    
    // Initialize WebSocket server
    const wss = initWebSocketServer();
    
    // Handle server shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        wss.close(() => {
          console.log('WebSocket server closed');
          process.exit(0);
        });
      });
    });
  })
  .catch(err => {
    console.error('Failed to initialize the database:', err.message);
    process.exit(1);
  }); 