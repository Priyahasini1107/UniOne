/**
 * config/db.js — MySQL Database Connection Pool
 *
 * Creates a MySQL2 connection pool using credentials from environment variables.
 * A pool keeps several connections open so the server can handle multiple
 * database requests at the same time without the overhead of opening a
 * new connection for every query.
 *
 * USAGE in a route file:
 *   const pool = require('../config/db');
 *   const [rows] = await pool.query('SELECT * FROM users');
 *
 * NOTE:
 *   The pool connects lazily — it does NOT try to connect when this file is
 *   imported. The actual connection is only made when pool.query() is first
 *   called (for example, in the /api/db-health route).
 *   This means the server can start even if MySQL is not yet configured.
 */

const mysql = require('mysql2');

// Build the pool using values from the .env file.
// All DB_* variables must be set in server/.env before the connection will work.
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,       // Required — no default
  password: process.env.DB_PASSWORD,   // Required — no default
  database: process.env.DB_NAME,       // Required — no default

  // Connection pool settings
  waitForConnections: true,   // Queue requests when all connections are in use
  connectionLimit:    10,     // Maximum number of simultaneous connections
  queueLimit:         0,      // 0 = unlimited queue length
});

// Export the pool with Promise support so routes can use async/await
module.exports = pool.promise();
