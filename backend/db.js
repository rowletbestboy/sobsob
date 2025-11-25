const { Pool } = require('pg');          // PostgreSQL client
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });  // Load .env from backend dir

// Build connection string from DATABASE_URL or from DB_* env vars
let connectionString = '';
if (process.env.DATABASE_URL) {
  connectionString = String(process.env.DATABASE_URL);
} else if (process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_HOST && process.env.DB_DATABASE) {
  const user = encodeURIComponent(process.env.DB_USER);
  const pass = encodeURIComponent(process.env.DB_PASSWORD);
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const db = process.env.DB_DATABASE;
  const sslMode = (process.env.DB_SSL || '').toString().toLowerCase();
  const sslQuery = sslMode === 'true' || sslMode === 'require' ? '?sslmode=require' : '';
  connectionString = `postgres://${user}:${pass}@${host}:${port}/${db}${sslQuery}`;
} else {
  console.error('WARNING: No database configuration found (DATABASE_URL or DB_* vars). Database operations will fail.');
}

let pool = null;
if (connectionString) {
  const useSsl = connectionString.includes('sslmode=require') || (process.env.DB_SSL && process.env.DB_SSL.toString().toLowerCase() === 'true');
  const poolConfig = { connectionString };
  if (useSsl) {
    // When connecting to managed Postgres (Render, Heroku) require SSL but allow self-signed
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  pool = new Pool(poolConfig);

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
