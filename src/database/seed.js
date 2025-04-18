/**
 * Seed script for the Inn Touch database
 * Populates the database with sample data for testing
 */

const db = require('./db');

// Sample guest data
const guests = [
  {
    name: 'John Doe',
    room_number: '101',
    check_in: '2023-05-01',
    check_out: '2023-05-05',
    cloudbeds_data: JSON.stringify({
      email: 'john.doe@example.com',
      phone: '+1234567890',
      nationality: 'USA'
    })
  },
  {
    name: 'Jane Smith',
    room_number: '102',
    check_in: '2023-05-02',
    check_out: '2023-05-07',
    cloudbeds_data: JSON.stringify({
      email: 'jane.smith@example.com',
      phone: '+0987654321',
      nationality: 'UK'
    })
  },
  {
    name: 'Bob Johnson',
    room_number: '103',
    check_in: '2023-05-03',
    check_out: '2023-05-10',
    cloudbeds_data: JSON.stringify({
      email: 'bob.johnson@example.com',
      phone: '+1122334455',
      nationality: 'Canada'
    })
  }
];

// Sample amenities and tours data for availability checking
const amenities = [
  { name: 'Spa', slots_per_day: 8, start_time: '09:00', end_time: '17:00', duration: 60 },
  { name: 'Pool', slots_per_day: 10, start_time: '08:00', end_time: '18:00', duration: 60 },
  { name: 'Gym', slots_per_day: 12, start_time: '06:00', end_time: '22:00', duration: 90 }
];

const tours = [
  { name: 'City Tour', slots_per_day: 3, start_time: '10:00', end_time: '16:00', duration: 120 },
  { name: 'Wine Tasting', slots_per_day: 2, start_time: '14:00', end_time: '18:00', duration: 90 },
  { name: 'Historic Walk', slots_per_day: 4, start_time: '09:00', end_time: '15:00', duration: 60 }
];

// Sample booking data
const bookings = [
  {
    guest_id: 1,
    type: 'amenity',
    details: JSON.stringify({
      name: 'Spa',
      date: '2023-05-02',
      time: '14:00'
    }),
    status: 'confirmed',
    timestamp: '2023-05-01T12:00:00Z'
  },
  {
    guest_id: 2,
    type: 'tour',
    details: JSON.stringify({
      name: 'City Tour',
      date: '2023-05-04',
      time: '10:00'
    }),
    status: 'pending',
    timestamp: '2023-05-02T15:30:00Z'
  }
];

/**
 * Seed the database with sample data
 */
async function seed() {
  try {
    console.log('Initializing database...');
    await db.initDatabase();
    
    console.log('Seeding guests table...');
    for (const guest of guests) {
      await db.run(
        'INSERT INTO guests (name, room_number, check_in, check_out, cloudbeds_data) VALUES (?, ?, ?, ?, ?)',
        [guest.name, guest.room_number, guest.check_in, guest.check_out, guest.cloudbeds_data]
      );
    }
    
    console.log('Seeding bookings table...');
    for (const booking of bookings) {
      await db.run(
        'INSERT INTO bookings (guest_id, type, details, status, timestamp) VALUES (?, ?, ?, ?, ?)',
        [booking.guest_id, booking.type, booking.details, booking.status, booking.timestamp]
      );
    }
    
    // Log seeded data summary
    const guestCount = await db.get('SELECT COUNT(*) as count FROM guests');
    const bookingCount = await db.get('SELECT COUNT(*) as count FROM bookings');
    
    console.log(`Database seeded successfully with ${guestCount.count} guests and ${bookingCount.count} bookings.`);
    console.log('Amenities available for booking:', amenities.map(a => a.name).join(', '));
    console.log('Tours available for booking:', tours.map(t => t.name).join(', '));
    
    // Close database connection
    await db.closeDatabase();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error seeding database:', err.message);
    process.exit(1);
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seed();
}

module.exports = { seed, amenities, tours }; 