/**
 * Script to add test chat data to the database
 * Run with: node scripts/add-test-chats.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../hospitality.db');

// Open database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the hospitality database.');
});

// Get guest IDs from the database
db.all('SELECT id, name, room_number FROM guests LIMIT 3', [], (err, guests) => {
  if (err) {
    console.error('Error fetching guests:', err.message);
    db.close();
    process.exit(1);
  }

  if (guests.length === 0) {
    console.log('No guests found in the database. Please add guests first.');
    db.close();
    process.exit(1);
  }

  console.log(`Found ${guests.length} guests to create test chats for.`);

  // Add chat messages for each guest
  const now = new Date();
  let messagesAdded = 0;
  
  // Process guests one by one
  processNextGuest(0);

  function processNextGuest(index) {
    if (index >= guests.length) {
      console.log(`Added ${messagesAdded} test chat messages to the database.`);
      db.close();
      return;
    }

    const guest = guests[index];
    console.log(`Adding chat messages for ${guest.name} (Room ${guest.room_number})...`);

    // Create messages for this guest
    const guestMessages = [
      {
        guest_id: guest.id,
        message: 'Hello, I need some assistance please.',
        sender_type: 'guest',
        timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString() // 10 minutes ago
      },
      {
        guest_id: guest.id,
        message: 'How can I help you today?',
        sender_type: 'ai',
        timestamp: new Date(now.getTime() - 1000 * 60 * 9).toISOString() // 9 minutes ago
      },
      {
        guest_id: guest.id,
        message: 'I need to speak with a staff member.',
        sender_type: 'guest',
        timestamp: new Date(now.getTime() - 1000 * 60 * 8).toISOString() // 8 minutes ago
      }
    ];

    // Insert all messages for this guest
    db.serialize(() => {
      const stmt = db.prepare('INSERT INTO chat_logs (guest_id, message, sender_type, timestamp) VALUES (?, ?, ?, ?)');
      
      guestMessages.forEach(msg => {
        stmt.run(msg.guest_id, msg.message, msg.sender_type, msg.timestamp, (err) => {
          if (err) {
            console.error('Error inserting chat message:', err.message);
          } else {
            messagesAdded++;
          }
        });
      });
      
      stmt.finalize(() => {
        // Move to the next guest
        processNextGuest(index + 1);
      });
    });
  }
}); 