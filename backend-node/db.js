const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || '';

const connectionOptions = {
  connectionString,
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS) || 5000,
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
};

// Enable SSL in production or when explicitly requested via sslmode in the URL
if (process.env.NODE_ENV === 'production' || /[?&]sslmode=(require|verify-full|verify-ca)/.test(connectionString)) {
  connectionOptions.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(connectionOptions);

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err && err.stack ? err.stack : err);
});

module.exports = pool;