const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const staffConfig = require('../config/staff.json');
const { findGuestByRoomAndName, isGuestActive } = require('../db/guests');

// Staff login endpoint
router.post('/login', async (req, res) => {
  console.log('Login attempt received:', req.body.username);
  
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log('Missing credentials in request');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user in staff config
    const user = staffConfig.users.find(u => u.username === username);
    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.log(`Invalid password for user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify JWT_SECRET is configured
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-should-be-long-and-random') {
      console.error('JWT_SECRET not properly configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username: user.username, 
        role: user.role,
        // Add issued at and expiration time explicitly
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)  // 24 hours
      },
      process.env.JWT_SECRET
    );

    console.log(`Login successful for user: ${username}`);
    console.log(`Token generated successfully (length: ${token.length})`);
    
    res.json({ 
      token,
      user: {
        username: user.username,
        role: user.role
      },
      success: true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Guest login endpoint (Steps 58, 59 & 60: Structure + DB Query + Status Check)
router.post('/guest/login', async (req, res) => {
  console.log('Guest login attempt received:', req.body);

  try {
    const { roomNumber, lastName } = req.body;

    // Basic input validation
    if (!roomNumber || !lastName) {
      console.log('Missing credentials in guest login request');
      return res.status(400).json({ error: 'Room number and last name are required' });
    }

    // Step 59: Query the database for the guest
    console.log(`Attempting to find guest - Room: ${roomNumber}, Name: ${lastName}`);
    const guest = await findGuestByRoomAndName(roomNumber, lastName);

    if (!guest) {
      console.log(`Guest not found for Room: ${roomNumber}, Name: ${lastName}`);
      // Step 62: Return 401 for not found
      return res.status(401).json({ 
        error: 'Invalid credentials or inactive stay.' 
      });
    }

    console.log(`Guest found: ${guest.name} (ID: ${guest.id})`);

    // Step 60: Validate Guest Status (check_out date)
    const active = await isGuestActive(guest.id);

    if (!active) {
      console.log(`Guest found but is inactive (checked out): ${guest.name} (ID: ${guest.id}), Check-out: ${guest.check_out}`);
      // Step 62: Return 401 for inactive stay
      return res.status(401).json({ 
        error: 'Invalid credentials or inactive stay.' 
      });
    }

    console.log(`Guest is active: ${guest.name} (ID: ${guest.id})`);

    // Step 61: Generate Guest JWT
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const checkOutTimestamp = Math.floor(new Date(guest.check_out).getTime() / 1000);
    const twentyFourHoursFromNow = now + (24 * 60 * 60);

    // Token expires at checkout time or in 24 hours, whichever is sooner
    const expirationTime = Math.min(checkOutTimestamp, twentyFourHoursFromNow);

    // Ensure token doesn't expire in the past (edge case if check_out is very soon or already passed but DB state was slightly off)
    if (expirationTime <= now) {
      console.log(`Calculated expiration time (${expirationTime}) is in the past for Guest ID: ${guest.id}. Denying token generation.`);
       // Step 62: Return 401 for this edge case as well
      return res.status(401).json({ 
        error: 'Invalid credentials or inactive stay.' 
      });
    }

    // Check JWT_SECRET again before signing (belt and suspenders)
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-should-be-long-and-random') {
      console.error('JWT_SECRET not properly configured during guest login');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const payload = {
      guestId: guest.id,
      // Standard JWT claims
      iat: now, // Issued at
      exp: expirationTime // Expires at
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);

    console.log(`Guest JWT generated successfully for Guest ID: ${guest.id}`);

    // Step 62: Failure handling implemented above.

    // Send the token back to the client
    res.status(200).json({
      message: 'Guest login successful.',
      success: true,
      token: token,
      guest: { // Include some basic guest info for the frontend if needed
        id: guest.id,
        name: guest.name,
        roomNumber: guest.room_number
      }
    });

  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router; 