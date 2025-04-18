document.addEventListener('DOMContentLoaded', function() {
    // Add click event to all section headers
    const sectionHeaders = document.querySelectorAll('.section-header');
    
    sectionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            // Toggle active class on header
            this.classList.toggle('active');
            
            // Toggle content visibility
            const content = this.nextElementSibling;
            
            // Handle the animation properly
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                // We don't set display: none immediately to allow the animation to complete
                setTimeout(() => {
                    if (!content.classList.contains('active')) {
                        content.style.display = 'none';
                    }
                }, 500); // Match this with the transition duration
            } else {
                // Ensure it's display: block before animating
                content.style.display = 'block';
                // Use timeout to ensure the display change takes effect
                setTimeout(() => {
                    content.classList.add('active');
                }, 10);
            }
        });
        
        // Open the first section by default
        if (header === sectionHeaders[0]) {
            // Use a small delay to ensure styles are applied before clicking
            setTimeout(() => header.click(), 50); 
        }
    });
}); 