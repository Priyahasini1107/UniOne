/**
 * routes/events.js — Events Calendar API
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const sid = req.student.id;
    const { filter, event_type, q } = req.query; // filter: 'upcoming'|'past'|'all'
    let sql = `
      SELECT e.*, u.full_name AS posted_by_name,
             CASE WHEN ei.id IS NOT NULL THEN 1 ELSE 0 END AS is_interested
      FROM events e
      JOIN users u ON e.posted_by = u.id
      LEFT JOIN event_interests ei ON ei.event_id=e.id AND ei.student_id=?
      WHERE 1=1`;
    const params = [sid];
    if (filter === 'upcoming') { sql += ' AND e.event_date > NOW()'; }
    if (filter === 'past')     { sql += ' AND e.event_date <= NOW()'; }
    if (event_type)            { sql += ' AND e.event_type = ?'; params.push(event_type); }
    if (q)                     { sql += ' AND (e.title LIKE ? OR e.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    sql += ' ORDER BY e.event_date ASC LIMIT 100';
    const [events] = await pool.execute(sql, params);
    res.json({ success: true, events });
  } catch (err) {
    console.error('[events GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load events.' });
  }
});

// POST /api/events/:id/interest — toggle interest
router.post('/:id/interest', async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const sid     = req.student.id;
    if (!isInt(eventId)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [existing] = await pool.execute(
      'SELECT id FROM event_interests WHERE student_id=? AND event_id=?', [sid, eventId]
    );
    if (existing.length > 0) {
      await pool.execute('DELETE FROM event_interests WHERE student_id=? AND event_id=?', [sid, eventId]);
      return res.json({ success: true, interested: false, message: 'Interest removed.' });
    }
    await pool.execute('INSERT INTO event_interests (student_id, event_id) VALUES (?,?)', [sid, eventId]);
    res.json({ success: true, interested: true, message: 'Marked as interested.' });
  } catch (err) {
    console.error('[events/interest]', err.message);
    res.status(500).json({ success: false, message: 'Could not update interest.' });
  }
});

module.exports = router;
