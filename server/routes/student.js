/**
 * routes/student.js — Shared Student Middleware + Dashboard Summary
 *
 * Exports:
 *   requireStudent(req, res, next) — verifies session, active status, student role
 *   router — mounts GET /api/student/dashboard
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { getAuthenticatedUser } = require('./auth');

// ─── Shared middleware ────────────────────────────────────────────────────────

async function requireStudent(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    if (user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'This area is for students only.' });
    }
    // getAuthenticatedUser returns MySQL columns (account_status), not publicUser camelCase.
    if (user.account_status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is not active.' });
    }
    req.student = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      accountStatus: user.account_status,
    };
    next();
  } catch (err) {
    console.error('[Student Auth]', err.message);
    res.status(500).json({ success: false, message: 'Session verification failed.' });
  }
}

router.use(requireStudent);

// GET /api/student/settings — own account and editable profile fields
router.get('/settings', async (req, res) => {
  try {
    const [[user]] = await pool.execute(
      `SELECT u.full_name, u.email, u.role, u.account_status,
              sp.department, sp.study_year, sp.phone, sp.bio
       FROM users u LEFT JOIN student_profiles sp ON sp.user_id=u.id
       WHERE u.id=? LIMIT 1`,
      [req.student.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });
    res.json({ success: true, settings: user });
  } catch (err) {
    console.error('[student/settings GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load settings.' });
  }
});

// PUT /api/student/settings — update only name and fields supported by student_profiles
router.put('/settings', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, message: 'Enter valid profile details.' });
    }
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters.' });
    }
    const textFields = [
      ['department', 100], ['phone', 20], ['bio', 1000],
    ];
    const values = {};
    for (const [field, maxLength] of textFields) {
      const value = body[field] == null ? '' : body[field];
      if (typeof value !== 'string' || value.trim().length > maxLength) {
        return res.status(400).json({ success: false, message: `${field} must be text with at most ${maxLength} characters.` });
      }
      values[field] = value.trim() || null;
    }
    const yearText = body.study_year == null ? '' : String(body.study_year).trim();
    if (yearText && (!/^\d+$/.test(yearText) || Number(yearText) < 1 || Number(yearText) > 8)) {
      return res.status(400).json({ success: false, message: 'Study year must be a number from 1 to 8.' });
    }
    const studyYear = yearText ? Number(yearText) : null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE users SET full_name=? WHERE id=? AND role=\'student\'', [fullName, req.student.id]);
      const [profiles] = await connection.execute('SELECT id FROM student_profiles WHERE user_id=? LIMIT 1', [req.student.id]);
      if (profiles.length) {
        await connection.execute(
          'UPDATE student_profiles SET department=?, study_year=?, phone=?, bio=? WHERE user_id=?',
          [values.department, studyYear, values.phone, values.bio, req.student.id]
        );
      } else {
        await connection.execute(
          'INSERT INTO student_profiles (user_id, department, study_year, phone, bio) VALUES (?,?,?,?,?)',
          [req.student.id, values.department, studyYear, values.phone, values.bio]
        );
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    res.json({ success: true, message: 'Profile updated.', user: { fullName } });
  } catch (err) {
    console.error('[student/settings PUT]', err.message);
    res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
});

// GET /api/student/dashboard — real stats for welcome widgets
router.get('/dashboard', async (req, res) => {
  try {
    const sid = req.student.id;
    const [[summary]] = await pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM resources)                                               AS total_resources,
         (SELECT COUNT(*) FROM events    WHERE event_date > NOW())                     AS upcoming_events,
         (SELECT COUNT(*) FROM opportunities WHERE deadline IS NULL OR deadline >= CURDATE()) AS active_opportunities,
         (SELECT COUNT(*) FROM saved_opportunities WHERE student_id=?)                AS saved_opportunities,
         (SELECT COUNT(*) FROM opportunity_applications WHERE student_id=?)           AS my_applications,
         (SELECT COUNT(*) FROM notifications WHERE student_id=? AND is_read=0)        AS unread_notifications,
         (SELECT COUNT(*) FROM student_projects WHERE student_id=?)                   AS my_projects,
         (SELECT COUNT(*) FROM campus_requests  WHERE student_id=?)                   AS my_requests`,
      [sid, sid, sid, sid, sid]
    );

    // Recent notifications (last 5)
    const [notifications] = await pool.execute(
      `SELECT id, type, title, message, module, is_read, created_at
       FROM notifications WHERE student_id=? ORDER BY created_at DESC LIMIT 5`,
      [sid]
    );

    // Upcoming events (next 3)
    const [upcomingEvents] = await pool.execute(
      `SELECT id, title, event_type, event_date, venue, is_online
       FROM events WHERE event_date > NOW() ORDER BY event_date ASC LIMIT 3`
    );

    // Upcoming deadlines (opportunities with deadline in next 30 days)
    const [deadlines] = await pool.execute(
      `SELECT id, type, title, company_or_org, deadline FROM opportunities
       WHERE deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY deadline ASC LIMIT 5`
    );

    // Recent resources
    const [recentResources] = await pool.execute(
      `SELECT id, title, resource_type, subject, department, created_at
       FROM resources ORDER BY created_at DESC LIMIT 4`
    );

    res.json({
      success: true,
      summary,
      notifications,
      upcomingEvents,
      deadlines,
      recentResources,
    });
  } catch (err) {
    console.error('[student/dashboard]', err.message);
    res.status(500).json({ success: false, message: 'Could not load dashboard.' });
  }
});

module.exports = router;
module.exports.requireStudent = requireStudent;
