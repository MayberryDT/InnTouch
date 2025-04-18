/**
 * Database connection module for Inn Touch
 * Handles SQLite database connection and initialization
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const schema = require('./schema');

// Database file path
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../', 'hospitality.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Global database connection
let dbInstance = null;

/**
 * Create a new database connection
 * @returns {sqlite3.Database} The database connection
 */
function createConnection() {
  if (dbInstance) {
    return dbInstance;
  }
  
  dbInstance = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to SQLite database:', err.message);
      throw err;
    }
    console.log('Connected to the SQLite database:', dbPath);
  });
  
  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON');
  
  return dbInstance;
}

/**
 * Get a database connection
 * Creates a new connection if one doesn't exist
 * @returns {sqlite3.Database} The database connection
 */
function getConnection() {
  return dbInstance || createConnection();
}

/**
 * Run a SQL query with optional parameters
 * @param {string} sql - The SQL query to run
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise} A promise that resolves with the result
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getConnection();
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error running SQL:', sql);
        console.error('Error details:', err.message);
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Get a single row from a SQL query
 * @param {string} sql - The SQL query to run
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise} A promise that resolves with the row
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getConnection();
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Error executing SQL:', sql);
        console.error('Error details:', err.message);
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * Get all rows from a SQL query
 * @param {string} sql - The SQL query to run
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise} A promise that resolves with the rows
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getConnection();
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error executing SQL:', sql);
        console.error('Error details:', err.message);
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Initialize the database
 * Creates tables if they don't exist using the defined schema
 * @returns {Promise} A promise that resolves when the database is initialized
 */
async function initDatabase() {
  console.log('Initializing database...');
  
  try {
    // Get connection and enable foreign keys
    const db = getConnection();
    
    // Execute each schema statement in sequence
    for (const statement of schema) {
      await new Promise((resolve, reject) => {
        db.run(statement, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
    
    console.log('Database schema initialized successfully');
    return true;
  } catch (err) {
    console.error('Error initializing database schema:', err.message);
    throw err;
  }
}

/**
 * Close the database connection
 * @returns {Promise} A promise that resolves when the connection is closed
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      dbInstance.close(err => {
        if (err) {
          reject(err);
          return;
        }
        dbInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Run a transaction with the provided callback
 * @param {Function} callback - The callback function that receives a transaction object
 * @returns {Promise} A promise that resolves with the result of the callback
 */
function transaction(callback) {
  return new Promise((resolve, reject) => {
    const db = getConnection();
    
    // Start a transaction
    db.run('BEGIN TRANSACTION', async (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        // Create transaction wrapper object with customized run, get, all methods
        // that use the same db connection
        const trx = {
          run: (sql, params = []) => {
            return new Promise((resolve, reject) => {
              db.run(sql, params, function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve({ lastID: this.lastID, changes: this.changes });
              });
            });
          },
          get: (sql, params = []) => {
            return new Promise((resolve, reject) => {
              db.get(sql, params, (err, row) => {
                if (err) {
                  reject(err);
                  return;
                }
                resolve(row);
              });
            });
          },
          all: (sql, params = []) => {
            return new Promise((resolve, reject) => {
              db.all(sql, params, (err, rows) => {
                if (err) {
                  reject(err);
                  return;
                }
                resolve(rows);
              });
            });
          }
        };
        
        // Call the callback with the transaction object
        const result = await callback(trx);
        
        // Commit the transaction
        db.run('COMMIT', (err) => {
          if (err) {
            // Try to rollback on commit error
            db.run('ROLLBACK', () => reject(err));
            return;
          }
          
          // Resolve with the result
          resolve(result);
        });
      } catch (err) {
        // Rollback the transaction on error
        db.run('ROLLBACK', (rollbackErr) => {
          // If there was an error rolling back, log it
          if (rollbackErr) {
            console.error('Error rolling back transaction:', rollbackErr.message);
          }
          
          // Always reject with the original error
          reject(err);
        });
      }
    });
  });
}

module.exports = {
  initDatabase,
  closeDatabase,
  run,
  get,
  all,
  transaction
}; 