const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const staffConfig = require('../config/staff.json');
const jwt = require('jsonwebtoken');
const { isGuestActive } = require('../db/guests'); // Import isGuestActive

// Configure passport to use JWT strategy
const configurePassport = () => {
  console.log('Configuring Passport JWT strategies (Staff & Guest)');
  
  // Verify JWT_SECRET is set
  if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET is not set in environment variables!');
    process.exit(1);
  }
  
  if (process.env.JWT_SECRET === 'your-secret-key-should-be-long-and-random') {
    console.warn('WARNING: Using default JWT_SECRET value. This is insecure for production!');
  } else {
    console.log('JWT_SECRET is properly configured');
  }

  const commonOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  // --- Staff JWT Strategy --- 
  passport.use('jwt-staff', // Use a named strategy for clarity
    new JwtStrategy(commonOptions, (jwtPayload, done) => {
      try {
        console.log('Verifying STAFF JWT payload:', jwtPayload);
        
        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (jwtPayload.exp && jwtPayload.exp < currentTime) {
          console.log('Staff JWT token has expired');
          return done(null, false, { message: 'Token expired' });
        }
        
        // Check if the user exists in our staff config
        const user = staffConfig.users.find(u => u.username === jwtPayload.username);
        
        if (!user) {
          console.log(`Staff user not found in staff config: ${jwtPayload.username}`);
          return done(null, false, { message: 'User not found' });
        }

        console.log(`Successfully authenticated staff user: ${user.username}, role: ${user.role}`);
        
        // User found, pass the user info to the next middleware
        return done(null, {
          type: 'staff',
          username: user.username,
          role: user.role
        });
      } catch (error) {
        console.error('Error during Staff JWT verification:', error);
        return done(error, false);
      }
    })
  );

  // --- Guest JWT Strategy --- (Step 63)
  passport.use('jwt-guest', // Named strategy for guests
    new JwtStrategy(commonOptions, async (jwtPayload, done) => {
      try {
        console.log('Verifying GUEST JWT payload:', jwtPayload);

        // Check if guestId is present in the payload
        if (!jwtPayload.guestId) {
          console.log('Guest JWT missing guestId');
          return done(null, false, { message: 'Invalid token: Missing guestId' });
        }

        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (jwtPayload.exp && jwtPayload.exp < currentTime) {
          console.log(`Guest JWT token has expired for guestId: ${jwtPayload.guestId}`);
          return done(null, false, { message: 'Token expired' });
        }

        // Check if the guest is still active in the database
        const isActive = await isGuestActive(jwtPayload.guestId);
        if (!isActive) {
          console.log(`Guest associated with token is no longer active (checked out): guestId ${jwtPayload.guestId}`);
          return done(null, false, { message: 'Guest session invalid (inactive stay)' });
        }

        console.log(`Successfully authenticated guest user: guestId ${jwtPayload.guestId}`);
        
        // Guest is valid and active, pass minimal info
        return done(null, {
          type: 'guest',
          id: jwtPayload.guestId
        });

      } catch (error) {
        console.error('Error during Guest JWT verification:', error);
        return done(error, false);
      }
    })
  );

  return passport;
};

// Middleware to authenticate staff endpoints (Uses 'jwt-staff')
const authenticateStaff = (req, res, next) => {
  passport.authenticate('jwt-staff', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Use the message from the strategy (e.g., 'Token expired', 'User not found')
      const message = info?.message || 'Unauthorized';
      console.log('Staff authentication failed:', message);
      return res.status(401).json({ error: message });
    }
    // Check role specifically if needed (though strategy already found the user)
    if (user.role !== 'staff' && user.role !== 'admin') {
      console.log('Staff authentication failed: Incorrect role', user.role);
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    req.user = user; // Attach staff user info
    console.log('Staff authentication successful via Passport middleware');
    next();
  })(req, res, next);
};

// Middleware to authenticate guest endpoints (Uses 'jwt-guest')
const authenticateGuest = (req, res, next) => {
  passport.authenticate('jwt-guest', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Use the message from the strategy (e.g., 'Token expired', 'Invalid token', 'Guest session invalid')
      const message = info?.message || 'Unauthorized';
      console.log('Guest authentication failed:', message);
      return res.status(401).json({ error: message });
    }
    
    // Check user type - should always be 'guest' here
    if (user.type !== 'guest' || !user.id) {
      console.error('Guest authentication failed: Unexpected user object structure', user);
      return res.status(401).json({ error: 'Unauthorized' }); // Treat as unauthorized
    }

    req.user = user; // Attach guest user info ({ type: 'guest', id: guestId })
    req.guestId = user.id; // Explicitly attach guestId for use in validation middleware
    console.log(`Guest authentication successful via Passport middleware for guestId: ${user.id}`);
    next();
  })(req, res, next);
};

// Middleware to authenticate EITHER guest OR staff endpoints
const authenticateAny = (req, res, next) => {
  passport.authenticate(['jwt-guest', 'jwt-staff'], { session: false }, (err, user, info) => {
    if (err) {
      console.error('Error during JWT authentication (Guest or Staff):', err);
      return res.status(500).json({ error: 'Authentication error' });
    }
    if (!user) {
      // If info exists, provide that message, otherwise default
      const message = info?.message || 'Unauthorized';
      console.log(`Authentication failed (Guest or Staff): ${message}`);
      return res.status(401).json({ error: message });
    }

    // Attach the authenticated user (could be guest or staff)
    req.user = user;
    console.log(`Authentication successful via Passport middleware: Type=${user.type}, ID/Username=${user.id || user.username}`);
    next();
  })(req, res, next);
};

// DEPRECATED/REPLACED - Keeping for reference or potential future use
// const authenticateStaff_old = (req, res, next) => { ... };

// DEPRECATED/REPLACED - Keeping for reference or potential future use
// const authenticateRequest = (req, res, next) => { ... }; 

module.exports = {
  configurePassport,
  authenticateStaff,
  authenticateGuest,
  authenticateAny, // Export the new middleware
  // Removed deprecated functions from export
}; 