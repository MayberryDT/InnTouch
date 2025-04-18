/**
 * Room Service functionality for Inn Touch
 * Handles order form interaction, validation, and submission to backend
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const form = document.getElementById('room-service-form');
    const confirmation = document.getElementById('confirmation');
    const confirmationItems = document.getElementById('confirmation-items');
    const confirmationAmount = document.getElementById('confirmation-amount');
    const confirmationClose = document.getElementById('confirmation-close');
    const toastNotification = document.getElementById('toast-notification');
    const totalAmountEl = document.getElementById('total-amount');
    const quantityInputs = document.querySelectorAll('.quantity-input');
    const decreaseBtns = document.querySelectorAll('.decrease');
    const increaseBtns = document.querySelectorAll('.increase');
    const orderBtn = document.querySelector('button[type="submit"]');
    
    // Handle quantity decrease buttons
    decreaseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const input = document.querySelector(`.quantity-input[data-id="${id}"]`);
            let value = parseInt(input.value);
            if (value > 0) {
                input.value = value - 1;
                updateTotal();
                updateOrderButtonState();
            }
        });
    });
    
    // Handle quantity increase buttons with animation
    increaseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const input = document.querySelector(`.quantity-input[data-id="${id}"]`);
            let value = parseInt(input.value);
            input.value = value + 1;
            
            // Add animation class
            input.classList.add('item-added');
            setTimeout(() => {
                input.classList.remove('item-added');
            }, 300);
            
            updateTotal();
            updateOrderButtonState();
        });
    });
    
    // Update total when quantity inputs change
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            // Ensure value is not negative
            if (parseInt(this.value) < 0) {
                this.value = 0;
            }
            updateTotal();
            updateOrderButtonState();
        });
    });
    
    // Calculate and update the total amount
    function updateTotal() {
        let total = 0;
        quantityInputs.forEach(input => {
            const price = parseFloat(input.getAttribute('data-price'));
            const quantity = parseInt(input.value);
            total += price * quantity;
        });
        totalAmountEl.textContent = `$${total.toFixed(2)}`;
    }
    
    // Enable/disable order button based on item selection
    function updateOrderButtonState() {
        let hasItems = false;
        quantityInputs.forEach(input => {
            if (parseInt(input.value) > 0) {
                hasItems = true;
            }
        });
        
        orderBtn.disabled = !hasItems;
        
        if (hasItems) {
            orderBtn.classList.add('btn-active');
        } else {
            orderBtn.classList.remove('btn-active');
        }
    }
    
    // Collect order items
    function collectOrderItems() {
        const items = [];
        quantityInputs.forEach(input => {
            const quantity = parseInt(input.value);
            if (quantity > 0) {
                const id = input.getAttribute('data-id');
                const price = parseFloat(input.getAttribute('data-price'));
                const itemContainer = input.closest('.menu-item');
                const name = itemContainer.querySelector('.menu-item-name').textContent;
                
                items.push({
                    id: id,
                    name: name,
                    quantity: quantity,
                    price: price,
                    total: price * quantity
                });
            }
        });
        return items;
    }
    
    // Handle confirmation close button
    confirmationClose.addEventListener('click', function() {
        // Hide the confirmation
        confirmation.style.display = 'none';
        confirmation.classList.remove('slide-in');
    });
    
    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Check if at least one item is selected
        const items = collectOrderItems();
        
        if (items.length === 0) {
            showError('Please select at least one item.');
            return;
        }
        
        // Disable button during submission
        orderBtn.disabled = true;
        orderBtn.textContent = 'Placing Order...';
        
        // Collect special instructions
        const specialInstructions = document.getElementById('special-instructions').value;
        
        // Get guest ID from session storage
        const guestId = sessionStorage.getItem('guestId');
        
        if (!guestId) {
            showError('Authentication error: Guest ID not found. Please log in again.');
            orderBtn.disabled = false;
            orderBtn.textContent = 'Place Order';
            return;
        }
        
        // Create order object
        const order = {
            guest_id: guestId,
            items: items,
            special_instructions: specialInstructions,
            total: parseFloat(totalAmountEl.textContent.replace('$', ''))
        };
        
        // In a real implementation, send to backend
        submitOrder(order)
            .then(response => {
                // Populate the confirmation details
                populateConfirmationDetails(order, response.order_id);
                
                // Show a toast notification
                showToastNotification();
                
                // Show the detailed confirmation
                showConfirmation();
                
                // Reset form
                resetForm();
            })
            .catch(error => {
                showError(error.message || 'Failed to place order. Please try again.');
                
                // Re-enable button
                orderBtn.disabled = false;
                orderBtn.textContent = 'Place Order';
            });
    });
    
    // Submit order to API
    async function submitOrder(orderData) {
        try {
            // Here we would actually submit to API in a real implementation
            // For now, simulate a request
            
            // Simulate API delay
            // await new Promise(resolve => setTimeout(resolve, 1000)); // REMOVE SIMULATION
            
            // Generate a random order ID between 1000-9999
            // const orderId = Math.floor(Math.random() * 9000) + 1000; // REMOVE SIMULATION
            
            // Simulate successful response
            // return { // REMOVE SIMULATION
            //     success: true, // REMOVE SIMULATION
            //     order_id: orderId, // REMOVE SIMULATION
            //     message: 'Order placed successfully' // REMOVE SIMULATION
            // }; // REMOVE SIMULATION
            
            // In production, this would be:
            
            // Get the guest token from session storage
            const guestToken = sessionStorage.getItem('guestToken');
            
            if (!guestToken) {
                // This should ideally not happen if auth.js is working, but good to handle
                showError('Authentication error: No guest token found. Please log in again.');
                orderBtn.disabled = false;
                orderBtn.textContent = 'Place Order';
                return; // Stop submission
            }
            
            const response = await fetch('/guest/api/room-service', { // UNCOMMENT ACTUAL API CALL
                method: 'POST', // UNCOMMENT ACTUAL API CALL
                headers: { // UNCOMMENT ACTUAL API CALL
                    'Content-Type': 'application/json', // UNCOMMENT ACTUAL API CALL
                    'Authorization': `Bearer ${guestToken}` // ADD AUTHORIZATION HEADER
                }, // UNCOMMENT ACTUAL API CALL
                body: JSON.stringify(orderData) // UNCOMMENT ACTUAL API CALL
            }); // UNCOMMENT ACTUAL API CALL
            
            if (!response.ok) { // UNCOMMENT ACTUAL API CALL
                const errorData = await response.json(); // UNCOMMENT ACTUAL API CALL
                throw new Error(errorData.message || 'Failed to place order'); // UNCOMMENT ACTUAL API CALL
            } // UNCOMMENT ACTUAL API CALL
            
            return await response.json(); // UNCOMMENT ACTUAL API CALL
            
        } catch (error) {
            console.error('Error submitting order:', error);
            throw error;
        }
    }
    
    // Populate confirmation details
    function populateConfirmationDetails(order, orderId) {
        // Clear previous items
        confirmationItems.innerHTML = '';
        
        // Add order ID at the top
        const orderIdElement = document.createElement('div');
        orderIdElement.className = 'confirmation-item';
        orderIdElement.innerHTML = `<strong>Order #${orderId}</strong><span></span>`;
        confirmationItems.appendChild(orderIdElement);
        
        // Add each ordered item
        order.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'confirmation-item';
            itemElement.innerHTML = `
                <span>${item.quantity} × ${item.name}</span>
                <span>$${item.total.toFixed(2)}</span>
            `;
            confirmationItems.appendChild(itemElement);
        });
        
        // Set the total amount
        confirmationAmount.textContent = `$${order.total.toFixed(2)}`;
        
        // Set delivery time (would be calculated from backend in a real app)
        const deliveryTimeElement = document.getElementById('delivery-time');
        const now = new Date();
        const deliveryTime = new Date(now.getTime() + 45 * 60000); // 45 minutes later
        deliveryTimeElement.textContent = `${deliveryTime.getHours()}:${String(deliveryTime.getMinutes()).padStart(2, '0')}`;
    }
    
    // Show toast notification
    function showToastNotification() {
        toastNotification.classList.add('show');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            toastNotification.classList.remove('show');
        }, 3000);
    }
    
    // Show confirmation message
    function showConfirmation() {
        confirmation.style.display = 'block';
        
        // Slight delay to allow display to take effect before animation
        setTimeout(() => {
            confirmation.classList.add('slide-in');
        }, 50);
        
        // Scroll to the top of the page to show the confirmation
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Show error message
    function showError(message) {
        alert(message); // For now, use a basic alert
        // In a real implementation, show a toast or inline error
    }
    
    // Reset form after successful submission
    function resetForm() {
        form.reset();
        quantityInputs.forEach(input => {
            input.value = 0;
        });
        updateTotal();
        updateOrderButtonState();
        
        // Re-enable submit button
        orderBtn.disabled = false;
        orderBtn.textContent = 'Place Order';
    }
    
    // Initialize form state
    updateTotal();
    updateOrderButtonState();
}); 