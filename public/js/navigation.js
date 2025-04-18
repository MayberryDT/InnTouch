/**
 * Navigation functionality for Inn Touch
 * Manages mobile menu toggle and other navigation features
 */

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle with more robust selector
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    
    if (menuToggle && navLinks) {
        // Apply animation index to each navigation link
        const links = navLinks.querySelectorAll('a');
        links.forEach((link, index) => {
            link.style.setProperty('--item-index', index);
        });
        
        // Force the menu toggle to be visible on mobile
        const checkMobile = function() {
            if (window.innerWidth <= 768) {
                menuToggle.style.display = 'flex';
            } else {
                menuToggle.style.display = 'none';
            }
        };
        
        // Run on load and resize
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        // Handle toggle click
        menuToggle.addEventListener('click', function() {
            console.log('Menu toggle clicked');
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    } else {
        console.error('Menu toggle or nav links not found!');
    }
    
    // Handle active navigation item
    const currentPage = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-links a');
    
    navItems.forEach(item => {
        // Check if the href attribute matches the current page
        if (item.getAttribute('href') === currentPage || 
            (currentPage.endsWith(item.getAttribute('href')) && item.getAttribute('href') !== '/')) {
            item.classList.add('active');
        } else if (currentPage === '/' && item.getAttribute('href') === '/') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Add guest ID to navigation links and current URL if available
    function addGuestIdToLinks() {
        const storedGuestId = sessionStorage.getItem('guestId');

        // Only proceed if we have a guest ID and it's not already in the URL
        if (storedGuestId && !window.location.search.includes('guestId=') && 
            !window.location.pathname.includes('/staff')) {
            
            // Update navigation links
            const links = document.querySelectorAll('.nav-links a');
            links.forEach(link => {
                // Only modify links to pages within our app
                if (link.href.startsWith(window.location.origin) && !link.href.includes('guestId=')) {
                    const separator = link.href.includes('?') ? '&' : '?';
                    link.href = `${link.href}${separator}guestId=${storedGuestId}`;
                }
            });

            // Update current URL without reloading if needed
            if (window.location.pathname !== '/staff-login.html' &&
                window.location.pathname !== '/staff-dashboard.html' &&
                window.location.pathname !== '/guest-login.html') {
                const newUrl = `${window.location.pathname}?guestId=${storedGuestId}${window.location.hash}`;
                console.log(`Updating URL to include guestId: ${newUrl}`); // Added log for clarity
                window.history.replaceState({}, document.title, newUrl);
            } else {
                console.log('Not updating URL on staff/login pages.');
            }
        } else {
            console.log('Guest ID not found in sessionStorage or already present in URL, skipping URL update.');
        }
    }
    
    // Call the function to add guest ID
    addGuestIdToLinks();
    
    // Handle logout functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear JWT from sessionStorage
            sessionStorage.removeItem('jwt');
            
            // Clear any other guest-related data
            sessionStorage.removeItem('guestId');
            sessionStorage.removeItem('guestName');
            sessionStorage.removeItem('roomNumber');
            
            // Redirect to login page
            window.location.href = '/login.html';
            
            console.log('User logged out successfully');
        });
    }
}); 