/**
 * server.js — UniOne Express Server Entry Point
 *
 * This file starts the Express server and registers all API routes.
 *
 * HOW TO RUN:
 *   Copy server/.env.example to server/.env, fill in your MySQL credentials,
 *   then run:
 *     node --env-file=.env server.js
 *   or use the npm scripts:
 *     npm start   (production)
 *     npm run dev (auto-restart on file changes, Node.js v18.11+)
 */

require('dotenv').config();
const express = require('express');
const healthRoutes       = require('./routes/health');
const authRoutes         = require('./routes/auth');
const facultyRoutes      = require('./routes/faculty');
const studentRoutes      = require('./routes/student');
const resourceRoutes     = require('./routes/resources');
const interviewRoutes    = require('./routes/interview');
const opportunityRoutes  = require('./routes/opportunities');
const eventsRoutes       = require('./routes/events');
const roadmapsRoutes     = require('./routes/roadmaps');
const findbackRoutes     = require('./routes/findback');
const projectsRoutes     = require('./routes/projects');
const campusRoutes       = require('./routes/campus');
const communityRoutes    = require('./routes/community');
const portfolioRoutes    = require('./routes/portfolio');
const notifRoutes        = require('./routes/notifications');
const searchRoutes       = require('./routes/search');
const contentRoutes      = require('./routes/content');

const app = express();
const PORT = process.env.PORT || 5000;
console.log('Server file:', __filename);
console.log('Database name:', process.env.DB_NAME);
console.log('Database user:', process.env.DB_USER);

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(express.json({ limit: '7mb' }));
app.use((req, res, next) => {
  console.log('INCOMING REQUEST:', req.method, req.originalUrl);
  next();
});
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use((req, res, next) => { console.log('REQUEST:', req.method, req.originalUrl); next(); });

app.use('/api',                  healthRoutes);
app.use('/api/auth',             authRoutes);
app.use('/api/faculty',          facultyRoutes);
app.use('/api/content',          contentRoutes);
app.use('/api/student',          studentRoutes);
app.use('/api/resources',        resourceRoutes);
app.use('/api/interview-prep',   interviewRoutes);
app.use('/api/opportunities',    opportunityRoutes);
app.use('/api/events',           eventsRoutes);
app.use('/api/roadmaps',         roadmapsRoutes);
app.use('/api/findback',         findbackRoutes);
app.use('/api/projects',         projectsRoutes);
app.use('/api/campus-services',  campusRoutes);
app.use('/api/community',        communityRoutes);
app.use('/api/portfolio',        portfolioRoutes);
app.use('/api/notifications',    notifRoutes);
app.use('/api/search',           searchRoutes);
console.log(
  'Loaded auth routes:',
  authRoutes.stack
    .filter(route => route.route)
    .map(route => Object.keys(route.route.methods).join(',').toUpperCase() + ' ' + route.route.path)
);

app.get('/api/auth/route-check', (req, res) => {
    res.json({
        success: true,
        message: 'Auth route-check is working'
    });
});

// ─── 404 — Route Not Found ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── 500 — Global Error Handler ─────────────────────────────────────────────
// This catches any unhandled errors thrown inside route handlers
app.use((err, req, res, next) => {
  console.error('[UniOne Error]', err.message);
  const status = err.status === 413 ? 413 : 500;
  res.status(status).json({
    success: false,
    message: status === 413 ? 'Request body exceeds the allowed size.' : 'Internal server error',
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ UniOne server is running`);
  console.log(`   URL:       http://localhost:${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/api/health`);
  console.log(`   DB check:  http://localhost:${PORT}/api/db-health\n`);
});
