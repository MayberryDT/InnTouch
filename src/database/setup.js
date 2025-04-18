const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'inn-touch.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Create tables
db.serialize(() => {
    // Users table (for both staff and guests)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('staff', 'guest')),
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Rooms table
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_number TEXT UNIQUE NOT NULL,
        room_type TEXT NOT NULL,
        floor INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('available', 'occupied', 'maintenance')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        guest_id INTEGER NOT NULL,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (guest_id) REFERENCES users(id)
    )`);

    // Messages table (for chat)
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
    )`);

    // Room service orders
    db.run(`CREATE TABLE IF NOT EXISTS room_service_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        items TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'preparing', 'delivered', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guest_id) REFERENCES users(id),
        FOREIGN KEY (room_id) REFERENCES rooms(id)
    )`);

    // Amenity bookings
    db.run(`CREATE TABLE IF NOT EXISTS amenity_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id INTEGER NOT NULL,
        amenity_type TEXT NOT NULL,
        booking_date DATE NOT NULL,
        booking_time TIME NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guest_id) REFERENCES users(id)
    )`);

    // Guest feedback
    db.run(`CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guest_id) REFERENCES users(id)
    )`);
});

// Insert some sample data
db.serialize(() => {
    // Insert sample staff user
    db.run(`INSERT OR IGNORE INTO users (email, password_hash, role, name) 
            VALUES ('staff@example.com', '$2b$10$dummy_hash', 'staff', 'John Doe')`);

    // Insert sample room
    db.run(`INSERT OR IGNORE INTO rooms (room_number, room_type, floor, status) 
            VALUES ('101', 'Standard', 1, 'available')`);
});

// Export database connection
module.exports = db; 