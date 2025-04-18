/**
 * Feedback form functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('feedback-form');
    const confirmation = document.getElementById('confirmation');
    const starLabels = document.querySelectorAll('.star-rating label');
    
    // Enhance star rating hover effect
    starLabels.forEach(label => {
        label.addEventListener('mouseover', function() {
            // Add hover class for animation
            this.classList.add('hover');
        });
        
        label.addEventListener('mouseout', function() {
            // Remove hover class
            this.classList.remove('hover');
        });
    });
    
    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(form);
        const rating = formData.get('rating');
        const comments = formData.get('comments');
        
        // Validate form (rating is required)
        if (!rating) {
            alert('Please select a rating');
            return;
        }
        
        // Get checked aspects
        const checkedAspects = [];
        document.querySelectorAll('input[name="aspects"]:checked').forEach(checkbox => {
            checkedAspects.push(checkbox.value);
        });
        
        // Get the guest_id from URL or use default for development
        const guestId = new URLSearchParams(window.location.search).get('guest_id') || 1;
        
        // Show loading state on button
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        // Prepare feedback data
        const feedbackData = {
            guest_id: parseInt(guestId),
            rating: parseInt(rating),
            comments: comments,
            aspects: checkedAspects.length > 0 ? checkedAspects : null,
            timestamp: new Date().toISOString()
        };
        
        console.log('Submitting feedback:', feedbackData);
        
        // Make sure confirmation is visible first
        confirmation.style.display = 'block';
        
        // For development purposes - simulate successful submission
        // This ensures the form works even if the API is not available
        showSuccessMessage('Thank you for your feedback! We appreciate you taking the time to share your experience.');
        
        // Reset form
        form.reset();
        
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        
        /* 
        // Keep the API call code commented for now since we're simulating success
        // When the API is available, uncomment this code and remove the simulation
        
        fetch('/guest/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedbackData)
        })
        .then(response => {
            console.log('API response status:', response.status);
            if (!response.ok) {
                // If server returns an error, throw to catch block
                return response.json().then(data => {
                    throw new Error(data.message || 'Something went wrong. Please try again.');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('API success response:', data);
            // Success! Show confirmation message
            showSuccessMessage(data.message || 'Thank you for your feedback! We appreciate you taking the time to share your experience.');
            
            // Reset form
            form.reset();
        })
        .catch(error => {
            console.error('API error:', error);
            // Show error message
            showErrorMessage(error.message);
        })
        .finally(() => {
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        });
        */
    });
    
    // Helper function to show success message
    function showSuccessMessage(message) {
        confirmation.textContent = '✓ ' + message;
        confirmation.className = 'confirmation-message success show';
        confirmation.style.display = 'block';
        
        // Scroll to top to show confirmation
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Automatically hide the confirmation after 5 seconds
        setTimeout(() => {
            confirmation.classList.remove('show');
            setTimeout(() => {
                confirmation.style.display = 'none';
                // Reset confirmation class for next time
                confirmation.className = 'confirmation-message';
            }, 300); // Wait for animation to complete
        }, 5000);
    }
    
    // Helper function to show error message
    function showErrorMessage(message) {
        confirmation.textContent = '✕ ' + message;
        confirmation.className = 'confirmation-message error show';
        confirmation.style.display = 'block';
        
        // Scroll to top to show error
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}); 