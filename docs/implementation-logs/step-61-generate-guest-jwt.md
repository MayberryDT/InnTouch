# Step 61: Generate Guest Jwt

**Date:** $(date +%Y-%m-%d %H:%M:%S)

**Changes Made:**
- Updated the `POST /auth/guest/login` route in `src/server/routes/auth.js`:
  - Added logic to calculate the JWT expiration time (`exp`) based on the sooner of the guest's `check_out` date or 24 hours from now.
  - Added a check to prevent token generation if the calculated expiry is in the past.
  - Used `jwt.sign()` to create the token with `guestId`, `iat`, and `exp` claims, signed with `process.env.JWT_SECRET`.
  - Replaced the placeholder success response with the final success response, including the generated `token` and basic guest details.

**Files Modified:**
- `src/server/routes/auth.js`
- `docs/implementation-plan.md` (Marked step as complete)

**Next Steps:**
- Implement Step 62: Handle Login Failures (returning proper 401 errors). 