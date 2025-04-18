# Tech Stack Document: Inn Touch

This document outlines the technology stack used in the development of Inn Touch. It includes all packages and dependencies for both the frontend and backend, links to relevant API documentation, and notes on preferred libraries or tools such as Supabase, Stripe, and NextAuth.

---

## Frontend

The frontend is built using vanilla JavaScript, HTML5, and CSS3, avoiding frameworks to keep the application lightweight and simple. The following library is used:

- **Leaflet**: A lightweight JavaScript library for interactive maps, utilized for the Local Map feature to display nearby recommendations.
  - [Leaflet Documentation](https://leafletjs.com/reference.html)

### Dependencies

- `leaflet` (version to be specified based on implementation, e.g., 1.9.4)

**Notes**: 
- Native browser APIs such as `Fetch` (for HTTP requests) and `WebSocket` (for real-time chat) are used, eliminating the need for additional libraries like Axios or Socket.io.
- Static HTML and CSS files are served directly without a bundler, adhering to the requirement for basic JavaScript.

---

## Backend

The backend is built using Node.js with Express.js as the web framework. SQLite serves as the lightweight, file-based database. The following packages are used:

- **express**: Web framework for Node.js to handle API requests and routing.
- **sqlite3**: SQLite database driver for Node.js to interact with the database.
- **passport**: Authentication middleware for Node.js, used with the JWT strategy for both staff and guest authentication.
- **passport-jwt**: JWT strategy for Passport.js to handle token-based authentication (configured possibly twice or dynamically for staff vs. guest tokens if needed).
- **jsonwebtoken**: Library for creating and verifying JSON Web Tokens (JWTs) for stateless authentication for both staff and guests.
- **bcrypt**: Library for hashing passwords to secure user credentials.
- **node-fetch**: Library for making HTTP requests, used to integrate with the Cloudbeds API.
- **ws**: WebSocket library for real-time chat functionality between guests and staff.
- **dotenv**: Library for managing environment variables, such as API keys and database paths.

### Dependencies

- `express` (version to be specified, e.g., 4.18.2)
- `sqlite3` (version to be specified, e.g., 5.1.6)
- `passport` (version to be specified, e.g., 0.6.0)
- `passport-jwt` (version to be specified, e.g., 4.0.1)
- `jsonwebtoken` (version to be specified, e.g., 9.0.2)
- `bcrypt` (version to be specified, e.g., 5.1.1)
- `node-fetch` (version to be specified, e.g., 3.3.2)
- `ws` (version to be specified, e.g., 8.14.2)
- `dotenv` (version to be specified, e.g., 16.3.1)

**Notes**: 
- Specific version numbers should be confirmed during implementation and updated in this document.
- The `ws` library enables WebSocket support for real-time chat, chosen over polling for a more responsive user experience while remaining lightweight.

---

## APIs and External Services

The app integrates with the following external APIs and services:

- **Cloudbeds API**: Used to import guest and stay data from the Cloudbeds Property Management System (PMS).
  - [Cloudbeds API Documentation](https://hotels.cloudbeds.com/api/docs/)
- **OpenStreetMap**: Provides map tiles for the Local Map feature, used in conjunction with Leaflet.
  - [OpenStreetMap Documentation](https://wiki.openstreetmap.org/wiki/Main_Page)

**Notes**: 
- Integration with the Cloudbeds API requires authentication (e.g., API keys or OAuth), which should be securely managed using environment variables via `dotenv`.
- An AI chat API (e.g., xAI) is not currently included but could be added in the future; for now, a simple rule-based chat system is implemented on the server.

---

## Preferred Libraries or Tools

The project adheres to the requirement of using basic JavaScript and SQLite for simplicity and minimal overhead. The following preferred libraries or tools were considered but are not used in the current scope:

- **Supabase**: A scalable, cloud-hosted database alternative to SQLite. Excluded to maintain the lightweight, file-based approach with SQLite, but could be considered for future scalability needs.
- **Stripe**: A payment processing platform. Not included as no financial transactions are required in the current scope, though it could be added if payment features are introduced later.
- **NextAuth**: An authentication library for Next.js applications. Not applicable since the app uses vanilla JavaScript and Express with Passport.js for authentication, but it could be relevant if migrating to a framework like Next.js.

**Rationale**: 
- The minimal stack (vanilla JavaScript, SQLite, Node.js) meets the project's requirements for a lightweight app. Additional tools like Supabase, Stripe, or NextAuth would increase complexity and are out of scope unless future features (e.g., scalability, payments, or framework adoption) are prioritized.

---

## Additional Notes

- **Authentication**: Uses JWT for stateless authentication for both staff (username/password) and guests (Room Number/Last Name), managed with Passport.js and `jsonwebtoken`. Staff passwords are hashed with `bcrypt` for security. Tokens are stored in `localStorage` (staff) or `sessionStorage` (guest) on the client side and included in API request headers.
- **Real-time Chat**: Implemented with WebSockets using the `ws` library on the server and the native `WebSocket` API on the client, ensuring efficient, real-time communication. WebSocket connections will need to be authenticated using the guest/staff JWT.
- **Security**: HTTPS should be configured in production to secure guest data, though deployment details are out of scope for this document.
- **AI Chat**: A basic rule-based system is implemented in JavaScript on the server. Integration with an external AI API is a potential future enhancement.

---

This Tech Stack Document provides a comprehensive overview of the technologies, packages, and external services used in Inn Touch. Copy this Markdown text into a `.md` file for your project documentation, and update version numbers as dependencies are installed. Let me know if further adjustments are needed!