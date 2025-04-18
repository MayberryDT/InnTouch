/**
 * Database module for Inn Touch
 * Centralizes all database operations
 */

const guestFunctions = require('./guests');
const bookingFunctions = require('../../database/booking');
const feedbackFunctions = require('../../database/feedback');
const partnerFunctions = require('../../database/partners');

// Add stubs for functions mentioned in staff routes but not implemented yet
const getAllEscalatedChats = async () => {
  return [];
};

const getRecentRoomServiceOrders = async () => {
  return [];
};

const getRecentBookings = async () => {
  return [];
};

module.exports = {
  // Re-export all functions from guests.js
  ...guestFunctions,
  
  // Include booking functions
  ...bookingFunctions,
  
  // Include feedback functions
  ...feedbackFunctions,
  
  // Include partners functions
  ...partnerFunctions,
  
  // Include chat functions that will be implemented later
  getAllEscalatedChats,
  
  // Include order functions that will be implemented later
  getRecentRoomServiceOrders,
  
  // Include booking functions that will be implemented later
  getRecentBookings
}; 