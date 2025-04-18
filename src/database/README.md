# Inn Touch Database Modules

This directory contains database operation modules for the Inn Touch application.

## Modules

### Feedback

The feedback module (`feedback.js`) provides database operations for guest feedback:

- `saveFeedback(feedback)`: Saves a new feedback entry to the database
  - Parameters:
    - `feedback.guest_id`: The ID of the guest submitting feedback
    - `feedback.rating`: A numeric rating between 1 and 5 (must be a whole number)
    - `feedback.comments`: Optional text comments (max 1000 characters, no HTML/scripts allowed)
    - `feedback.timestamp`: ISO timestamp of when the feedback was submitted
  - Returns: Promise resolving to the ID of the inserted feedback

- `getAllFeedback(filters)`: Retrieves all feedback submissions with optional filtering
  - Parameters:
    - `filters.rating`: Filter by exact rating (1-5)
    - `filters.minRating`: Filter by minimum rating
    - `filters.maxRating`: Filter by maximum rating
    - `filters.startDate`: Filter by start date (ISO string)
    - `filters.endDate`: Filter by end date (ISO string)
    - `filters.sort`: Sort field (timestamp, rating)
    - `filters.order`: Sort order (asc, desc)
  - Returns: Promise resolving to an array of feedback objects
  
#### Validation Rules for Feedback

The feedback API enforces the following validation rules:
- Rating must be present and required
- Rating must be a number between 1 and 5 (inclusive)
- Rating must be a whole number (integer)
- Comments are optional
- If comments are provided, they must be a string
- Comments cannot exceed 1000 characters
- Comments cannot contain HTML tags or scripts for security (prevents XSS)

#### Example Usage

```javascript
// Save feedback
const feedbackId = await feedback.saveFeedback({
  guest_id: 1,
  rating: 5,
  comments: 'Excellent service!',
  timestamp: new Date().toISOString()
});

// Get all feedback
const allFeedback = await feedback.getAllFeedback();

// Get high-rated feedback from the last week
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const highRatedRecentFeedback = await feedback.getAllFeedback({
  minRating: 4,
  startDate: oneWeekAgo.toISOString(),
  sort: 'rating',
  order: 'desc'
});
``` 