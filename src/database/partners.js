/**
 * Partners database module for Inn Touch
 * Manages nearby locations data for the Local Map feature
 */

const db = require('./db');

/**
 * Get all nearby partner locations
 * @returns {Promise<Array>} Array of partner location objects
 */
const getAllPartners = async () => {
  try {
    // In a real implementation, this would be fetched from the database
    // For now, returning static data as per project requirements
    
    // Get hotel location (in a real implementation, this would be stored in the database)
    const hotelLat = 40.7128;
    const hotelLng = -74.0060;
    
    return [
      {
        id: 1,
        name: "The Italian Bistro",
        type: "restaurant",
        description: "Authentic Italian cuisine",
        distance: "0.3 miles",
        lat: hotelLat + 0.002,
        lng: hotelLng + 0.001,
        icon: "utensils"
      },
      {
        id: 2,
        name: "City Mall",
        type: "shopping",
        description: "Luxury shopping center",
        distance: "0.5 miles",
        lat: hotelLat - 0.001,
        lng: hotelLng + 0.003,
        icon: "shopping-bag"
      },
      {
        id: 3,
        name: "Museum of Modern Art",
        type: "attraction",
        description: "World-class art collection",
        distance: "0.7 miles",
        lat: hotelLat + 0.003,
        lng: hotelLng - 0.002,
        icon: "landmark"
      },
      {
        id: 4,
        name: "Sushi Express",
        type: "restaurant",
        description: "Fresh Japanese cuisine",
        distance: "0.4 miles",
        lat: hotelLat - 0.002,
        lng: hotelLng - 0.001,
        icon: "utensils"
      },
      {
        id: 5,
        name: "Central Park",
        type: "attraction",
        description: "Beautiful city park",
        distance: "0.6 miles",
        lat: hotelLat + 0.001,
        lng: hotelLng - 0.003,
        icon: "tree"
      },
      {
        id: 6,
        name: "Fashion Boutique",
        type: "shopping",
        description: "Designer clothing store",
        distance: "0.3 miles",
        lat: hotelLat - 0.003,
        lng: hotelLng + 0.001,
        icon: "tshirt"
      },
      {
        id: 7,
        name: "Local Brewery",
        type: "restaurant",
        description: "Craft beers and pub food",
        distance: "0.5 miles",
        lat: hotelLat + 0.0025,
        lng: hotelLng + 0.0025,
        icon: "beer-mug-empty"
      },
      {
        id: 8,
        name: "Historic Theater",
        type: "attraction",
        description: "Classic plays and performances",
        distance: "0.8 miles",
        lat: hotelLat - 0.0035,
        lng: hotelLng + 0.002,
        icon: "masks-theater"
      }
    ];
  } catch (error) {
    console.error('Error getting partners:', error);
    throw new Error('Failed to get partners');
  }
};

/**
 * Get the hotel location (fixed for now)
 * @returns {Object} Hotel location with latitude and longitude
 */
const getHotelLocation = async () => {
  try {
    // In a real implementation, this would be fetched from the database
    return {
      lat: 40.7128,
      lng: -74.0060,
      name: "Inn Touch Hotel"
    };
  } catch (error) {
    console.error('Error getting hotel location:', error);
    throw new Error('Failed to get hotel location');
  }
};

module.exports = {
  getAllPartners,
  getHotelLocation
}; 