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

3. Create a `.env` file in the root directory with required environment variables:
   ```
   PORT=3000
   JWT_SECRET=your-secret-key
   CLOUDBEDS_API_KEY=your-api-key
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
│   ├── public/         # Static frontend files
│   └── database/       # Database setup and migrations
├── docs/              # Project documentation
└── tests/             # Test files
```

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