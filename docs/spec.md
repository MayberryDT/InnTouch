# Inn-Touch Spec

## Overview
This web app is a lightweight hospitality management and guest interaction tool designed for hotels or similar properties. It provides a streamlined set of features to enhance guest experience and manage property operations efficiently. The frontend will be built with plain HTML, CSS, and vanilla JavaScript (no frameworks), while the backend will leverage SQLite for data storage and a simple server-side language (e.g., Python with Flask or Node.js) to handle API requests.

## Target Features
1. **Suck PMS Info into App (Cloudbeds Integration)**
   - Import guest and stay data from Cloudbeds into the app to sync guest information, room assignments, and stay details.
2. **Front Desk Chat**
   - Real-time chat interface connecting guests to front desk staff for assistance.
3. **AI Chat Agent**
   - An AI-driven chatbot as the first point of contact for guest inquiries, escalating to front desk chat when needed.
4. **Room Service Ordering**
   - Guests can order room service directly through the app.
5. **In-House Amenity Booking and Tour Booking**
   - Booking system for property amenities (e.g., spa, gym) and local tours.
6. **Property Information Page**
   - Static page displaying property details, policies, and amenities.
7. **Local Map of Partners/Recommended Establishments**
   - Interactive map highlighting nearby partners and recommended locations.
8. **Stay/Experience Feedback**
   - Form for guests to submit feedback during their stay to address issues proactively.

## Technical Requirements

### Frontend
- **Tech Stack**: HTML5, CSS3, vanilla JavaScript (no frameworks).
- **Design Principles**:
  - Responsive design for mobile and desktop access.
  - Lightweight and fast-loading, optimized for guest-facing use.
- **Key Components**:
  - **Dynamic UI Updates**: Use vanilla JS to handle DOM manipulation for real-time updates (e.g., chat, bookings).
  - **Event Listeners**: Manage user interactions (e.g., form submissions, button clicks) without external libraries.
  - **AJAX/Fetch API**: Communicate with the backend via RESTful endpoints for data retrieval and submission.

### Backend
- **Database**: SQLite
  - Lightweight, file-based database suitable for small to medium-sized properties.
  - Tables (Ensure `guests` table includes `name` accurately for login):
    - `guests` (id, name, room_number, check_in, check_out, cloudbeds_data)
    - `chat_logs` (id, guest_id, message, sender_type, timestamp)
    - `room_service_orders` (id, guest_id, order_details, status, timestamp)
    - `bookings` (id, guest_id, type, details, status, timestamp)
    - `feedback` (id, guest_id, rating, comments, timestamp)
- **Server**: Simple server (e.g., Python Flask or Node.js with Express)
  - RESTful API endpoints to handle CRUD operations.
  - JWT-based authentication for staff and guests (using Room Number/Last Name for guests).
- **Key Functionality**:
  - Authenticate guests via Room Number/Last Name against `guests` table and issue JWT.
  - Authenticate staff via username/password and issue JWT.
  - Verify JWTs for protected endpoints.
  - Sync Cloudbeds data via API integration.
  - Store and retrieve chat logs, orders, bookings, and feedback.
  - Serve static content (e.g., property info, map data).

## Feature Breakdown

1. **Guest Login**
   - **Description**: Authenticate guests using Room Number and Last Name.
   - **Frontend**: Login form (Room Number, Last Name inputs, Login button).
   - **Backend**: API endpoint (`POST /auth/guest/login`) validates credentials against `guests` table (checking `room_number`, `name`, and `check_out` date), issues JWT upon success.
   - **JS**: Fetch API call to `/auth/guest/login`, store JWT (e.g., in `sessionStorage`), handle login success (redirect) or failure (display error).

2. **Suck PMS Info into App (Cloudbeds Integration)**
   - **Description**: Import guest and stay data from Cloudbeds.
   - **Frontend**: Button to trigger sync (staff-only view).
   - **Backend**: API endpoint (`POST /import-cloudbeds`) to pull data via Cloudbeds API and store it in `guests` table.
   - **JS**: Fetch API call to initiate sync and display success/error message.

3. **Front Desk Chat**
   - **Description**: Real-time chat between guests and front desk staff.
   - **Frontend**: Chat window with message input and history (requires guest JWT).
   - **Backend**: API endpoints (`GET /chat`, `POST /chat`) to fetch and send messages; requires valid guest or staff JWT; stored in `chat_logs`.
   - **JS**: WebSocket (or polling with Fetch) for real-time updates; DOM updates for new messages; send JWT with connection/requests.

4. **AI Chat Agent**
   - **Description**: AI chatbot handles initial guest queries, escalating to front desk if unresolved.
   - **Frontend**: Same chat window as front desk, with AI responses pre-populated (requires guest JWT).
   - **Backend**: Integrate a simple AI (e.g., rule-based or external API); endpoint (`POST /ai-chat`) to process queries and decide escalation; requires valid guest JWT.
   - **JS**: Logic to switch from AI to human chat seamlessly (e.g., button or timeout); send JWT with requests.

5. **Room Service Ordering**
   - **Description**: Guests order room service via a menu interface.
   - **Frontend**: Form with menu items and submit button (requires guest JWT).
   - **Backend**: API endpoint (`POST /room-service`) to save orders in `room_service_orders`; requires valid guest JWT.
   - **JS**: Fetch API to submit order (including JWT); confirmation message on success.

6. **In-House Amenity Booking and Tour Booking**
   - **Description**: Guests book amenities or tours with availability checks.
   - **Frontend**: Booking form with selectable options and time slots (requires guest JWT).
   - **Backend**: API endpoints (`GET /availability`, `POST /booking`) to check and save bookings in `bookings`; requires valid guest JWT for POST.
   - **JS**: Dynamic form updates based on availability; Fetch API for submission (including JWT).

7. **Property Information Page**
   - **Description**: Static page with property details.
   - **Frontend**: HTML page with CSS styling (accessible after login).
   - **Backend**: Serve static content via server (no database interaction).
   - **JS**: Optional interactivity (e.g., collapsible sections).

8. **Local Map of Partners/Recommended Establishments**
   - **Description**: Interactive map of nearby locations.
   - **Frontend**: Embed a lightweight map API (requires guest JWT to access page).
   - **Backend**: API endpoint (`GET /partners`) to fetch partner data.
   - **JS**: Populate map markers dynamically using Fetch API (request includes JWT).

9. **Stay/Experience Feedback**
   - **Description**: Guests submit feedback during their stay.
   - **Frontend**: Form with rating and comment field (requires guest JWT).
   - **Backend**: API endpoint (`POST /feedback`) to save feedback in `feedback` table; requires valid guest JWT.
   - **JS**: Fetch API to submit form (including JWT); display thank-you message.

## AI Chat to Front Desk Flow
- **Logic**: 
  - AI Chat is the default interface for guests.
  - If the AI cannot resolve a query (e.g., after 3 messages or specific keywords like "help"), it prompts: "Would you like to speak to the front desk?"
  - On guest confirmation, the chat session transfers to the front desk interface with prior messages preserved.
- **Implementation**: 
  - JS tracks message count/keywords and toggles chat mode.
  - Backend logs the escalation in `chat_logs` with a `sender_type` switch (AI → Human).

## Development Notes
- **No Frameworks**: All interactivity will use vanilla JS (e.g., `addEventListener`, `fetch`, DOM manipulation).
- **SQLite**: Use a single `.db` file for simplicity; ensure proper indexing for performance.
- **Cloudbeds Integration**: Requires Cloudbeds API access (e.g., OAuth 2.0 or API keys); refer to Cloudbeds API documentation for endpoints.
- **Scalability**: Designed for small to medium properties; larger setups may require a more robust database later.
- **Security**: JWT authentication for guests and staff; HTTPS for data transmission; secure storage of JWT on client (e.g., `sessionStorage`).

## Sample API Endpoints
- `POST /auth/guest/login`: Authenticate guest and issue JWT.
- `POST /auth/staff/login`: Authenticate staff and issue JWT.
- `POST /import-cloudbeds`: Import Cloudbeds data (staff only).
- `GET /chat`: Retrieve chat history (guest/staff JWT required).
- `POST /chat`: Send a chat message (guest/staff JWT required).
- `POST /ai-chat`: Process AI chat query (guest JWT required).
- `POST /room-service`: Submit room service order (guest JWT required).
- `GET /availability`: Check amenity/tour availability.
- `POST /booking`: Book an amenity/tour (guest JWT required).
- `GET /partners`: Fetch partner map data.
- `POST /feedback`: Submit guest feedback (guest JWT required).