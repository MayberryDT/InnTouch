# Step 60: Validate Guest Status

**Date:** $(date +%Y-%m-%d %H:%M:%S)

**Changes Made:**
- Updated the `POST /auth/guest/login` route in `src/server/routes/auth.js`:
  - Imported the existing `isGuestActive` function from `src/server/db/guests.js`.
  - Added logic after successfully finding a guest (Step 59) to call `isGuestActive` using the `guest.id`.
  - If `isGuestActive` returns `false`, the response now indicates the guest was found but is inactive.
  - If `isGuestActive` returns `true`, the response indicates the guest is active and validation passed.
- **NOTE:** Specific 401 error handling for inactive stays will be implemented in Step 62. JWT generation follows in Step 61.

**Files Modified:**
- `src/server/routes/auth.js`
- `docs/implementation-plan.md` (Marked step as complete)

**Next Steps:**
- Implement Step 61: Generate Guest JWT. 