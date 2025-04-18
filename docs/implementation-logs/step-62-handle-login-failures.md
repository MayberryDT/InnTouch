# Step 62: Handle Login Failures

**Date:** $(date +%Y-%m-%d %H:%M:%S)

**Changes Made:**
- Updated the `POST /auth/guest/login` route in `src/server/routes/auth.js`:
  - Changed the status code to `401 Unauthorized` for login failures:
    - When the guest is not found (`findGuestByRoomAndName` returns null).
    - When the guest is found but inactive (`isGuestActive` returns false).
    - When the calculated token expiry time is in the past (edge case).
  - Updated the JSON response body for these failures to a generic `{ error: 'Invalid credentials or inactive stay.' }` message.

**Files Modified:**
- `src/server/routes/auth.js`
- `docs/implementation-plan.md` (Marked step as complete)

**Next Steps:**
- Implement Step 63: Create Guest JWT Middleware. 