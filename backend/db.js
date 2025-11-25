const { Pool } = require('pg');          // PostgreSQL client
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });  // Load .env from backend dir

// Read DATABASE_URL if present
const connectionString = process.env.DATABASE_URL ? String(process.env.DATABASE_URL) : '';
if (!connectionString) {
  console.error('WARNING: DATABASE_URL is not set in environment variables; database operations will fail.');
}

let pool = null;
if (connectionString) {
  pool = new Pool({
    connectionString: connectionString,
    // ssl: { rejectUnauthorized: false } // Uncomment if using cloud DB
  });

  // Log pool errors but do not exit the entire process on transient DB errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    // don't call process.exit here to keep server running for debugging
  });
}

module.exports = {
  query: (text, params) => {
    if (!pool) return Promise.reject(new Error('No database connection: DATABASE_URL not set'));
    return pool.query(text, params);
  },
  pool
};
