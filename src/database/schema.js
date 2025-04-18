/**
 * Database schema for Inn Touch
 * Defines the structure of all tables in the SQLite database
 */

// SQL statement to create the guests table
const createGuestsTable = `
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  cloudbeds_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

// SQL statement to create the chat_logs table
const createChatLogsTable = `
CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('guest', 'ai', 'staff')),
  timestamp TEXT NOT NULL,
  FOREIGN KEY (guest_id) REFERENCES guests (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_guest_id ON chat_logs (guest_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_sender_type ON chat_logs (sender_type);
CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON chat_logs (timestamp);
`;

// SQL statement to create the chat_status table to track chat escalation status
const createChatStatusTable = `
CREATE TABLE IF NOT EXISTS chat_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'escalated', 'closed')),
  message_count INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL,
  assigned_staff_id TEXT,
  FOREIGN KEY (guest_id) REFERENCES guests (id) ON DELETE CASCADE
)`;

// SQL statement to create the room_service_orders table
const createRoomServiceOrdersTable = `
CREATE TABLE IF NOT EXISTS room_service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  order_details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'delivered')),
  timestamp TEXT NOT NULL,
  FOREIGN KEY (guest_id) REFERENCES guests (id) ON DELETE CASCADE
)`;

// SQL statement to create the bookings table
const createBookingsTable = `
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('amenity', 'tour')),
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled')),
  timestamp TEXT NOT NULL,
  FOREIGN KEY (guest_id) REFERENCES guests (id) ON DELETE CASCADE
)`;

// SQL statement to create the feedback table
const createFeedbackTable = `
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comments TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (guest_id) REFERENCES guests (id) ON DELETE CASCADE
)`;

// SQL statement to create indexes for improved query performance
const createIndexes = `
CREATE INDEX IF NOT EXISTS idx_chat_logs_guest_id ON chat_logs (guest_id);
CREATE INDEX IF NOT EXISTS idx_room_service_orders_guest_id ON room_service_orders (guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings (guest_id);
CREATE INDEX IF NOT EXISTS idx_feedback_guest_id ON feedback (guest_id);
CREATE INDEX IF NOT EXISTS idx_guests_room_number ON guests (room_number);
CREATE INDEX IF NOT EXISTS idx_room_service_orders_status ON room_service_orders (status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_chat_status_guest_id ON chat_status (guest_id);
CREATE INDEX IF NOT EXISTS idx_chat_status_status ON chat_status (status);
CREATE INDEX IF NOT EXISTS idx_chat_logs_sender_type ON chat_logs (sender_type);
CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON chat_logs (timestamp);
`;

// Collection of all schema creation statements
const schema = [
  createGuestsTable,
  createChatLogsTable,
  createChatStatusTable,
  createRoomServiceOrdersTable,
  createBookingsTable,
  createFeedbackTable,
  createIndexes
];

module.exports = schema; 