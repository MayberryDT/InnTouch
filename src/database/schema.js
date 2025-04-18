/**
 * Database schema for Inn Touch
 * Defines the structure of all tables in the PostgreSQL database
 */

// Use TIMESTAMPTZ for timestamps to include timezone information
// Use SERIAL for auto-incrementing primary keys

const createGuestsTable = `
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  cloudbeds_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

const createChatLogsTable = `
CREATE TABLE IF NOT EXISTS chat_logs (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('guest', 'ai', 'staff')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_guest_id ON chat_logs (guest_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_sender_type ON chat_logs (sender_type);
CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON chat_logs (timestamp);
`;

const createChatStatusTable = `
CREATE TABLE IF NOT EXISTS chat_status (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER NOT NULL UNIQUE REFERENCES guests (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'escalated', 'closed')),
  message_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_staff_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_chat_status_guest_id ON chat_status (guest_id);
CREATE INDEX IF NOT EXISTS idx_chat_status_status ON chat_status (status);
`;

const createRoomServiceOrdersTable = `
CREATE TABLE IF NOT EXISTS room_service_orders (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  order_details JSONB NOT NULL, -- Use JSONB for flexible order details
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'delivered')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_service_orders_guest_id ON room_service_orders (guest_id);
CREATE INDEX IF NOT EXISTS idx_room_service_orders_status ON room_service_orders (status);
`;

const createBookingsTable = `
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('amenity', 'tour')),
  details JSONB NOT NULL, -- Use JSONB for flexible booking details
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings (guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
`;

const createFeedbackTable = `
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comments TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_guest_id ON feedback (guest_id);
`;

// Indexes are created after table definitions
const schema = [
  createGuestsTable,
  createChatLogsTable,
  createChatStatusTable,
  createRoomServiceOrdersTable,
  createBookingsTable,
  createFeedbackTable,
  // The CREATE INDEX statements are now part of the table creation strings or separate
];

module.exports = schema; 