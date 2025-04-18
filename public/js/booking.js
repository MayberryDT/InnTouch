/**
 * Booking functionality script
 * Handles fetching available services and time slots from the backend,
 * and submits booking requests.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get guest ID from URL path or query parameters
    const guestId = getGuestId();
    
    // Elements
    const tabs = document.querySelectorAll('.booking-tab');
    const contents = document.querySelectorAll('.booking-content');
    const bookingFormContainer = document.getElementById('booking-form-container');
    const bookingForm = document.getElementById('booking-form');
    const bookingSummary = document.getElementById('booking-summary');
    const cancelBookingBtn = document.getElementById('cancel-booking');
    const confirmation = document.getElementById('confirmation');
    const confirmationMessage = document.getElementById('confirmation-message');
    const bookingDetails = document.getElementById('booking-details');
    const bookingError = document.getElementById('booking-error');
    const errorMessage = document.getElementById('error-message');
    const formError = document.getElementById('form-error');
    
    // Variables for tracking selected options
    let selectedService = '';
    let selectedTime = '';
    let selectedType = '';
    let selectedDate = formatDate(new Date()); // Default to today
    
    // Add date selector to each booking tab content
    const amenitiesContent = document.getElementById('amenities');
    const toursContent = document.getElementById('tours');
    
    // Add date pickers to both tabs
    addDatePicker(amenitiesContent, 'amenity');
    addDatePicker(toursContent, 'tour');
    
    // ---- Initialize functionality ----
    
    // Tab functionality
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to selected tab and content
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Initialize time slot selection for the predefined time slots
    initializeTimeSlots();
    
    // Initialize booking items with event listeners
    initializeBookingItems();
    
    // Date picker change events
    document.querySelectorAll('.date-picker').forEach(datePicker => {
        datePicker.addEventListener('change', function() {
            const type = this.getAttribute('data-type');
            const date = this.value;
            
            // Update the selected date
            selectedDate = date;
            
            // Fetch available time slots for all services of this type
            const bookingItems = document.querySelectorAll(`.booking-content[id="${type}s"] .booking-item`);
            
            bookingItems.forEach(item => {
                const serviceName = item.querySelector('.booking-title').textContent;
                fetchAvailableTimeSlots(type, serviceName, date, item);
            });
        });
    });
    
    // Form submission
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Reset error message
        hideFormError();
        
        const bookingName = document.getElementById('booking-name').value;
        const bookingEmail = document.getElementById('booking-email').value;
        const bookingNotes = document.getElementById('booking-notes').value;
        
        // Validate inputs
        if (!bookingName.trim()) {
            showFormError('Please enter your name.');
            return;
        }
        
        if (!bookingEmail.trim()) {
            showFormError('Please enter your email address.');
            return;
        }
        
        if (!validateEmail(bookingEmail)) {
            showFormError('Please enter a valid email address.');
            return;
        }
        
        // Create booking data object - Remove guest_id, server uses token
        const bookingData = {
            // guest_id: guestId, // Removed: Let server determine guest from token
            type: selectedType,
            service: selectedService,
            date: selectedDate,
            time: selectedTime,
            notes: bookingNotes
        };
        
        // Submit booking to the API
        submitBooking(bookingData);
    });
    
    // Cancel booking button
    cancelBookingBtn.addEventListener('click', function() {
        hideFormError();
        bookingFormContainer.style.display = 'none';
        
        // Clear form
        bookingForm.reset();
        
        // Clear selections
        document.querySelectorAll('.time-slot.selected').forEach(slot => {
            slot.classList.remove('selected');
        });
    });
    
    // ---- Functions ----
    
    /**
     * Initialize the time slot selection for all predefined time slots
     */
    function initializeTimeSlots() {
        // Get all initial time slots
        const timeSlots = document.querySelectorAll('.time-slot');
        
        // Add click event to each time slot
        timeSlots.forEach(slot => {
            slot.addEventListener('click', function() {
                // Find parent booking-time element
                const bookingTime = this.closest('.booking-time');
                
                // Remove selected class from all slots in this booking
                bookingTime.querySelectorAll('.time-slot').forEach(s => {
                    s.classList.remove('selected');
                });
                
                // Add selected class to clicked slot
                this.classList.add('selected');
            });
        });
    }
    
    /**
     * Initialize booking items with event listeners
     */
    function initializeBookingItems() {
        // Get all booking buttons
        const bookButtons = document.querySelectorAll('.book-btn');
        
        // Add click event to each book button
        bookButtons.forEach(button => {
            button.addEventListener('click', function() {
                const service = this.getAttribute('data-service');
                const bookingItem = this.closest('.booking-item');
                const selectedTimeSlot = bookingItem.querySelector('.time-slot.selected');
                
                if (!selectedTimeSlot) {
                    alert('Please select a time slot first.');
                    return;
                }
                
                // Determine the booking type based on the parent container
                const parentContent = bookingItem.parentElement;
                selectedType = parentContent.id === 'amenities' ? 'amenity' : 'tour';
                
                selectedService = bookingItem.querySelector('.booking-title').textContent;
                selectedTime = selectedTimeSlot.textContent.trim();
                
                // Update booking summary
                bookingSummary.textContent = `You are booking ${selectedService} at ${selectedTime} on ${formatDateForDisplay(selectedDate)}.`;
                
                // Hide any global error messages
                hideGlobalError();
                
                // Show booking form
                bookingFormContainer.style.display = 'block';
                
                // Scroll to booking form
                bookingFormContainer.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }
    
    /**
     * Add date picker to a booking tab content
     * @param {HTMLElement} container - The tab content container
     * @param {string} type - The booking type (amenity or tour)
     */
    function addDatePicker(container, type) {
        // Create date picker element
        const datePickerContainer = document.createElement('div');
        datePickerContainer.className = 'date-picker-container';
        datePickerContainer.innerHTML = `
            <label for="${type}-date">Select Date:</label>
            <input type="date" id="${type}-date" class="date-picker" data-type="${type}" value="${selectedDate}" min="${formatDate(new Date())}">
        `;
        
        // Insert at the beginning of the container
        container.insertBefore(datePickerContainer, container.firstChild);
    }
    
    /**
     * Fetch available time slots for a service and date
     * @param {string} type - The booking type (amenity or tour)
     * @param {string} serviceName - The name of the service
     * @param {string} date - The date in YYYY-MM-DD format
     * @param {HTMLElement} bookingItem - The booking item element to update
     */
    function fetchAvailableTimeSlots(type, serviceName, date, bookingItem) {
        // Show loading state
        const timeSlotContainer = bookingItem.querySelector('.booking-time');
        timeSlotContainer.innerHTML = '<div class="loading">Loading available times...</div>';
        
        console.log(`Fetching available slots for ${type} "${serviceName}" on ${date}`);
        
        // Fetch available time slots from the API
        fetch(`/api/availability?type=${type}&name=${encodeURIComponent(serviceName)}&date=${date}&guest_id=${guestId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Received available slots:', data);
                
                // Clear the time slots container
                timeSlotContainer.innerHTML = '';
                
                if (data.available_slots && data.available_slots.length > 0) {
                    // Create time slots for each available time
                    data.available_slots.forEach(time => {
                        const timeSlot = document.createElement('div');
                        timeSlot.className = 'time-slot';
                        timeSlot.textContent = formatTime(time);
                        
                        // Add click event to select time
                        timeSlot.addEventListener('click', function() {
                            // Clear other selected slots in this booking item
                            timeSlotContainer.querySelectorAll('.time-slot').forEach(slot => {
                                slot.classList.remove('selected');
                            });
                            
                            // Mark this slot as selected
                            this.classList.add('selected');
                        });
                        
                        timeSlotContainer.appendChild(timeSlot);
                    });
                } else {
                    // No available slots
                    timeSlotContainer.innerHTML = '<div class="no-slots">No available time slots for this date.</div>';
                }
            })
            .catch(error => {
                console.error('Error fetching available time slots:', error);
                timeSlotContainer.innerHTML = '<div class="error">Could not load time slots. Please try again.</div>';
            });
    }
    
    /**
     * Submit a booking to the API
     * @param {Object} bookingData - The booking data to submit
     */
    function submitBooking(bookingData) {
        // Hide any existing messages
        hideAllMessages();
        
        // Show loading state on the confirmation button
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Processing...';
        submitButton.disabled = true;
        
        // Convert time from 12-hour format to 24-hour format
        if (bookingData.time) {
            bookingData.time = convertTo24HourFormat(bookingData.time);
        }
        
        console.log('Submitting booking with data:', bookingData);
        
        // Retrieve auth token from sessionStorage
        const token = sessionStorage.getItem('guestToken');
        console.log('Retrieved token:', token);
        
        // Submit to the API
        fetch('/api/guest/booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Add Authorization header
            },
            body: JSON.stringify(bookingData)
        })
            .then(response => {
                console.log('Received response with status:', response.status);
                
                // Store the status code for error handling
                const statusCode = response.status;
                return response.json().then(data => {
                    // Attach the status code to the response data
                    return { ...data, statusCode };
                }).catch(err => {
                    // If JSON parsing fails, create a basic error object
                    return { 
                        success: false, 
                        statusCode, 
                        message: 'Unable to parse server response' 
                    };
                });
            })
            .then(data => {
                console.log('Processed response data:', data);
                
                // Reset button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                
                if (data.success || data.status === 'success') {
                    // Format the success message
                    showSuccessMessage(bookingData, data);
                    
                    // Clear form
                    bookingForm.reset();
                    
                    // Clear selections
                    document.querySelectorAll('.time-slot.selected').forEach(slot => {
                        slot.classList.remove('selected');
                    });
                    
                    // Hide booking form
                    bookingFormContainer.style.display = 'none';
                    
                    // Scroll to the top of the page to show the confirmation
                    window.scrollTo(0, 0);
                } else {
                    // Handle specific error cases based on status code
                    switch (data.statusCode) {
                        case 409:
                            // Conflict - time slot no longer available
                            showGlobalError('This time slot is no longer available. Please select another time.');
                            break;
                        case 400:
                            // Bad request - validation errors
                            showFormError(data.message || 'Please check your booking details and try again.');
                            break;
                        case 401:
                        case 403:
                            // Authentication/authorization issues
                            showGlobalError('You are not authorized to make this booking. Please check in at the front desk.');
                            break;
                        case 404:
                            // API endpoint not found
                            showGlobalError('Booking service is temporarily unavailable. Please try again later or contact the front desk.');
                            break;
                        default:
                            // Generic error
                            showFormError(data.message || 'There was a problem with your booking. Please try again.');
                    }
                }
            })
            .catch(error => {
                console.error('Error submitting booking:', error);
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                showFormError('Network error. Please check your connection and try again.');
            });
    }
    
    /**
     * Show a success message with booking details
     * @param {Object} bookingData - The booking data that was submitted
     * @param {Object} response - The API response
     */
    function showSuccessMessage(bookingData, response) {
        // Get the confirmation message element
        const detailsElement = document.getElementById('booking-details');
        
        // Set the confirmation message
        confirmationMessage.textContent = response.message || 'Your booking has been successfully confirmed!';
        
        // Set the booking details
        const formattedDate = formatDateForDisplay(bookingData.date);
        const formattedTime = bookingData.time;
        
        detailsElement.innerHTML = `
            <strong>Service:</strong> ${bookingData.service}<br>
            <strong>Date:</strong> ${formattedDate}<br>
            <strong>Time:</strong> ${formattedTime}<br>
            <strong>Booking ID:</strong> ${response.data?.id || 'N/A'}
        `;
        
        // Show the confirmation
        confirmation.style.display = 'block';
    }
    
    /**
     * Show an error message in the form
     * @param {string} message - The error message to show
     */
    function showFormError(message) {
        formError.textContent = message;
        formError.style.display = 'block';
    }
    
    /**
     * Hide the form error message
     */
    function hideFormError() {
        formError.textContent = '';
        formError.style.display = 'none';
    }
    
    /**
     * Show a global error message
     * @param {string} message - The error message to show
     */
    function showGlobalError(message) {
        errorMessage.textContent = message;
        bookingError.style.display = 'block';
        
        // Hide booking form
        bookingFormContainer.style.display = 'none';
        
        // Scroll to the top of the page to show the error message
        window.scrollTo(0, 0);
    }
    
    /**
     * Hide the global error message
     */
    function hideGlobalError() {
        bookingError.style.display = 'none';
    }
    
    /**
     * Hide all messaging components
     */
    function hideAllMessages() {
        hideFormError();
        hideGlobalError();
        confirmation.style.display = 'none';
    }
    
    /**
     * Validate an email address
     * @param {string} email - The email address to validate
     * @returns {boolean} Whether the email address is valid
     */
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // ---- Helper functions ----
    
    /**
     * Format a date object to YYYY-MM-DD string
     * @param {Date} date - The date to format
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Format a date string to a more readable format
     * @param {string} dateString - Date in YYYY-MM-DD format
     * @returns {string} Formatted date for display
     */
    function formatDateForDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    /**
     * Format a time string to a more readable format
     * @param {string} timeString - Time in HH:MM format
     * @returns {string} Formatted time for display
     */
    function formatTime(timeString) {
        // Convert 24-hour time to 12-hour format with AM/PM
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${period}`;
    }
    
    /**
     * Convert time from 12-hour format (1:00 PM) to 24-hour format (13:00)
     * @param {string} time12h - Time in 12-hour format (e.g., "1:00 PM")
     * @returns {string} Time in 24-hour format (e.g., "13:00")
     */
    function convertTo24HourFormat(time12h) {
        // Extract hours, minutes, and period
        const timeParts = time12h.match(/(\d+):(\d+)\s?(AM|PM)/i);
        if (!timeParts) return time12h; // Return original if format doesn't match
        
        let hours = parseInt(timeParts[1], 10);
        const minutes = timeParts[2];
        const period = timeParts[3].toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'PM' && hours < 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        // Format with leading zeros
        const formattedHours = hours.toString().padStart(2, '0');
        
        return `${formattedHours}:${minutes}`;
    }
    
    /**
     * Extract guest ID from the URL
     * @returns {string} The guest ID
     */
    function getGuestId() {
        // Extract guest ID from URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const guestId = urlParams.get('guestId');
        
        // Return the found guest ID or null if not found
        return guestId;
    }
}); 