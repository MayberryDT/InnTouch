# Backend Structure Document: Inn Touch

This document outlines the backend structure for Inn Touch. It covers the database schema, authentication logic, storage rules, and edge cases to ensure a robust and secure system using SQLite and Node.js with Express.

---

## DB Schema

The backend uses SQLite as a lightweight, file-based database stored in a single file named `hospitality.db`. The schema includes five tables to manage guests, chats, room service orders, bookings, and feedback. Each table uses integer primary keys and timestamps in ISO format (e.g., "2025-03-25T12:00:00Z").

### Guests Table
The `guests` table stores information synced from Cloudbeds. It has columns: `id` (integer, primary key, auto-increment), `name` (text, not null, e.g., "John Doe"), `room_number` (text, not null, e.g., "101"), `check_in` (text, not null, ISO timestamp), `check_out` (text, not null, ISO timestamp), and `cloudbeds_data` (text, JSON string of extra Cloudbeds data, e.g., '{"reservation_id": "12345"}').

### Chat Logs Table
The `chat_logs` table tracks all chat messages. It has columns: `id` (integer, primary key, auto-increment), `guest_id` (integer, foreign key to `guests.id`, not null), `message` (text, not null, e.g., "What time is checkout?"), `sender_type` (text, not null, either "guest", "ai", or "staff"), and `timestamp` (text, not null, ISO timestamp).

### Room Service Orders Table
The `room_service_orders` table stores guest orders. It has columns: `id` (integer, primary key, auto-increment), `guest_id` (integer, foreign key to `guests.id`, not null), `order_details` (text, not null, JSON string, e.g., '{"items": [{"name": "Burger", "quantity": 1}]}'), `status` (text, not null, default "pending", can be "pending", "confirmed", or "delivered"), and `timestamp` (text, not null, ISO timestamp).

### Bookings Table
The `bookings` table manages amenity and tour bookings. It has columns: `id` (integer, primary key, auto-increment), `guest_id` (integer, foreign key to `guests.id`, not null), `type` (text, not null, either "amenity" or "tour"), `details` (text, not null, JSON string, e.g., '{"name": "Spa Massage", "time": "2025-03-25T14:00:00Z"}'), `status` (text, not null, default "pending", can be "pending", "confirmed", or "cancelled"), and `timestamp` (text, not null, ISO timestamp).

### Feedback Table
The `feedback` table collects guest feedback. It has columns: `id` (integer, primary key, auto-increment), `guest_id` (integer, foreign key to `guests.id`, not null), `rating` (integer, not null, between 1 and 5), `comments` (text, optional, e.g., "Great stay!"), and `timestamp` (text, not null, ISO timestamp).

---

## Auth Logic

Authentication secures staff access to the backend and ensures guests can only access their own data. It uses JSON Web Tokens (JWT) for stateless authentication.

### Staff Authentication
Staff access the `/staff` endpoint and see a login page. They enter a username and password, which are sent to `POST /auth/staff/login`. The server checks the username against a hardcoded list of staff users stored in a `staff.json` file (e.g., {"username": "admin", "password_hash": "..."}). The password is hashed with bcrypt and compared to the stored hash. If they match, the server generates a JWT with `jsonwebtoken`, including the staff's `username` and a 24-hour expiry, signed with a secret key from `.env` (e.g., `JWT_SECRET=longrandomstring`). The token is returned to the client and stored in `localStorage`. Every staff request (e.g., `GET /chat/:guest_id`) includes the token in the `Authorization` header as `Bearer <token>`. The server uses `passport-jwt` to verify the token against the secret key. If valid, the request proceeds; if not, it returns a 401 Unauthorized error.

### Guest Authentication
Guests authenticate via a login page by providing their Room Number and Last Name. These credentials are sent to `POST /auth/guest/login`. The server queries the `guests` table, searching for a guest matching the provided `room_number` and `name` (case-insensitive comparison for the name might be preferable). It also verifies that the guest's `check_out` date is in the future. If a matching, active guest record is found, the server generates a JWT using `jsonwebtoken`. This token contains the `guest_id`, an expiry matching their `check_out` time (or a shorter duration like 24 hours, whichever is sooner), and is signed with the same `JWT_SECRET` from `.env`. The token is returned to the guest's client (browser) and should be stored securely, typically in `sessionStorage` for the duration of the browser session. For subsequent requests to protected guest endpoints (e.g., `POST /room-service`, `GET /chat`), the guest's client must include the JWT in the `Authorization` header as `Bearer <token>`. The server uses middleware (similar to staff auth, possibly using `passport-jwt` configured for guests) to verify the token. If the token is valid and the `guest_id` within the token matches the resource being accessed (where applicable), the request proceeds. If the token is invalid, expired, or missing, the server returns a 401 Unauthorized error, prompting the guest to log in again. A `POST /auth/guest/logout` endpoint can be added to explicitly invalidate the session if needed, although client-side token deletion is often sufficient.

---

## Storage Rules

Storage rules define how data is written, read, and managed in SQLite to maintain consistency and security.

- **Guests Table**: Only staff can write via `POST /import-cloudbeds`, which syncs data from Cloudbeds using the API. Guests can read their own data via `GET /guest/me` (using their JWT to identify themselves) if authenticated. No direct updates or deletes are allowed; updates come from Cloudbeds syncs. Guests cannot look up other guests.
- **Chat Logs Table**: Guests write via `POST /chat` (using their JWT to identify themselves), adding messages with `sender_type` as "guest". The AI writes via server logic with `sender_type` as "ai". Staff write via `POST /chat` with `sender_type` as "staff" after JWT verification. Authenticated guests can read their own chat history via `GET /chat` (JWT identifies the guest). Authenticated staff can read any guest's chat history via `GET /chat/:guest_id`.
- **Room Service Orders Table**: Guests write via `POST /room-service` (using their JWT), setting `status` to "pending". Staff can update `status` to "confirmed" or "delivered" via `PATCH /room-service/:id` with JWT. Guests read their own orders via `GET /room-service` (JWT identifies the guest); staff read all via `GET /room-service`.
- **Bookings Table**: Guests write via `POST /booking` (using their JWT), setting `status` to "pending". Staff can update `status` to "confirmed" or "cancelled" via `PATCH /booking/:id` with JWT. Guests read their own bookings via `GET /booking` (JWT identifies the guest); staff read all via `GET /booking`.
- **Feedback Table**: Guests write via `POST /feedback` (using their JWT). No updates or deletes are allowed. Guests can't read feedback; staff read all via `GET /feedback` with JWT.

All writes include a `timestamp` set to the current UTC time. Foreign keys (`guest_id`) are enforced to ensure data integrity. SQLite's default transaction handling ensures atomic writes.

---

## Edge Cases

These edge cases address potential issues and how the backend handles them.

- **Cloudbeds Sync Fails**: If `POST /import-cloudbeds` fails (e.g., API down), the server logs the error and returns a 500 Internal Server Error with "Sync failed, try again later" to staff. Existing guest data stays unchanged.
- **Guest Login Fails**: If a guest attempts `POST /auth/guest/login` with incorrect Room Number/Last Name, or if their `check_out` date has passed, the server returns a 401 Unauthorized error with "Invalid credentials or inactive stay."
- **Guest Access Attempt Without/Invalid Token**: If a guest tries to access a protected endpoint (e.g., `/chat`) without a valid JWT in the `Authorization` header, the server returns a 401 Unauthorized error, indicating they need to log in.
- **Guest Checks Out During Session**: If a guest's JWT was issued with an expiry matching their checkout time, it will naturally expire. If a shorter expiry (e.g., 24h) was used, the server should still re-validate the `check_out` date on critical actions or periodically if the token is still valid, returning 403 Forbidden if the guest has checked out since the token was issued.
- **Chat Escalation Delay**: If no staff are available when the AI escalates a chat, the server keeps the chat in `pending` status internally and sends "Please wait for staff" to the guest every 30 seconds until a staff member joins via the Staff Dashboard.
- **Booking Conflict**: If two guests try to book the same time slot, the server checks the `bookings` table for overlapping `details.time` and `status` not "cancelled". The second request gets a 409 Conflict error with "Time slot unavailable."
- **Invalid Staff JWT**: If a staff token expires or is tampered with, `passport-jwt` rejects it, and the server returns a 401 Unauthorized error with "Please log in again." The staff must re-authenticate via `POST /auth/staff/login`.
- **Database Full**: If SQLite hits a storage limit (unlikely but possible), writes fail, and the server returns a 500 Internal Server Error with "Database error, contact support." Staff should check logs and clear old data manually.
- **Guest URL Guessing**: This is no longer the primary access method. Direct access attempts to guest-specific URLs without a valid JWT will be blocked by the authentication middleware (returning 401 Unauthorized).

---

This Backend Structure Document defines the database schema, authentication logic, storage rules, and edge cases for Inn Touch. Copy this Markdown text into a `.md` file for your project documentation. It ensures a secure, consistent backend aligned with the app's requirements.