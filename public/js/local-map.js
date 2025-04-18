/**
 * Local Map JavaScript for Inn Touch
 * Handles the interactive map functionality using Leaflet with OpenStreetMap
 */

document.addEventListener('DOMContentLoaded', function() {
    // Hamburger menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    
    menuToggle.addEventListener('click', function() {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Initialize the map with a loading state
    const mapContainer = document.getElementById('map');
    const locationList = document.querySelector('.location-list');
    
    // Add loading spinner
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';
    loadingSpinner.innerHTML = '<div class="spinner"></div><p>Loading map data...</p>';
    loadingSpinner.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 1000;
        font-family: 'Inter', sans-serif;
        color: #1E40AF;
    `;
    
    const spinner = document.createElement('style');
    spinner.textContent = `
        .spinner {
            width: 40px;
            height: 40px;
            margin: 0 auto 1rem;
            border: 3px solid rgba(59, 130, 246, 0.3);
            border-radius: 50%;
            border-top-color: #3B82F6;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(spinner);
    document.getElementById('map-container').appendChild(loadingSpinner);
    
    // Default coordinates (will be replaced with hotel location from API)
    let hotelLat = 40.7128;
    let hotelLng = -74.0060;
    let hotelName = "Our Hotel";
    
    // Initialize Leaflet map
    const map = L.map('map').setView([hotelLat, hotelLng], 15);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Object to store marker references
    const markers = {};
    
    /**
     * Creates a marker for the hotel location
     * @param {Object} hotel - Hotel location data
     * @returns {Object} Leaflet marker
     */
    function createHotelMarker(hotel) {
        const hotelIcon = L.divIcon({
            className: 'hotel-marker',
            html: '<i class="fas fa-hotel" style="color:#1E40AF; font-size:24px;"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([hotel.lat, hotel.lng], {icon: hotelIcon}).addTo(map);
        marker.bindPopup(`<b>${hotel.name}</b><br>Your Current Location`).openPopup();
        
        return marker;
    }
    
    /**
     * Creates a marker for a partner location
     * @param {Object} location - Partner location data
     * @returns {Object} Leaflet marker
     */
    function createLocationMarker(location) {
        const locationIcon = L.divIcon({
            className: 'location-marker',
            html: `<i class="fas fa-${location.icon}" style="color:#3B82F6; font-size:18px;"></i>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });
        
        const marker = L.marker([location.lat, location.lng], {
            icon: locationIcon,
            alt: location.name,
            type: location.type
        }).addTo(map);
        
        marker.bindPopup(`
            <b>${location.name}</b><br>
            ${location.description}<br>
            <i>${location.distance} from hotel</i>
        `);
        
        return marker;
    }
    
    /**
     * Creates a location card in the list
     * @param {Object} location - Partner location data
     * @param {Object} marker - Leaflet marker for the location
     * @param {number} index - Index for staggered animation
     */
    function createLocationCard(location, marker, index) {
        const locationItem = document.createElement('div');
        locationItem.className = 'card location-card';
        locationItem.dataset.id = location.id;
        locationItem.dataset.type = location.type;
        locationItem.innerHTML = `
            <div class="location-icon">
                <i class="fas fa-${location.icon}"></i>
            </div>
            <div class="location-details">
                <div class="location-name">${location.name}</div>
                <div class="location-info">${location.description} | ${location.distance}</div>
            </div>
        `;
        
        // Add staggered animation delay
        locationItem.style.animationDelay = `${index * 0.1}s`;
        
        // Add hover effect to show marker on map
        locationItem.addEventListener('mouseenter', function() {
            marker.openPopup();
            map.setView([location.lat, location.lng], 16);
        });
        
        // Add click behavior
        locationItem.addEventListener('click', function() {
            // Animate the map pan
            map.flyTo([location.lat, location.lng], 16, {
                duration: 0.5
            });
            marker.openPopup();
            
            // Add active state to card
            document.querySelectorAll('.location-card').forEach(card => {
                card.classList.remove('active');
            });
            locationItem.classList.add('active');
        });
        
        locationList.appendChild(locationItem);
    }
    
    /**
     * Sets up category filtering
     * @param {Object} markers - Object containing all markers
     */
    function setupFiltering(markers) {
        const checkboxes = document.querySelectorAll('.map-category input');
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const category = this.dataset.category;
                const checked = this.checked;
                
                // Update map markers
                Object.values(markers).forEach(item => {
                    if (item.location.type === category) {
                        if (checked) {
                            item.marker.addTo(map);
                        } else {
                            item.marker.remove();
                        }
                    }
                });
                
                // Update list items with animation
                document.querySelectorAll('.location-card').forEach(card => {
                    if (card.dataset.type === category) {
                        if (checked) {
                            card.style.display = 'flex';
                            card.style.animation = 'fadeInUp 0.3s ease forwards';
                        } else {
                            card.style.animation = 'fadeOut 0.3s ease forwards';
                            setTimeout(() => {
                                card.style.display = 'none';
                            }, 300);
                        }
                    }
                });
            });
        });
    }
    
    /**
     * Shows a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, info)
     */
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const toastStyle = document.createElement('style');
        if (!document.querySelector('style.toast-style')) {
            toastStyle.className = 'toast-style';
            toastStyle.textContent = `
                .toast {
                    position: fixed;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    color: white;
                    font-family: 'Inter', sans-serif;
                    font-weight: 500;
                    z-index: 9999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    animation: slideInUp 0.5s ease, fadeOut 0.5s ease 2.5s forwards;
                }
                .toast-success { background-color: #10B981; }
                .toast-error { background-color: #EF4444; }
                .toast-info { background-color: #3B82F6; }
                
                @keyframes slideInUp {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(toastStyle);
        }
        
        document.body.appendChild(toast);
        
        // Remove the toast after animation completes
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    /**
     * Fetches partner data from the API and initializes the map
     */
    async function fetchPartners() {
        try {
            const token = sessionStorage.getItem('guestToken');
            if (!token) {
                console.error('Authentication token not found.');
                // Optionally redirect to login or show a specific error
                window.location.href = '/login.html'; 
                return; // Stop execution if no token
            }

            // Simulate network delay to show loading animation
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const response = await fetch('/guest/api/partners', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                console.error('Authentication failed. Redirecting to login.');
                sessionStorage.removeItem('guestToken'); // Clear invalid token
                window.location.href = '/login.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch partner data');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch partner data');
            }
            
            // Remove loading spinner
            loadingSpinner.remove();
            
            // Set hotel location
            hotelLat = data.hotelLocation.lat;
            hotelLng = data.hotelLocation.lng;
            hotelName = data.hotelLocation.name;
            
            // Update map center
            map.setView([hotelLat, hotelLng], 15);
            
            // Add hotel marker
            const hotelMarker = createHotelMarker(data.hotelLocation);
            
            // Clear existing location list
            locationList.innerHTML = '';
            
            // Add partner markers and cards with staggered animation
            data.partners.forEach((location, index) => {
                const marker = createLocationMarker(location);
                markers[location.id] = {
                    marker,
                    location
                };
                
                createLocationCard(location, marker, index);
            });
            
            // Setup category filtering
            setupFiltering(markers);
            
            // Show success toast
            showToast('Map data loaded successfully', 'success');
            
        } catch (error) {
            console.error('Error loading map data:', error);
            
            // Remove loading spinner
            loadingSpinner.remove();
            
            // Show error message on the map
            mapContainer.innerHTML = `
                <div class="map-error">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #EF4444; margin-bottom: 1rem;"></i>
                    <p>Failed to load map data. Please try again later.</p>
                    <button id="retry-btn" class="map-btn">Try Again</button>
                </div>
            `;
            
            // Add retry button functionality
            document.getElementById('retry-btn').addEventListener('click', function() {
                // Reset map container
                mapContainer.innerHTML = '<div id="map"></div>';
                map.remove();
                
                // Re-initialize map
                const newMap = L.map('map').setView([hotelLat, hotelLng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(newMap);
                
                // Restart fetch process
                document.getElementById('map-container').appendChild(loadingSpinner);
                fetchPartners();
            });
            
            // Use static data as fallback
            useStaticData();
        }
    }
    
    /**
     * Fallback function to use static data if API fails
     */
    function useStaticData() {
        // Remove loading spinner if it exists
        if (document.querySelector('.loading-spinner')) {
            document.querySelector('.loading-spinner').remove();
        }
        
        // This is the same data as in the partners.js file
        const staticHotel = {
            lat: 40.7128,
            lng: -74.0060,
            name: "Inn Touch Hotel"
        };
        
        const staticLocations = [
            {
                id: 1,
                name: "The Italian Bistro",
                type: "restaurant",
                description: "Authentic Italian cuisine",
                distance: "0.3 miles",
                lat: staticHotel.lat + 0.002,
                lng: staticHotel.lng + 0.001,
                icon: "utensils"
            },
            {
                id: 2,
                name: "City Mall",
                type: "shopping",
                description: "Luxury shopping center",
                distance: "0.5 miles",
                lat: staticHotel.lat - 0.001,
                lng: staticHotel.lng + 0.003,
                icon: "shopping-bag"
            },
            {
                id: 3,
                name: "Museum of Modern Art",
                type: "attraction",
                description: "World-class art collection",
                distance: "0.7 miles",
                lat: staticHotel.lat + 0.003,
                lng: staticHotel.lng - 0.002,
                icon: "landmark"
            },
            {
                id: 4,
                name: "Sushi Express",
                type: "restaurant",
                description: "Fresh Japanese cuisine",
                distance: "0.4 miles",
                lat: staticHotel.lat - 0.002,
                lng: staticHotel.lng - 0.001,
                icon: "utensils"
            },
            {
                id: 5,
                name: "Central Park",
                type: "attraction",
                description: "Beautiful city park",
                distance: "0.6 miles",
                lat: staticHotel.lat + 0.001,
                lng: staticHotel.lng - 0.003,
                icon: "tree"
            },
            {
                id: 6,
                name: "Fashion Boutique",
                type: "shopping",
                description: "Designer clothing store",
                distance: "0.3 miles",
                lat: staticHotel.lat - 0.003,
                lng: staticHotel.lng + 0.001,
                icon: "tshirt"
            }
        ];
        
        // Update map center
        map.setView([staticHotel.lat, staticHotel.lng], 15);
        
        // Add hotel marker
        const hotelMarker = createHotelMarker(staticHotel);
        
        // Clear existing location list
        locationList.innerHTML = '';
        
        // Add partner markers and cards with staggered animation
        staticLocations.forEach((location, index) => {
            const marker = createLocationMarker(location);
            markers[location.id] = {
                marker,
                location
            };
            
            createLocationCard(location, marker, index);
        });
        
        // Setup category filtering
        setupFiltering(markers);
        
        // Show info toast
        showToast('Using offline map data', 'info');
    }
    
    // Initialize the map
    fetchPartners();
}); 