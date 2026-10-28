/**
 * routes/health.js — Health Check Routes
 *
 * Two endpoints to verify the server and database are working:
 *
 *   GET /api/health     — Confirms the Express server is running (no DB needed)
 *   GET /api/db-health  — Attempts a real MySQL connection and reports the result
 *
 * These are useful during setup to confirm that each layer is working before
 * building further features.
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// ─── GET /api/health ─────────────────────────────────────────────────────────
// Simple ping — confirms Express is up and responding. No database involved.
router.get('/health', (req, res) => {
  res.json({
    success:   true,
    status:    'ok',
    message:   'UniOne server is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── GET /api/db-health ──────────────────────────────────────────────────────
// Runs a lightweight query (SELECT 1) to test the actual MySQL connection.
// Returns a clear success or failure message so you know exactly what to fix.
router.get('/db-health', async (req, res) => {
  try {
    // SELECT 1 is the lightest possible query — just confirms the connection works
    const [rows] = await pool.query(
  'SELECT DATABASE() AS db, CURRENT_USER() AS db_user'
);
console.log('UNIONE UPDATED DB ROUTE IS RUNNING');
console.log('[DB health check]', rows);
    res.json({
      success:  true,
      status:   'connected',
      message:  'MySQL database connection is working',
      database: process.env.DB_NAME || '(DB_NAME not set)',
	host: process.env.DB_HOST || 'localhost',
    });
  } catch (error) {
    // Return a 503 (Service Unavailable) with a helpful error message
    res.status(503).json({
      success: false,
      status:  'error',
      message: 'MySQL database connection failed',
      error:   error.message,
      hint:    [
        'Make sure server/.env exists and contains correct values for:',
        'DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME',
        'Also confirm that MySQL is running and the database exists.',
      ],
    });
  }
});

module.exports = router;
