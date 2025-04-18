# Product Requirements Document (PRD): Inn Touch

## App Overview
Inn Touch is a lightweight, guest-facing hospitality tool designed to streamline guest interactions and property management for small to medium-sized hotels. It aims to enhance guest experience by providing self-service options, real-time communication, and proactive feedback collection, while reducing the workload on front desk staff. The app integrates with Cloudbeds as the sole Property Management System (PMS) for now, using vanilla JavaScript for the frontend and SQLite for the backend to keep development simple and efficient.

### Goals
- Improve guest satisfaction with intuitive self-service features.
- Reduce front desk workload via AI-driven chat as the first line of support.
- Prevent negative public reviews by capturing feedback during stays.
- Provide a fast, framework-free solution deployable with minimal overhead.

### Target Users
- **Guests**: Hotel guests seeking information, services, or assistance.
- **Staff**: Front desk personnel managing escalated chats and overseeing operations.

## User Flows

### Guest User Flow
1. **Navigate to App**: Guest opens the app's main URL.
2. **Login**: Guest enters Room Number and Last Name on the login page and clicks Login.
3. **Access App**: Upon successful login, the guest is directed to the Home Page.
4. **View Property Info**: Guest navigates to the Property Information Page for details.
5. **Interact with AI Chat**:
   - Guest initiates chat with a question (e.g., "What time is checkout?").
   - AI responds or escalates to front desk after 3 messages or keyword trigger (e.g., "help").
   - If escalated, guest continues chat with staff in the same window.
6. **Order Room Service**: Guest selects items from a menu and submits an order.
7. **Book Amenities/Tours**: Guest checks availability and books an amenity or tour.
8. **Explore Local Map**: Guest views recommended nearby establishments on an interactive map.
9. **Submit Feedback**: Guest rates their stay and adds comments via a feedback form.
10. **Logout**: Guest clicks a logout button, invalidating their session and returning them to the login page.

### Staff User Flow
1. **Sync Cloudbeds Data**: Staff clicks a button to import guest data from Cloudbeds.
2. **Handle Escalated Chats**: Staff receives notification of an escalated chat, reviews history, and responds.
3. **Monitor Orders/Bookings**: Staff views and updates room service orders or bookings (via a basic admin view).

## Tech Stack & APIs

### Frontend
- **HTML5**: Structure of all pages and forms.
- **CSS3**: Responsive styling for mobile and desktop.
- **Vanilla JavaScript**: All interactivity (DOM manipulation, event handling, Fetch API for backend communication).
  - No frameworks allowed to maintain simplicity and reduce dependencies.

### Backend
- **SQLite**: Lightweight, file-based database for storing guest data, chat logs, orders, bookings, and feedback.
  - Tables:
    - `guests` (id, name, room_number, check_in, check_out, cloudbeds_data)
    - `chat_logs` (id, guest_id, message, sender_type, timestamp)
    - `room_service_orders` (id, guest_id, order_details, status, timestamp)
    - `bookings` (id, guest_id, type, details, status, timestamp)
    - `feedback` (id, guest_id, rating, comments, timestamp)
- **Server**: Simple server (e.g., Python Flask or Node.js with Express).
  - RESTful API endpoints for CRUD operations.
  - JWT-based authentication for both staff and guest access.

### APIs
- **Cloudbeds API**: For importing PMS data (e.g., guest details, room assignments).
  - Requires API key or OAuth 2.0 authentication (per Cloudbeds documentation).
  - Endpoint example: `GET /guests` to fetch guest data.
- **Map API**: Lightweight option like Leaflet with OpenStreetMap for the Local Map feature.
  - No external paid APIs (e.g., Google Maps) unless specified later.
- **AI Chat**: Internal rule-based logic or integration with an external AI API (e.g., xAI) if desired.

## Core Features

1. **Guest Login**
   - **Description**: Guests authenticate using their room number and last name.
   - **Details**: Login page sends credentials to backend; backend verifies against synced Cloudbeds data and issues JWT on success.
   - **User Experience**: Simple login form; error messages for failures; success redirects to Home Page.

2. **Cloudbeds Integration**
   - **Description**: Sync guest data from Cloudbeds into the app.
   - **Details**: Staff-triggered import via Cloudbeds API; data stored in `guests` table (used for guest login verification).
   - **User Experience**: Button in staff view; success/error notification.

3. **Front Desk Chat**
   - **Description**: Real-time chat between guests and staff.
   - **Details**: Messages stored in `chat_logs`; supports escalation from AI chat.
   - **User Experience**: Chat window with history and input field.

4. **AI Chat Agent**
   - **Description**: AI handles initial guest queries, escalates to staff if needed.
   - **Details**: Rule-based or external AI API; escalates after 3 messages or keyword trigger.
   - **User Experience**: Seamless transition from AI to staff in the same chat interface.

5. **Room Service Ordering**
   - **Description**: Guests order room service via a menu.
   - **Details**: Orders stored in `room_service_orders`; staff can view/update status.
   - **User Experience**: Simple form with menu options and confirmation.

6. **In-House Amenity Booking and Tour Booking**
   - **Description**: Guests book amenities or tours with availability checks.
   - **Details**: Bookings stored in `bookings`; availability fetched dynamically.
   - **User Experience**: Form with time slots and booking confirmation.

7. **Property Information Page**
   - **Description**: Static page with property details.
   - **Details**: Served as static HTML; no database interaction.
   - **User Experience**: Clean, readable layout with optional collapsible sections.

8. **Local Map of Partners/Recommended Establishments**
   - **Description**: Interactive map of nearby recommendations.
   - **Details**: Uses Leaflet with static or SQLite-stored partner data.
   - **User Experience**: Clickable markers with basic info (e.g., name, distance).

9. **Stay/Experience Feedback**
   - **Description**: Guests submit feedback during their stay.
   - **Details**: Feedback stored in `feedback` table; staff can review.
   - **User Experience**: Rating scale and comment box with thank-you message.

## In-Scope vs Out-of-Scope Items

### In-Scope
- Integration with Cloudbeds as the only PMS.
- Guest login using Room Number and Last Name.
- JWT-based authentication for guests and staff.
- AI Chat as the first line of defense, escalating to Front Desk Chat.
- Basic guest self-service features (room service, bookings, feedback).
- Vanilla JavaScript frontend with no frameworks.
- SQLite backend for simplicity and low overhead.
- Responsive design for mobile and desktop.
- Lightweight map integration (e.g., Leaflet).

### Out-of-Scope (For Now)
- Integration with other PMS systems beyond Cloudbeds.
- Advanced AI features (e.g., natural language processing beyond basic rules).
- Multi-property support or centralized management.
- Native mobile app (web-only for now).
- Payment processing for orders/bookings.
- Real-time staff task management (e.g., assigning orders to specific staff).
- Analytics dashboard for feedback or usage metrics.

## Additional Notes
- **Security**: HTTPS for all data transmission; JWT authentication for staff and guest features; secure handling of JWTs on the client-side (e.g., `sessionStorage`).
- **Scalability**: Designed for small to medium properties; SQLite may need upgrading for larger deployments.
- **AI Escalation Logic**: Configurable via JS (e.g., message count, keywords); can be refined later based on feedback.

This PRD outlines the initial scope for Inn Touch. Future iterations can expand based on user feedback and additional requirements.