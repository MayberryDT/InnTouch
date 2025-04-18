# Inn Touch

A lightweight, guest-facing hospitality tool designed to streamline guest interactions and property management for small to medium-sized hotels. The app enhances guest experience by providing self-service options, real-time communication, and proactive feedback collection.

## Features

- **AI-Powered Chat**: Initial guest queries handled by AI, with seamless escalation to staff
- **Room Service Ordering**: Easy menu-based ordering system
- **Amenity & Tour Booking**: Simple booking interface for hotel amenities and local tours
- **Property Information**: Access to hotel policies, amenities, and contact details
- **Local Map**: Interactive map showing nearby recommendations
- **Guest Feedback**: In-stay feedback collection to address issues proactively

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Real-time Communication**: WebSocket
- **Maps**: Leaflet with OpenStreetMap
- **PMS Integration**: Cloudbeds API

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd inn-touch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit the `.env` file and configure the following variables:
     ```
     # Required variables
     PORT=3000                               # Port for the Express server
     JWT_SECRET=change_to_secure_random_string  # Secret key for JWT tokens (very important to change!)
     JWT_EXPIRES_IN=24h                      # JWT token expiration time
     DB_PATH=src/database/inn-touch.db       # Path to SQLite database
     
     # Optional variables
     NODE_ENV=development                    # Environment (development/production)
     CLOUDBEDS_API_KEY=your_api_key_here     # API key for Cloudbeds integration
     CLOUDBEDS_API_URL=https://api...        # API URL for Cloudbeds 
     WS_PORT=3001                            # Port for WebSocket server
     LOG_LEVEL=info                          # Logging level (debug/info/warn/error)
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
inn-touch/
├── src/
│   ├── server/         # Backend server code
│   │   ├── config.js   # Environment configuration
│   │   └── index.js    # Server entry point
│   ├── public/         # Static frontend files
│   └── database/       # Database setup and migrations
├── docs/              # Project documentation
├── .env               # Environment variables (not in version control)
├── .env.example       # Example environment variables file
└── tests/             # Test files
```

## Environment Variables

The application uses environment variables to manage configuration across different environments (development, production). These are loaded using the `dotenv` package and centrally managed through the `src/server/config.js` module.

### Required Variables
- `PORT`: The port for the Express server
- `DB_PATH`: Path to the SQLite database file
- `JWT_SECRET`: Secret key for signing JWT tokens (must be unique and secure)
- `JWT_EXPIRES_IN`: JWT token expiration time

### Optional Variables
- `NODE_ENV`: Application environment (development/production)
- `CLOUDBEDS_API_KEY`: API key for Cloudbeds integration
- `CLOUDBEDS_API_URL`: Base URL for Cloudbeds API
- `WS_PORT`: Port for WebSocket server
- `LOG_LEVEL`: Logging level (debug/info/warn/error)

For local development, create a `.env` file in the project root by copying `.env.example` and filling in the required values.

## Development

- `npm run dev`: Start development server
- `npm run test`: Run tests
- `npm run build`: Build for production

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details. 