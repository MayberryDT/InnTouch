# Step 63: Create Guest Jwt Middleware

**Date:** $(date +%Y-%m-%d %H:%M:%S)

**Changes Made:**
- Modified `src/server/middleware/auth.js`:
  - Added a new named Passport strategy `'jwt-guest'` within `configurePassport()`.
  - This strategy uses `passport-jwt` to extract the token, verifies the `guestId`, checks expiry, and uses `isGuestActive` to ensure the guest hasn't checked out since the token was issued.
  - Renamed the original staff JWT strategy to `'jwt-staff'` for clarity.
  - Refactored the `authenticateStaff` middleware to use `passport.authenticate('jwt-staff', ...)`.
  - Removed older/deprecated authentication functions.
- Modified `src/server/middleware/guest-auth.js`:
  - Replaced previous placeholder logic with a new `authenticateGuest` middleware function.
  - This function uses `passport.authenticate('jwt-guest', ...)` to apply the new guest strategy.
  - Handles success (attaches `req.user = { type: 'guest', id: guestId }`, calls `next()`) and failure (returns 401 error with message from strategy).
- Verified that `configurePassport()` is called in `src/server/index.js`.

**Files Modified:**
- `src/server/middleware/auth.js`
- `src/server/middleware/guest-auth.js`
- `docs/implementation-plan.md` (Marked step as complete)

**Next Steps:**
- Implement Step 64: Secure Guest API Routes by applying the new `authenticateGuest` middleware. 