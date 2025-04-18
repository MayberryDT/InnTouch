/**
 * Staff Booking API endpoint tests
 */
const supertest = require('supertest');

// Mock the auth middleware before importing app
jest.mock('../src/server/middleware/auth', () => ({
  configurePassport: jest.fn(() => ({
    initialize: jest.fn(() => (req, res, next) => next()),
    authenticate: jest.fn(() => (req, res, next) => next())
  })),
  authenticateStaff: (req, res, next) => {
    // Mock authenticated staff member
    req.user = { id: 'staff123', type: 'staff', role: 'manager' };
    next();
  },
  authenticateRequest: (req, res, next) => {
    // Mock authenticated user
    req.user = { id: 'staff123', type: 'staff', role: 'manager' };
    next();
  }
}));

const app = require('../app');
const request = supertest(app);
const bookingDb = require('../src/database/booking');

// Mock the booking database functions
jest.mock('../src/database/booking');

describe('Staff Booking API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockBookings = [
    {
      id: 1,
      guest_id: 101,
      guest_name: 'John Smith',
      room_number: '101',
      type: 'amenity',
      details: {
        name: 'Spa Massage',
        time: '2023-04-15T10:00:00Z'
      },
      status: 'pending',
      timestamp: '2023-04-01T10:00:00Z'
    },
    {
      id: 2,
      guest_id: 102,
      guest_name: 'Jane Doe',
      room_number: '102',
      type: 'tour',
      details: {
        name: 'City Tour',
        time: '2023-04-16T09:00:00Z'
      },
      status: 'confirmed',
      timestamp: '2023-04-01T11:00:00Z'
    },
    {
      id: 3,
      guest_id: 103,
      guest_name: 'Bob Johnson',
      room_number: '103',
      type: 'amenity',
      details: {
        name: 'Gym Session',
        time: '2023-04-15T14:00:00Z'
      },
      status: 'cancelled',
      timestamp: '2023-04-01T09:00:00Z'
    },
    {
      id: 4,
      guest_id: 101,
      guest_name: 'John Smith',
      room_number: '101',
      type: 'tour',
      details: 'malformed json',
      status: 'pending',
      timestamp: '2023-04-01T12:00:00Z',
      parseError: true
    }
  ];

  test('GET /api/staff/booking - should return all bookings', async () => {
    bookingDb.getAllBookings.mockResolvedValue(mockBookings);

    const response = await request.get('/api/staff/booking');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.bookings.length).toBe(4);
    expect(response.body.count).toBe(4);
    expect(response.body.filters).toEqual({
      status: 'all',
      type: 'all'
    });
    
    // Check that bookings are returned with the correct structure
    const firstBooking = response.body.bookings[0];
    expect(firstBooking.id).toBeDefined();
    expect(firstBooking.guest_id).toBeDefined();
    expect(firstBooking.guest_name).toBeDefined();
    expect(firstBooking.room_number).toBeDefined();
    expect(firstBooking.type).toBeDefined();
    expect(firstBooking.details).toBeDefined();
    expect(firstBooking.status).toBeDefined();
    expect(firstBooking.timestamp).toBeDefined();
    
    // Verify getAllBookings was called
    expect(bookingDb.getAllBookings).toHaveBeenCalled();
  });

  test('GET /api/staff/booking?status=pending - should filter by status', async () => {
    bookingDb.getAllBookings.mockResolvedValue(mockBookings);

    const response = await request.get('/api/staff/booking?status=pending');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.bookings.length).toBe(2); // Only pending bookings
    expect(response.body.count).toBe(2);
    expect(response.body.filters.status).toBe('pending');
    
    // All returned bookings should have status 'pending'
    response.body.bookings.forEach(booking => {
      expect(booking.status).toBe('pending');
    });
  });

  test('GET /api/staff/booking?type=amenity - should filter by type', async () => {
    bookingDb.getAllBookings.mockResolvedValue(mockBookings);

    const response = await request.get('/api/staff/booking?type=amenity');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.bookings.length).toBe(2); // Only amenity bookings
    expect(response.body.count).toBe(2);
    expect(response.body.filters.type).toBe('amenity');
    
    // All returned bookings should have type 'amenity'
    response.body.bookings.forEach(booking => {
      expect(booking.type).toBe('amenity');
    });
  });

  test('GET /api/staff/booking?limit=2 - should limit number of bookings', async () => {
    bookingDb.getAllBookings.mockResolvedValue(mockBookings);

    const response = await request.get('/api/staff/booking?limit=2');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.bookings.length).toBe(2); // Only return first 2 bookings
    expect(response.body.count).toBe(2);
  });

  test('GET /api/staff/booking?status=pending&type=tour - should filter by multiple criteria', async () => {
    bookingDb.getAllBookings.mockResolvedValue(mockBookings);

    const response = await request.get('/api/staff/booking?status=pending&type=tour');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.bookings.length).toBe(1); // Only pending tour bookings
    expect(response.body.count).toBe(1);
    expect(response.body.filters.status).toBe('pending');
    expect(response.body.filters.type).toBe('tour');
    
    // The booking should be the pending tour booking
    const booking = response.body.bookings[0];
    expect(booking.status).toBe('pending');
    expect(booking.type).toBe('tour');
  });

  test('GET /api/staff/booking - should handle malformed booking details', async () => {
    bookingDb.getAllBookings.mockResolvedValue(mockBookings);

    const response = await request.get('/api/staff/booking');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Find the booking with parseError flag
    const malformedBooking = response.body.bookings.find(b => b.id === 4);
    expect(malformedBooking).toBeDefined();
    expect(malformedBooking.parseError).toBe(true);
  });

  test('GET /api/staff/booking - should handle database errors', async () => {
    bookingDb.getAllBookings.mockRejectedValue(new Error('Database error'));

    const response = await request.get('/api/staff/booking');
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Failed to retrieve bookings');
  });

  test('PATCH /api/staff/booking/:id - should update booking status', async () => {
    bookingDb.updateBookingStatus.mockResolvedValue(true);

    const response = await request
      .patch('/api/staff/booking/1')
      .send({ status: 'confirmed' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Booking 1 status updated to confirmed');
    expect(response.body.bookingId).toBe('1');
    expect(response.body.newStatus).toBe('confirmed');
    
    expect(bookingDb.updateBookingStatus).toHaveBeenCalledWith('1', 'confirmed');
  });

  test('PATCH /api/staff/booking/:id - should handle missing status', async () => {
    const response = await request
      .patch('/api/staff/booking/1')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Status is required');
    
    expect(bookingDb.updateBookingStatus).not.toHaveBeenCalled();
  });

  test('PATCH /api/staff/booking/:id - should validate status value', async () => {
    const response = await request
      .patch('/api/staff/booking/1')
      .send({ status: 'invalid-status' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Invalid status. Must be pending, confirmed, or cancelled');
    
    expect(bookingDb.updateBookingStatus).not.toHaveBeenCalled();
  });

  test('PATCH /api/staff/booking/:id - should handle booking not found', async () => {
    bookingDb.updateBookingStatus.mockRejectedValue(new Error('Booking not found'));

    const response = await request
      .patch('/api/staff/booking/999')
      .send({ status: 'confirmed' });
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Booking not found');
    
    expect(bookingDb.updateBookingStatus).toHaveBeenCalledWith('999', 'confirmed');
  });

  test('PATCH /api/staff/booking/:id - should handle database errors', async () => {
    bookingDb.updateBookingStatus.mockRejectedValue(new Error('Database error'));

    const response = await request
      .patch('/api/staff/booking/1')
      .send({ status: 'confirmed' });
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Failed to update booking status');
    
    expect(bookingDb.updateBookingStatus).toHaveBeenCalledWith('1', 'confirmed');
  });
}); 