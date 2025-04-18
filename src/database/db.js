/**
 * Database connection module for Inn Touch
 * Handles PostgreSQL database connection and initialization using pg.Pool
 */

const { Pool } = require('pg');
const schema = require('./schema');

// Global database connection pool
let pool = null;

/**
 * Create a new database connection pool
 * Uses DATABASE_URL environment variable for connection string
 * Configures SSL for Heroku compatibility
 * @returns {pg.Pool} The database connection pool
 */
function createPool() {
  if (pool) {
    return pool;
  }

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.log('Ensure you have a PostgreSQL database (e.g., Heroku Postgres) and DATABASE_URL is configured.');
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  // Configuration for Heroku Postgres (requires SSL)
  // For local development without SSL, you might need to adjust this or set DATABASE_URL accordingly
  const isProduction = process.env.NODE_ENV === 'production';
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false, // Required for Heroku Postgres
  });

  pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database via pool.');
  });

  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    // Optionally, try to reconnect or handle the error
    // For simplicity, we'll just log it here
  });

  return pool;
}

/**
 * Get a database connection pool
 * Creates a new pool if one doesn't exist
 * @returns {pg.Pool} The database connection pool
 */
function getPool() {
  return pool || createPool();
}

/**
 * Execute a SQL query with optional parameters using the pool
 * Handles acquiring and releasing a client from the pool
 * @param {string} sql - The SQL query to run (use $1, $2... for parameters)
 * @param {Array} params - The parameters to use in the query
 * @returns {Promise<QueryResult>} A promise that resolves with the query result (rows, rowCount, etc.)
 */
async function query(sql, params = []) {
  const pool = getPool();
  let client = null; // Declare client outside try block
  try {
    client = await pool.connect();
    const result = await client.query(sql, params);
    return result;
  } catch (err) {
    console.error('Error executing SQL:', sql);
    console.error('Parameters:', params);
    console.error('Error details:', err.message);
    throw err; // Re-throw the error to be caught by the caller
  } finally {
    if (client) {
        client.release(); // Ensure client is always released
    }
  }
}

/**
 * Convenience function to run a SQL statement (INSERT, UPDATE, DELETE)
 * Returns the number of affected rows
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<number>} Number of rows affected
 */
async function run(sql, params = []) {
  const result = await query(sql, params);
  return result.rowCount;
}

/**
 * Convenience function to get a single row
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<object | undefined>} The first row found or undefined
 */
async function get(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0];
}

/**
 * Convenience function to get all rows
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array<object>>} An array of rows
 */
async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Initialize the database
 * Creates tables if they don't exist using the defined schema
 * @returns {Promise<boolean>} A promise that resolves with true when the database is initialized
 */
async function initDatabase() {
  console.log('Initializing PostgreSQL database schema...');
  const pool = getPool();
  let client = null; 

  try {
    client = await pool.connect();
    console.log('Executing schema statements...');
    // Execute each schema statement sequentially within a transaction
    await client.query('BEGIN');
    for (const statement of schema) {
      console.log(`Executing: ${statement.substring(0, 100)}...`); // Log snippet
      await client.query(statement);
    }
    await client.query('COMMIT');
    console.log('Database schema initialized successfully');
    return true;
  } catch (err) {
    console.error('Error initializing database schema:', err.message);
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.log('Transaction rolled back due to error.');
      } catch (rollbackErr) {
        console.error('Error rolling back transaction:', rollbackErr.message);
      }
    }
    throw err; // Re-throw the error to be handled by the main server start logic
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Close the database connection pool
 * @returns {Promise} A promise that resolves when the pool is closed
 */
async function closeDatabase() {
  if (pool) {
    console.log('Closing PostgreSQL connection pool...');
    await pool.end();
    pool = null;
    console.log('PostgreSQL connection pool closed.');
  }
}

/**
 * Run a transaction with the provided callback
 * Provides a client object to the callback for running queries within the transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 * @param {Function} callback - Async function receiving the transaction client: async (client) => { ... }
 * @returns {Promise} A promise that resolves with the result of the callback
 */
async function transaction(callback) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Provide the client to the callback. The callback should use client.query
    const result = await callback(client); 
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction failed, rolled back.', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getPool,
  query, // Export the base query function
  run,   // Export convenience function
  get,   // Export convenience function
  all,   // Export convenience function
  initDatabase,
  closeDatabase,
  transaction
}; 