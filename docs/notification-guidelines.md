# Staff Notification Guidelines for Inn Touch

This document provides guidelines for implementing staff notifications in the frontend application of Inn Touch. These notifications alert staff when a chat requires their intervention, creating a seamless experience for guests and ensuring timely responses.

## Notification Types

The WebSocket server sends different types of notifications to staff clients. All notifications use the type `escalation_notification` with different `notificationType` values:

1. **New Escalation** (`notificationType: 'new_escalation'`): When a guest chat is first escalated to staff, either automatically after 3 messages or by keyword detection.

2. **Guest Requested** (`notificationType: 'guest_requested'`): When a guest explicitly requests to speak with staff, requiring higher priority attention.

3. **New Message** (`notificationType: 'new_message'`): When a guest sends a new message in an already escalated chat that has not yet been acknowledged by staff.

4. **Reminder** (`notificationType: 'reminder'`): Periodic reminders for escalated chats that haven't been answered yet.

## Notification Data

Each notification includes the following data:

- `guestId`: The unique identifier for the guest
- `guestName`: The guest's name
- `roomNumber`: The guest's room number
- `urgencyLevel`: A number from 1-3 indicating notification priority
- `messageCount`: The total number of messages in the conversation
- `waitTime` (for reminders): How long the guest has been waiting
- `lastMessage` or `message`: The content of the guest's most recent message
- `timestamp`: When the notification was sent

## Urgency Levels

Notifications have three urgency levels that should be visually distinguished:

- **Level 1**: Normal priority - New escalations
- **Level 2**: Medium priority - Guest explicitly requested help or longer wait times
- **Level 3**: High priority - Guest has been waiting for an extended period

## Frontend Implementation Recommendations

### Visual Notifications

1. **Notification Badge**: Display a counter on the Chat tab/menu item showing the number of unacknowledged escalated chats.

2. **Notification Panel**: Create a panel that lists all escalated chats with:
   - Guest name and room number
   - Time waiting for a response
   - Preview of the last message
   - Visual indicator of urgency level

3. **Urgency Visual Cues**:
   - Level 1: Blue highlight
   - Level 2: Yellow/Orange highlight
   - Level 3: Red highlight with animation

### Sound Notifications

Different sounds should be played based on notification type and urgency level:

1. **New Escalation**: Gentle notification sound
2. **Guest Requested**: Medium-attention notification sound
3. **New Message**: Brief chat sound if already viewing other chats
4. **Reminder (Level 3)**: More urgent sound for prolonged waiting

### Interaction Pattern

1. **Notification List**: Staff should see a chronological list of all escalated chats
2. **Quick Actions**: 
   - Accept: Immediately join the chat
   - Acknowledge: Mark as seen but not yet handling
   - Dismiss: Remove from urgent list (only for specific scenarios)

3. **Acknowledgment Flow**:
   - When staff clicks "Accept" or sends a message to a guest, the notification is automatically acknowledged
   - This triggers a WebSocket message: `{ type: 'acknowledge_notification', guestId: 'ID' }`
   - Other staff are notified via `notification_acknowledged` message

### Persistent State

The dashboard should maintain a list of escalated chats even if the staff member refreshes the page:

- On authentication, staff receives an `escalation_summary` with all current escalations
- This data should populate the notification panel immediately

## Example UI Components

### Notification Badge
```html
<span class="notification-badge urgency-level-2">3</span>
```

### Notification Panel Item
```html
<div class="notification-item urgency-level-3">
  <div class="guest-info">
    <span class="guest-name">John Smith</span>
    <span class="room-number">Room 101</span>
  </div>
  <div class="notification-content">
    <p class="last-message">I need help with the WiFi password</p>
    <span class="wait-time">Waiting: 5 minutes</span>
  </div>
  <div class="notification-actions">
    <button class="accept-btn">Accept</button>
    <button class="acknowledge-btn">Acknowledge</button>
  </div>
</div>
```

### CSS Styling Example
```css
.notification-item {
  border-left: 4px solid transparent;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.urgency-level-1 {
  border-left-color: #3B82F6; /* Blue */
  background-color: rgba(59, 130, 246, 0.1);
}

.urgency-level-2 {
  border-left-color: #F59E0B; /* Amber */
  background-color: rgba(245, 158, 11, 0.1);
}

.urgency-level-3 {
  border-left-color: #EF4444; /* Red */
  background-color: rgba(239, 68, 68, 0.1);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
```

## JavaScript Event Handling

Here's an example of handling notifications in the staff dashboard:

```javascript
// Connect to WebSocket
const socket = new WebSocket('ws://your-server-url');

// Track notifications
const notifications = {};

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'escalation_notification') {
    // Update notifications collection
    notifications[data.guestId] = {
      ...data,
      receivedAt: new Date()
    };
    
    // Update UI
    updateNotificationPanel();
    
    // Play sound based on urgency and type
    playNotificationSound(data.urgencyLevel, data.notificationType);
  }
  
  if (data.type === 'escalation_handled' || data.type === 'notification_acknowledged') {
    // Remove from active notifications
    if (notifications[data.guestId]) {
      delete notifications[data.guestId];
      updateNotificationPanel();
    }
  }
});

// Handle accepting a chat
function acceptChat(guestId) {
  // Send acceptance to server
  socket.send(JSON.stringify({
    type: 'accept_chat',
    guestId
  }));
  
  // Update UI
  showChatInterface(guestId);
}

// Handle acknowledging a notification
function acknowledgeNotification(guestId) {
  socket.send(JSON.stringify({
    type: 'acknowledge_notification',
    guestId
  }));
  
  // Update UI
  if (notifications[guestId]) {
    notifications[guestId].acknowledged = true;
    updateNotificationPanel();
  }
}
```

## Best Practices

1. **Prioritize UX**: Ensure notifications are noticeable but not disruptive
2. **Accessibility**: Include visual and non-visual cues (screen reader support)
3. **Responsiveness**: Design notifications to work on both desktop and mobile staff interfaces
4. **Configurability**: Allow staff to customize notification sounds and visual preferences
5. **Fallbacks**: If WebSocket disconnects, poll the server for escalated chats

By following these guidelines, you can implement an effective staff notification system that ensures no guest query goes unanswered and promotes timely responses. 