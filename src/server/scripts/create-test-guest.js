const sqlite3 = require('sqlite3').verbose();
const config = require('../config');
const path = require('path');

// Create a database connection
const db = new sqlite3.Database(config.dbPath);

// Create guests table if it doesn't exist
const createTable = `
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  cloudbeds_data TEXT
)`;

// Insert a test guest
const insertGuest = `
INSERT INTO guests (name, room_number, check_in, check_out, cloudbeds_data)
VALUES (?, ?, ?, ?, ?)
`;

// Future checkout date (1 week from now)
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 7);

// Current date
const currentDate = new Date();

// Execute queries
db.serialize(() => {
  db.run(createTable, err => {
    if (err) {
      console.error('Error creating table:', err);
      return;
    }
    console.log('Guests table created or already exists');
    
    // Insert test guest
    db.run(
      insertGuest,
      [
        'Test Guest',
        '101',
        currentDate.toISOString(),
        futureDate.toISOString(),
        JSON.stringify({ reservation_id: '12345' })
      ],
      function(err) {
        if (err) {
          console.error('Error inserting guest:', err);
          return;
        }
        console.log(`Test guest inserted with ID: ${this.lastID}`);
        
        // Close the database connection
        db.close();
      }
    );
  });
}); 