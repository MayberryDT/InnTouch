# App Flow Document: Inn Touch

This document describes every page in the app and how users navigate between them. It is written in simple language and is painfully specific to provide a clear map of the app's structure and user flows.

---

## Page Descriptions and Navigation

### 0. Guest Login Page (New)
When a guest navigates to the app's main URL (e.g., `https://app.example.com/`), they first see the Guest Login Page. This page presents two input fields: one for their Room Number and one for their Last Name. There is a Login button below the fields. The guest enters their details and clicks Login. The app sends these details to the backend for verification against the guest list synced from Cloudbeds. If the details are correct and the guest's stay is active (check-out date is in the future), they are redirected to the Home Page. If the details are incorrect or the stay is not active, an error message like "Login failed. Please check your room number and last name, or contact the front desk." appears on the Login Page.

### 1. Home Page
*After* a guest successfully logs in via the Guest Login Page, they land on the Home Page. This page shows a welcome message with the guest's name and room number to confirm who they are. The Home Page has a navigation menu that is always visible on every guest-facing page. The navigation menu has links to Chat, Room Service, Bookings, Property Info, Local Map, and Feedback. The guest can click any of these links to go to those pages. The Home Page also has a short introduction text that says something like "Explore our services during your stay" to give the guest an idea of what they can do. From this page, the guest can click Chat to go to the Chat Page, Room Service to go to the Room Service Page, Bookings to go to the Booking Page, Property Info to go to the Property Info Page, Local Map to go to the Local Map Page, or Feedback to go to the Feedback Page. A Logout button should also be available, perhaps in the navigation menu, which logs the guest out and returns them to the Guest Login Page.

---

### 2. Chat Page
When a guest clicks Chat from the navigation menu on any page, they are taken to the Chat Page. This page has a chat interface with a message history area showing all previous messages and an input field at the bottom where the guest can type their message. When the guest first arrives, they are chatting with an AI agent. The AI responds to whatever the guest types based on rules or an external AI system. If the AI cannot answer the guest's question after three messages or if the guest types a word like "help," the AI sends a message saying "Would you like to speak to the front desk?" If the guest types "yes," the chat session switches to the front desk staff. The chat interface stays the same, but now the messages show they are from a human instead of the AI. The staff can see all the messages the guest sent to the AI before the switch. The guest can keep typing messages, and the staff will keep responding until the guest's problem is solved. To leave the chat, the guest can click any link in the navigation menu to go to another page, like back to the Home Page or to the Room Service Page.

---

### 3. Room Service Page
When a guest clicks Room Service from the navigation menu on any page, they are taken to the Room Service Page. This page shows a menu of items the guest can order, split into sections like Breakfast, Lunch, and Drinks. Each item has a name, a short description, and a price next to it. Next to each item is a checkbox or a number field where the guest can pick how many they want. After the guest picks their items, they scroll to the bottom of the page and click an Order button. When they click Order, the app sends the order to the backend system, saves it in the database, and shows a message on the same page that says "Your order has been placed, thank you!" After seeing this message, the guest can click any link in the navigation menu to go to another page, like back to the Home Page or to the Chat Page.

---

### 4. Booking Page
When a guest clicks Bookings from the navigation menu on any page, they are taken to the Booking Page. This page has two sections: one for in-house amenities like spa or gym and one for local tours. Each section has a list of options. For amenities, it might list Spa Massage or Gym Access, and for tours, it might list City Tour or Beach Trip. Each option has a description and a list of available time slots, like 10:00 AM or 2:00 PM. The guest picks an option by clicking it, then picks a time slot by clicking a button next to the time. After picking both, the guest clicks a Book button next to the time slot. The app checks if the time slot is still available, and if it is, the booking is saved in the backend. Then a message appears on the same page saying "Your booking is confirmed!" If the time slot is not available, a message says "Sorry, this time is no longer available." After seeing either message, the guest can click any link in the navigation menu to go to another page, like back to the Home Page or to the Property Info Page.

---

### 5. Property Info Page
When a guest clicks Property Info from the navigation menu on any page, they are taken to the Property Info Page. This page has static information about the property. It includes a section about amenities like pool or restaurant, a section about policies like no smoking, a section about check-in and check-out times like 3:00 PM check-in and 11:00 AM check-out, and a section with contact information like a phone number. Each section has a title that the guest can click to expand or collapse the details below it. There are no buttons or forms here, just text to read. The guest can click any link in the navigation menu to go to another page, like back to the Home Page or to the Local Map Page.

---

### 6. Local Map Page
When a guest clicks Local Map from the navigation menu on any page, they are taken to the Local Map Page. This page shows an interactive map using something like Leaflet with OpenStreetMap. The map has markers for nearby places like restaurants or shops that the property recommends. When the guest clicks a marker, a small box pops up with the place's name, what it is (like "Italian Restaurant"), and how far it is from the property in miles or kilometers. The guest can drag the map around or zoom in and out to see more places. To leave this page, the guest can click any link in the navigation menu to go to another page, like back to the Home Page or to the Feedback Page.

---

### 7. Feedback Page
When a guest clicks Feedback from the navigation menu on any page, they are taken to the Feedback Page. This page has a form with a rating part where the guest can pick a number from 1 to 5 stars by clicking on the stars and a comment box where the guest can type whatever they want to say about their stay. At the bottom of the form is a Submit button. When the guest clicks Submit, the app sends the rating and comment to the backend system, and a message appears on the same page saying "Thank you for your feedback!" After seeing this message, the guest can click any link in the navigation menu to go to another page, like back to the Home Page or to the Chat Page.

---

### 8. Staff Dashboard
Staff get to the Staff Dashboard by going to a different URL, like `/staff`, in their browser. When they go to this URL, they see a login page asking for their username and password. After typing their username and password and clicking a Login button, they are taken to the Staff Dashboard if the details are correct. If the details are wrong, a message says "Login failed, try again." Once on the Staff Dashboard, they see a button that says Sync Cloudbeds Data, a list of escalated chats, a list of recent room service orders, and a list of recent bookings. Clicking the Sync Cloudbeds Data button sends a request to the backend to pull the latest guest info from Cloudbeds, and a message says "Data synced" when it's done. The escalated chats list shows each chat with the guest's name or room number and the last message they sent. Clicking a chat in the list opens a chat interface on the same page, replacing the dashboard, where the staff can type and send messages to the guest. This chat interface has a Back button that takes the staff back to the Staff Dashboard when clicked. The room service orders list shows each order with the guest's room number and what they ordered. The bookings list shows each booking with the guest's room number and what they booked. For simplicity, clicking an order or booking does nothing extra right now, but the staff can still see them. To log out, the staff can click a Logout button that takes them back to the login page.

---

## User Navigation Flows

### Guest Navigation
The guest starts by navigating to the app's main URL, which takes them to the Guest Login Page. They enter their Room Number and Last Name and click Login. If successful, they land on the Home Page. From the Home Page, they can click Chat to go to the Chat Page, Room Service to go to the Room Service Page, Bookings to go to the Booking Page, Property Info to go to the Property Info Page, Local Map to go to the Local Map Page, or Feedback to go to the Feedback Page. On the Chat Page, they start talking to the AI, and if they say "yes" to the AI's question about the front desk, they stay on the same page but start talking to staff instead. On the Room Service Page, after clicking Order, they see a confirmation message and can then click any navigation menu link to go to another page. On the Booking Page, after clicking Book, they see a confirmation message and can then click any navigation menu link to go to another page. On the Feedback Page, after clicking Submit, they see a thank-you message and can then click any navigation menu link to go to another page. From any page with the navigation menu, they can always click Home to go back to the Home Page, Chat to go to the Chat Page, Room Service to go to the Room Service Page, Bookings to go to the Booking Page, Property Info to go to the Property Info Page, Local Map to go to the Local Map Page, or Feedback to go to the Feedback Page. Clicking the Logout link in the navigation menu logs them out and returns them to the Guest Login Page.

### Staff Navigation
Staff start by going to the `/staff` URL in their browser, which shows them a login page. After typing their username and password and clicking Login, they go to the Staff Dashboard. From the Staff Dashboard, they can click Sync Cloudbeds Data to update guest info and stay on the same page with a "Data synced" message. They can click a chat in the escalated chats list to open the chat interface on the same page, replacing the dashboard. In the chat interface, they can type messages to the guest and click a Back button to go back to the Staff Dashboard. They can see the room service orders list and bookings list but cannot click them for more details right now. To leave the Staff Dashboard, they click a Logout button, which takes them back to the login page.

---

## Additional Flows and Edge Cases
On the Chat Page, if the AI asks "Would you like to speak to the front desk?" and the guest says "yes," the chat stays on the same page but switches to staff. The backend sends a notice to the staff, and when a staff member joins, they start typing in the same chat window the guest is using. On the Room Service Page, after the guest clicks Order, the confirmation message shows up right there, and they can click a navigation menu link to leave. On the Booking Page, after the guest clicks Book, the confirmation message shows up right there if the booking works, or an error message shows up if the time slot is taken, and they can click a navigation menu link to leave. On the Feedback Page, after the guest clicks Submit, the thank-you message shows up right there, and they can click a navigation menu link to leave. If a booking time slot is not available, the Book button next to that time slot is grayed out and cannot be clicked, or a message says "Not available." If a guest tries to access a page that requires login (like the Home Page) without being logged in, they should be redirected to the Guest Login Page. If a guest enters incorrect login details (Room Number / Last Name) or their stay is not active, the Guest Login Page shows an error message. If staff go to `/staff` without logging in or after logging out, they see the login page and must type their username and password to get to the Staff Dashboard.

---

This App Flow Document gives a painfully specific map of every page in the app and how users move from one to another, using simple language with no vagueness for the best results with Cursor.