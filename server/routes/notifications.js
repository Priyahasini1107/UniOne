/**
 * routes/notifications.js — Student Notifications API
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const [notifications] = await pool.execute(
      `SELECT id, type, title, message, module, is_read, created_at
       FROM notifications WHERE student_id=? ORDER BY created_at DESC LIMIT 50`,
      [req.student.id]
    );
    const [[{unread}]] = await pool.execute(
      'SELECT COUNT(*) AS unread FROM notifications WHERE student_id=? AND is_read=0',
      [req.student.id]
    );
    res.json({ success: true, notifications, unread });
  } catch (err) {
    console.error('[notifications GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load notifications.' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const sid = req.student.id;
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await pool.execute(
      'UPDATE notifications SET is_read=1 WHERE id=? AND student_id=?', [id, sid]
    );
    res.json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    console.error('[notifications PATCH]', err.message);
    res.status(500).json({ success: false, message: 'Could not update notification.' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read=1 WHERE student_id=?', [req.student.id]
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('[notifications/read-all]', err.message);
    res.status(500).json({ success: false, message: 'Could not update notifications.' });
  }
});

module.exports = router;
