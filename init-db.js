// init-db.js
// Script to initialize the PostgreSQL database schema

require('dotenv').config(); // Load environment variables (especially DATABASE_URL for local testing)
const db = require('./src/database/db');

async function initialize() {
  console.log('Running database initialization script...');
  try {
    // The initDatabase function now connects and runs the schema
    await db.initDatabase(); 
    console.log('Database initialization script completed successfully.');
  } catch (err) {
    console.error('Database initialization script failed:', err.message);
    process.exit(1); // Exit with error code
  } finally {
    // Close the pool after initialization
    await db.closeDatabase();
  }
}

// Run the initialization function
initialize(); 