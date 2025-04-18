# Step 59: Backend Login Logic Db Query

**Date:** $(date +%Y-%m-%d %H:%M:%S)

**Changes Made:**
- Added `findGuestByRoomAndName` function to `src/server/db/guests.js` to query the `guests` table by room number and case-insensitive last name.
- Updated the `POST /auth/guest/login` route in `src/server/routes/auth.js`:
  - Imported and used the `findGuestByRoomAndName` function.
  - Made the route handler `async`.
  - Added logic to check if a guest was found based on the database query.
  - Updated the placeholder response to indicate whether the guest was found.
- **NOTE:** Validation of guest status (check-out date) and JWT generation are *not* implemented in this step and will follow in Steps 60-61.

**Files Modified:**
- `src/server/db/guests.js`
- `src/server/routes/auth.js`
- `docs/implementation-plan.md` (Marked step as complete)

**Next Steps:**
- Implement Step 60: Validate Guest Status (check_out date). 