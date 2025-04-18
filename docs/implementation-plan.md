# Implementation Plan: Inn Touch

This plan outlines the step-by-step process to develop Inn Touch, designed as an MVP for a test hotel. Each step is actionable, sequential, and detailed to ensure smooth execution and a functional app by the end.

---

## A. Project Initialization

- Step 1: ✅ Set up project environment: Initialize a new Node.js project with necessary configuration files for version control and dependencies.
- Step 2: ✅ Install backend dependencies: Install packages like Express, SQLite3, Passport, JWT, bcrypt, node-fetch, WebSocket, and dotenv for server-side functionality.
- Step 3: ✅ Configure environment variables: Set up a system to securely store sensitive data like API keys and secrets using environment variables.

---

## B. Backend Foundation

- Step 4: ✅ Create main server file: Establish the primary server file to serve as the backend entry point.
- Step 5: ✅ Initialize Express application: Configure an Express app with a basic route to confirm the server is running.
- Step 6: ✅ Add middleware: Integrate middleware for handling JSON requests, serving static files, and enabling cross-origin requests if required.
- Step 7: ✅ Set up database connection: Create a module to connect to an SQLite database and manage its initialization.
- Step 8: ✅ Define database schema: Design tables for guests, chat logs, room service orders, bookings, and feedback with appropriate fields and relationships.
- Step 9: ✅ Integrate database with server: Ensure the database initializes automatically when the server starts.

---

## C. Authentication System

- Step 10: ✅ Prepare staff credentials: Set up a static file with staff login details, including securely hashed passwords.
- Step 11: ✅ Build staff login endpoint: Create a route to authenticate staff credentials and issue a JSON Web Token (JWT) upon success.
- Step 12: ✅ Configure JWT authentication: Implement a strategy to validate JWTs for securing staff-only endpoints.
- Step 13: ✅ Secure staff routes: Apply authentication middleware to restrict access to staff-specific features.
- Step 14: ✅ Design guest authentication: Develop a method to verify guest identity using a unique ID from URL parameters, checking against active guest records.

---

## D. Third-Party Integration

- Step 15: ✅ Create API client for Cloudbeds: Build a module to interact with the Cloudbeds API using secure API credentials.
- Step 16: ✅ Implement data import route: Add an endpoint to fetch and synchronize guest data from Cloudbeds into the local database.
- Step 17: ✅ Add error handling for API: Include logic to manage API errors, logging issues and responding with clear messages.

---

## E. Real-Time Chat System

- Step 18: ✅ Set up WebSocket server: Integrate a WebSocket server to handle real-time communication.
- Step 19: ✅ Create chat history endpoint: Add a route to retrieve past messages for a specific guest.
- Step 20: ✅ Build message sending endpoint: Implement a route to post new chat messages, identifying the sender type (guest, AI, or staff).
- Step 21: ✅ Develop AI response logic: Create a simple AI system to respond to common guest queries based on predefined rules.
- Step 22: ✅ Add escalation mechanism: Design a process to escalate unanswered or complex queries to staff, updating the chat status accordingly.
- Step 23: ✅ Notify staff of escalations: Use WebSocket to alert staff when a chat requires their intervention.

---

## F. Room Service Features

- Step 24: ✅ Create order submission endpoint: Add a route for guests to submit room service orders.
- Step 25: ✅ Build guest order retrieval endpoint: Implement a route for guests to view their own order history.
- Step 26: ✅ Add staff order overview endpoint: Create a route for staff to see all pending and active orders.
- Step 27: ✅ Implement order status update endpoint: Add a route for staff to modify the status of room service orders.
- Step 28: ✅ Validate order submissions: Ensure order data is properly formatted and includes required details before processing.

---

## G. Booking Management

- Step 29: ✅ Create availability check endpoint: Add a route to display open time slots for amenities or tours.
- Step 30: ✅ Build booking creation endpoint: Implement a route for guests to reserve a time slot or service.
- Step 31: ✅ Add guest booking retrieval endpoint: Create a route for guests to see their own booking history.
- Step 32: ✅ Implement staff booking overview endpoint: Add a route for staff to view all bookings across guests.
- Step 33: ✅ Design booking update endpoint: Create a route for staff to confirm or cancel bookings.
- Step 34: ✅ Prevent booking overlaps: Add checks to avoid scheduling conflicts before confirming a booking.

---

## H. Feedback Mechanism

- Step 35: ✅ Create feedback submission endpoint: Add a route for guests to send feedback about their experience.
- Step 36: ✅ Build feedback retrieval endpoint: Implement a route for staff to access all submitted feedback.
- Step 37: ✅ Validate feedback input: Ensure feedback includes a valid rating (1-5), enforce comments length limits (1000 chars max), and prevent HTML/script injection.

---

## I. Frontend Basics

- Step 38: ✅ Set up static file hosting: Configure the server to serve frontend files from a dedicated directory.
- Step 39: ✅ Create core HTML pages: Develop separate pages for Home, Chat, Room Service, Booking, Property Info, Local Map, Feedback, and Staff Dashboard.
- Step 40: ✅ Add navigation links: Include a consistent menu across guest-facing pages for easy navigation.
- Step 41: ✅ Create common CSS file: Develop a shared stylesheet for consistent styling across all pages, including responsive design.

---

## J. Chat Frontend

- Step 42: ✅ Design chat interface: Build a real-time chat UI with a message display area and input field.
- Step 43: ✅ Integrate WebSocket in frontend: Connect the chat UI to the server's WebSocket for live messaging.
- Step 44: ✅ Differentiate message types: Visually distinguish between guest, AI, and staff messages in the chat UI.

---

## K. Room Service Frontend

- Step 45: ✅ Build order form: Create a form listing room service options for guests to select and submit.
- Step 46: ✅ Show order confirmation: Display a confirmation message after a successful order submission.

---

## L. Booking Frontend

- Step 47: ✅ Design booking interface: Create a form showing available services and time slots for booking.
- Step 48: ✅ Handle booking feedback: Show success or error messages based on the booking response.

---

## M. Additional Guest Features

- Step 49: ✅ Develop property info page: Add static content about the hotel, including policies and contact details.
- Step 50: ✅ Embed local map: Integrate an interactive map with markers for nearby points of interest.

---

## N. Feedback Frontend

- Step 51: ✅ Create feedback form: Build a UI for guests to submit ratings and comments.
- Step 52: ✅ Add submission confirmation: Display a thank-you message after feedback is submitted.

---

## O. Staff Dashboard Frontend

- Step 53: ✅ Design staff login page: Create a login form for staff to access the dashboard with JWT storage.
- Step 54: ✅ Build dashboard layout: Develop a staff interface showing data sync options, chats, orders, and bookings.
- Step 55: ✅ Implement data sync button: Add functionality to trigger Cloudbeds data import from the dashboard.
- Step 56: ✅ Handle staff chat interaction: Allow staff to join escalated chats directly from the dashboard.

---

## P. Guest Authentication & Login Frontend

- Step 58: ✅ **Create Guest Login Endpoint**: Add a backend route (e.g., `POST /auth/guest/login`) to receive Room Number and Last Name credentials.
- Step 59: ✅ **Implement Backend Login Logic**: Write backend code to query the `guests` table based on the received Room Number and Last Name (case-insensitive match for name recommended).
- Step 60: ✅ **Validate Guest Status**: In the backend logic, verify that the found guest record exists and their `check_out` date is in the future.
- Step 61: ✅ **Generate Guest JWT**: If validation passes, generate a JWT containing the `guest_id` and an appropriate expiry (e.g., matching check-out or a fixed duration like 24h), signed with the `JWT_SECRET`. Return this token upon successful login.
- Step 62: ✅ **Handle Login Failures**: Implement backend logic to return a 401 Unauthorized error if validation fails (no match, inactive stay).
- Step 63: ✅ **Create Guest JWT Middleware**: Develop or adapt backend middleware to verify the guest JWT provided in the `Authorization: Bearer <token>` header for protected guest routes.
- Step 64: ✅ **Secure Guest API Routes**: Apply the guest JWT middleware (`authenticateGuest` or `authenticateAny`) to all backend API routes intended only for authenticated guests (e.g., fetching orders, submitting feedback, posting chat messages) in `routes/guest.js` and `routes/chat.js`. Fixed import name mismatch and replaced deprecated middleware.
- Step 65: ✅ **Build Guest Login HTML Page**: Create the `login.html` page with input fields for Room Number and Last Name, a submit button, and an area for displaying error messages.
- Step 66: ✅ **Implement Frontend Login JS**: Write vanilla JavaScript for `login.html` to handle form submission. 
- Step 67: ✅ **Add Login API Call**: In the JS, use the Fetch API to send the Room Number and Last Name to the `POST /auth/guest/login` endpoint.
- Step 68: ✅ **Handle Frontend Login Response**: Implement JS logic to check the API response. On success (e.g., status 200), extract the JWT. On failure (e.g., status 401), display an appropriate error message on the login page.
- Step 69: ✅ **Store Guest JWT**: Upon successful login, securely store the received JWT on the client-side, preferably in `sessionStorage` so it clears when the browser tab is closed.
- Step 70: ✅ **Redirect After Login**: After storing the JWT, redirect the user from the login page to the Home Page (e.g., `/home.html`).
- Step 71: ✅ **Implement Frontend Logout**: Add a Logout button/link (e.g., in the main navigation). Add JS to remove the JWT from `sessionStorage` and redirect the user back to the `login.html` page when clicked.
- Step 72: ✅ **Implement Frontend Route Protection**: Add JS code that runs on load for all guest-only pages (Home, Chat, etc.). This code should check for the presence and potential validity of the JWT in `sessionStorage`. If no valid token is found, redirect the user to `login.html`.

---

## Q. Finalization

- Step 73: Test core functionality: Verify all features—authentication, chat, orders, bookings, feedback—work as expected.
- Step 74: Resolve issues: Fix any bugs or edge cases identified during testing.
- Step 75: Prepare deployment package: Ensure all dependencies and setup instructions are documented for the test hotel.
- Step 76: Deliver MVP: Provide the completed app to the test hotel for initial use and feedback.

---

This 76-step plan ensures a structured approach to building Inn Touch. By following these specific steps, you'll minimize errors and deliver a functional MVP ready for your test hotel.