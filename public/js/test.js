// Test JavaScript file to verify static file serving
document.addEventListener('DOMContentLoaded', function() {
    // Add a timestamp to show that the JavaScript file is loaded correctly
    const timestamp = new Date().toLocaleString();
    
    // Create element for displaying timestamp
    const timestampElement = document.createElement('div');
    timestampElement.className = 'card';
    timestampElement.innerHTML = `
        <h3>JavaScript Test</h3>
        <p>This content was added by JavaScript.</p>
        <p>Page loaded at: <strong>${timestamp}</strong></p>
    `;
    
    // Find the container to append the timestamp
    const container = document.querySelector('.container');
    if (container) {
        container.appendChild(timestampElement);
    }
    
    // Add event listeners to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            alert('Button clicked! JavaScript is working.');
        });
    });
}); 