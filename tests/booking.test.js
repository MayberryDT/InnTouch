/**
 * Booking API endpoint tests
 */
const supertest = require('supertest');
const app = require('../app');
const request = supertest(app);
const booking = require('../src/database/booking');

// Mock the database functions
jest.mock('../src/database/booking', () => ({
  getAvailableTimeSlots: jest.fn().mockImplementation((type, name, date) => {
    if (type === 'amenity') {
      return Promise.resolve(['09:00', '10:00', '11:00', '14:00', '15:00']);
    } else if (type === 'tour') {
      return Promise.resolve(['09:00', '13:00', '14:00']);
    } else {
      return Promise.reject(new Error('Invalid booking type'));
    }
  }),
  getServiceList: jest.fn().mockImplementation((type) => {
    if (type === 'amenity') {
      return Promise.resolve(['Spa Massage', 'Gym Session', 'Pool Access', 'Sauna']);
    } else if (type === 'tour') {
      return Promise.resolve(['City Tour', 'Beach Trip', 'Mountain Hike', 'Local Winery Visit']);
    } else {
      return Promise.reject(new Error('Invalid type'));
    }
  }),
  getBookedTimeSlots: jest.fn().mockResolvedValue([]),
  saveBooking: jest.fn().mockResolvedValue(123), // Mock booking ID
  getGuestBookings: jest.fn().mockResolvedValue([
    {
      id: 1,
      type: 'amenity',
      details: {
        name: 'Spa Massage',
        time: '2025-04-15T10:00:00.000Z'
      },
      status: 'pending',
      timestamp: '2025-03-26T12:00:00.000Z'
    },
    {
      id: 2,
      type: 'tour',
      details: {
        name: 'City Tour',
        time: '2025-04-20T14:00:00.000Z'
      },
      status: 'confirmed',
      timestamp: '2025-03-25T09:30:00.000Z'
    }
  ]),
  getAllBookings: jest.fn().mockResolvedValue([]),
  updateBookingStatus: jest.fn().mockResolvedValue(true),
  preventBookingOverlaps: jest.fn().mockImplementation((booking, type, name, date, time) => {
    // By default, just return a booking ID like saveBooking
    return Promise.resolve(123);
  })
}));

// Mock the guest authentication middleware
jest.mock('../src/server/middleware/guest-auth', () => ({
  requireGuestAuth: (req, res, next) => {
    // Add guest ID to request for testing
    req.guestId = '123'; // Always mock guestId as 123 for authenticated user
    next();
  }
}));

describe('Booking API Endpoints', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Test availability check endpoint - amenity with name
  test('GET /api/availability - Check amenity availability', async () => {
    const response = await request
      .get('/guest/api/availability?type=amenity&name=Spa%20Massage&date=2025-04-01')
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.type).toBe('amenity');
    expect(response.body.data.name).toBe('Spa Massage');
    expect(response.body.data.date).toBe('2025-04-01');
    expect(Array.isArray(response.body.data.availableSlots)).toBe(true);
    expect(response.body.data.availableSlots).toContain('09:00');
    
    // Verify getAvailableTimeSlots was called with the right parameters
    expect(booking.getAvailableTimeSlots).toHaveBeenCalledWith('amenity', 'Spa Massage', '2025-04-01');
  }, 10000); // Increase timeout to 10 seconds
  
  // Test availability check endpoint - tour with name
  test('GET /api/availability - Check tour availability', async () => {
    const response = await request
      .get('/guest/api/availability?type=tour&name=City%20Tour&date=2025-04-01')
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.type).toBe('tour');
    expect(response.body.data.name).toBe('City Tour');
    expect(response.body.data.date).toBe('2025-04-01');
    expect(Array.isArray(response.body.data.availableSlots)).toBe(true);
    expect(response.body.data.availableSlots).toContain('09:00');
    
    // Verify getAvailableTimeSlots was called with the right parameters
    expect(booking.getAvailableTimeSlots).toHaveBeenCalledWith('tour', 'City Tour', '2025-04-01');
  }, 10000);
  
  // Test availability check endpoint - get list of amenities
  test('GET /api/availability - Get list of amenities', async () => {
    const response = await request
      .get('/guest/api/availability?type=amenity')
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.type).toBe('amenity');
    expect(Array.isArray(response.body.data.services)).toBe(true);
    expect(response.body.data.services).toContain('Spa Massage');
    expect(response.body.data.services).toContain('Gym Session');
    
    // Verify getServiceList was called with the right type
    expect(booking.getServiceList).toHaveBeenCalledWith('amenity');
  }, 10000);
  
  // Test availability check endpoint - get list of tours
  test('GET /api/availability - Get list of tours', async () => {
    const response = await request
      .get('/guest/api/availability?type=tour')
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.type).toBe('tour');
    expect(Array.isArray(response.body.data.services)).toBe(true);
    expect(response.body.data.services).toContain('City Tour');
    expect(response.body.data.services).toContain('Beach Trip');
    
    // Verify getServiceList was called with the right type
    expect(booking.getServiceList).toHaveBeenCalledWith('tour');
  }, 10000);
  
  // Test error handling - missing type parameter
  test('GET /api/availability - Missing type parameter', async () => {
    const response = await request
      .get('/guest/api/availability')
      .expect(400);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Type parameter is required');
  }, 10000);
  
  // Test error handling - invalid type parameter
  test('GET /api/availability - Invalid type parameter', async () => {
    // Force the mock to reject for an invalid type
    booking.getServiceList.mockRejectedValueOnce(new Error('Invalid type. Must be "amenity" or "tour"'));
    
    const response = await request
      .get('/guest/api/availability?type=invalid')
      .expect(400);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Invalid type');
  }, 10000);
  
  // Test error handling - invalid name parameter
  test('GET /api/availability - Invalid name parameter', async () => {
    // Force the mock to reject for an invalid name
    booking.getAvailableTimeSlots.mockRejectedValueOnce(new Error('Invalid service name'));
    
    const response = await request
      .get('/guest/api/availability?type=amenity&name=Invalid%20Service')
      .expect(400);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Invalid service name');
  }, 10000);
  
  // Test date defaulting to today
  test('GET /api/availability - Default date to today', async () => {
    const today = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    
    const response = await request
      .get('/guest/api/availability?type=amenity&name=Spa%20Massage')
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data.date).toBe(today);
    
    // Verify getAvailableTimeSlots was called with today's date
    expect(booking.getAvailableTimeSlots).toHaveBeenCalledWith('amenity', 'Spa Massage', today);
  }, 10000);
  
  // Test booking creation endpoint - successful booking
  test('POST /api/booking - Create a booking successfully', async () => {
    // Set up a future date to avoid past date validation errors
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
    const dateString = futureDate.toISOString().split('T')[0];
    
    // Mock the database modules functions
    const db = require('../src/server/db');

    // Reset getAvailableTimeSlots to return available slots
    booking.getAvailableTimeSlots.mockClear();
    booking.getAvailableTimeSlots.mockResolvedValueOnce(['09:00', '10:00', '11:00']);
    
    // Mock preventBookingOverlaps to succeed and return an ID
    const originalPreventBookingOverlaps = db.preventBookingOverlaps;
    db.preventBookingOverlaps = jest.fn().mockResolvedValueOnce(123);
    
    try {
      const bookingData = {
        guest_id: '123',
        type: 'amenity',
        service: 'Spa Massage',
        date: dateString,
        time: '10:00'
      };
      
      const response = await request
        .post('/guest/api/booking')
        .send(bookingData)
        .expect(201);
        
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Your booking is confirmed');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(123);
      expect(response.body.data.type).toBe('amenity');
      expect(response.body.data.service).toBe('Spa Massage');
      expect(response.body.data.status).toBe('pending');
      
      // Verify preventBookingOverlaps was called
      expect(db.preventBookingOverlaps).toHaveBeenCalled();
      
      // Verify getAvailableTimeSlots was called to check availability
      expect(booking.getAvailableTimeSlots).toHaveBeenCalledWith('amenity', 'Spa Massage', dateString);
    } finally {
      // Restore the original implementation
      db.preventBookingOverlaps = originalPreventBookingOverlaps;
    }
  }, 10000);
  
  // Test booking creation endpoint - unavailable time slot
  test('POST /api/booking - Time slot is unavailable', async () => {
    // Mock getAvailableTimeSlots to return slots that don't include the requested time
    booking.getAvailableTimeSlots.mockResolvedValueOnce(['09:00', '11:00', '14:00']);
    
    // Set up a future date to avoid past date validation errors
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
    const dateString = futureDate.toISOString().split('T')[0];
    
    const bookingData = {
      guest_id: '123',
      type: 'amenity',
      service: 'Spa Massage',
      date: dateString,
      time: '10:00' // Not in the available slots
    };
    
    const response = await request
      .post('/guest/api/booking')
      .send(bookingData)
      .expect(409);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('time slot is no longer available');
    
    // Verify getAvailableTimeSlots was called to check availability
    expect(booking.getAvailableTimeSlots).toHaveBeenCalledWith('amenity', 'Spa Massage', dateString);
    
    // Verify saveBooking was NOT called since the time slot wasn't available
    expect(booking.saveBooking).not.toHaveBeenCalled();
  }, 10000);
  
  // Test booking creation endpoint - validation error (missing service)
  test('POST /api/booking - Validation error (missing service)', async () => {
    // Set up a future date to avoid past date validation errors
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
    const dateString = futureDate.toISOString().split('T')[0];
    
    const bookingData = {
      guest_id: '123',
      type: 'amenity',
      // service is missing
      date: dateString,
      time: '10:00'
    };
    
    const response = await request
      .post('/guest/api/booking')
      .send(bookingData)
      .expect(400);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Service name is required');
    
    // Verify saveBooking was NOT called due to validation error
    expect(booking.saveBooking).not.toHaveBeenCalled();
  }, 10000);
  
  // Test booking creation endpoint - validation error (invalid type)
  test('POST /api/booking - Validation error (invalid type)', async () => {
    // Set up a future date to avoid past date validation errors
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
    const dateString = futureDate.toISOString().split('T')[0];
    
    const bookingData = {
      guest_id: '123',
      type: 'invalid', // Should be 'amenity' or 'tour'
      service: 'Spa Massage',
      date: dateString,
      time: '10:00'
    };
    
    const response = await request
      .post('/guest/api/booking')
      .send(bookingData)
      .expect(400);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Booking type must be "amenity" or "tour"');
    
    // Verify saveBooking was NOT called due to validation error
    expect(booking.saveBooking).not.toHaveBeenCalled();
  }, 10000);
  
  // Test booking creation endpoint - validation error (past date)
  test('POST /api/booking - Validation error (past date)', async () => {
    // Set up a past date for testing
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 7 days in the past
    const dateString = pastDate.toISOString().split('T')[0];
    
    const bookingData = {
      guest_id: '123',
      type: 'amenity',
      service: 'Spa Massage',
      date: dateString,
      time: '10:00'
    };
    
    const response = await request
      .post('/guest/api/booking')
      .send(bookingData)
      .expect(400);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Cannot book a time in the past');
    
    // Verify saveBooking was NOT called due to validation error
    expect(booking.saveBooking).not.toHaveBeenCalled();
  }, 10000);
  
  // Test booking creation endpoint - authentication error (wrong guest_id)
  test('POST /api/booking - Authentication error (wrong guest_id)', async () => {
    // Set up a future date to avoid past date validation errors
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
    const dateString = futureDate.toISOString().split('T')[0];
    
    const bookingData = {
      guest_id: '456', // Different from authenticated guest (123)
      type: 'amenity',
      service: 'Spa Massage',
      date: dateString,
      time: '10:00'
    };
    
    const response = await request
      .post('/guest/api/booking')
      .send(bookingData)
      .expect(403);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('You can only create bookings for yourself');
    
    // Verify saveBooking was NOT called due to authentication error
    expect(booking.saveBooking).not.toHaveBeenCalled();
  }, 10000);
  
  // Test booking retrieval endpoint - get guest bookings successfully
  test('GET /api/booking - Get guest booking history successfully', async () => {
    const response = await request
      .get('/guest/api/booking')
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.bookings).toBeDefined();
    expect(Array.isArray(response.body.data.bookings)).toBe(true);
    expect(response.body.data.bookings.length).toBe(2);
    
    // Check the structure of returned bookings
    const firstBooking = response.body.data.bookings[0];
    expect(firstBooking.id).toBe(1);
    expect(firstBooking.type).toBe('amenity');
    expect(firstBooking.service).toBe('Spa Massage');
    expect(firstBooking.time).toBe('2025-04-15T10:00:00.000Z');
    expect(firstBooking.status).toBe('pending');
    
    const secondBooking = response.body.data.bookings[1];
    expect(secondBooking.id).toBe(2);
    expect(secondBooking.type).toBe('tour');
    expect(secondBooking.service).toBe('City Tour');
    expect(secondBooking.status).toBe('confirmed');
    
    // Verify getGuestBookings was called with the right guest ID
    expect(booking.getGuestBookings).toHaveBeenCalledWith('123');
  }, 10000);
  
  // Test booking retrieval endpoint - handle no bookings
  test('GET /api/booking - Handle no bookings', async () => {
    // Mock empty bookings array for this test
    booking.getGuestBookings.mockResolvedValueOnce([]);
    
    const response = await request
      .get('/guest/api/booking')
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.bookings).toBeDefined();
    expect(Array.isArray(response.body.data.bookings)).toBe(true);
    expect(response.body.data.bookings.length).toBe(0);
    
    // Verify getGuestBookings was called
    expect(booking.getGuestBookings).toHaveBeenCalledWith('123');
  }, 10000);
  
  // Test booking retrieval endpoint - handle database error
  test('GET /api/booking - Handle database error', async () => {
    // Mock database error
    booking.getGuestBookings.mockRejectedValueOnce(new Error('Database connection error'));
    
    const response = await request
      .get('/guest/api/booking')
      .expect(500);
      
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Failed to retrieve bookings');
    
    // Verify getGuestBookings was called
    expect(booking.getGuestBookings).toHaveBeenCalledWith('123');
  }, 10000);
  
  // Test booking retrieval endpoint - handle malformed booking details
  test('GET /api/booking - Handle malformed booking details', async () => {
    // Mock bookings with one having malformed details
    const bookingModule = require('../src/database/booking');
    bookingModule.getGuestBookings.mockResolvedValueOnce([
      {
        id: 3,
        type: 'amenity',
        details: { name: 'Gym Session', time: null }, // Missing time
        status: 'pending',
        timestamp: '2025-03-26T14:30:00.000Z'
      }
    ]);
    
    const response = await request
      .get('/guest/api/booking')
      .expect(200);
      
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.bookings).toBeDefined();
    expect(Array.isArray(response.body.data.bookings)).toBe(true);
    expect(response.body.data.bookings.length).toBe(1);
    
    // Check that time is an empty string
    const bookingResult = response.body.data.bookings[0];
    expect(bookingResult.id).toBe(3);
    expect(bookingResult.service).toBe('Gym Session');
    expect(bookingResult.time).toBe(''); // Should be empty string for null value
    
    // Verify getGuestBookings was called
    expect(bookingModule.getGuestBookings).toHaveBeenCalledWith('123');
  }, 10000);
  
  // Test booking creation endpoint - concurrent booking prevention
  test('POST /api/booking - Prevent concurrent overlapping bookings', async () => {
    // Mock the db module that's used by the routes
    const db = require('../src/server/db');
    
    // Store original function
    const originalPreventBookingOverlaps = db.preventBookingOverlaps;
    
    // Mock the db module's preventBookingOverlaps function
    db.preventBookingOverlaps = jest.fn().mockImplementation(() => {
      throw new Error('This time slot is no longer available. Please choose another time.');
    });
    
    try {
      // Reset getAvailableTimeSlots to return the time slot as available
      booking.getAvailableTimeSlots.mockResolvedValueOnce(['09:00', '10:00', '11:00']);
      
      // Set up a future date to avoid past date validation errors
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
      const dateString = futureDate.toISOString().split('T')[0];
      
      const bookingData = {
        guest_id: '123',
        type: 'amenity',
        service: 'Spa Massage',
        date: dateString,
        time: '10:00' // This time appears available in getAvailableTimeSlots but will be rejected in preventBookingOverlaps
      };
      
      const response = await request
        .post('/guest/api/booking')
        .send(bookingData)
        .expect(409);
        
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('time slot is no longer available');
      
      // Verify getAvailableTimeSlots was called to check availability
      expect(booking.getAvailableTimeSlots).toHaveBeenCalledWith('amenity', 'Spa Massage', dateString);
      
      // Verify preventBookingOverlaps was called
      expect(db.preventBookingOverlaps).toHaveBeenCalled();
    } finally {
      // Restore the original implementation
      db.preventBookingOverlaps = originalPreventBookingOverlaps;
    }
  }, 10000);
}); 