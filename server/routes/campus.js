/**
 * routes/campus.js — Smart Campus Services API
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');
const { getAuthenticatedUser } = require('./auth');

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }
const VALID_CATS = ['maintenance','cleanliness','facilities','it_support','safety','other'];

async function requireAdmin(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' });
  if (user.role !== 'admin' || user.account_status !== 'active') return res.status(403).json({ success: false, message: 'Active admin account required.' });
  req.admin = user;
  next();
}

// Campus service triage is limited to active admins. The schema has no reviewer assignment field.
router.get('/manage', requireAdmin, async (req, res) => {
  try {
    const [requests] = await pool.execute(`SELECT c.*, u.full_name AS student_name,
      CASE WHEN c.description LIKE '[DEMO:UNIONE-CAMPUS]%' THEN 1 ELSE 0 END AS is_demo
      FROM campus_requests c JOIN users u ON c.student_id=u.id ORDER BY c.created_at DESC LIMIT 200`);
    res.json({ success: true, requests });
  } catch (err) {
    console.error('[campus/manage GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load service queue.' });
  }
});

router.patch('/manage/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, admin_note } = req.body || {};
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    if (!['submitted','in_progress','resolved','rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid request status.' });
    if (admin_note !== undefined && (typeof admin_note !== 'string' || admin_note.length > 5000)) return res.status(400).json({ success: false, message: 'Admin note must be 5,000 characters or fewer.' });
    const [result] = admin_note === undefined
      ? await pool.execute('UPDATE campus_requests SET status=? WHERE id=?', [status, id])
      : await pool.execute('UPDATE campus_requests SET status=?, admin_note=? WHERE id=?', [status, admin_note.trim() || null, id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Request not found.' });
    res.json({ success: true, message: 'Campus request updated.' });
  } catch (err) {
    console.error('[campus/manage PATCH]', err.message);
    res.status(500).json({ success: false, message: 'Could not update service request.' });
  }
});

router.use(requireStudent);

// GET /api/campus-services — student's own requests
router.get('/', async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT *, CASE WHEN description LIKE '[DEMO:UNIONE-CAMPUS]%' THEN 1 ELSE 0 END AS is_demo
       FROM campus_requests WHERE student_id=? OR description LIKE '[DEMO:UNIONE-CAMPUS]%'
       ORDER BY created_at DESC`,
      [req.student.id]
    );
    res.json({ success: true, requests });
  } catch (err) {
    console.error('[campus GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load requests.' });
  }
});

// POST /api/campus-services — submit a new service request
router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ success: false, message: 'Enter request details.' });
    const { category, description, location } = req.body;
    if (!VALID_CATS.includes(category)) return res.status(400).json({ success: false, message: 'Choose a valid category.' });
    if (typeof description !== 'string' || !description.trim()) return res.status(400).json({ success: false, message: 'Description is required.' });
    if (description.length > 10000 || (location != null && (typeof location !== 'string' || location.length > 200))) return res.status(400).json({ success: false, message: 'One or more fields exceed the allowed length or have the wrong type.' });
    const cat = category;
    const [result] = await pool.execute(
      'INSERT INTO campus_requests (student_id, category, description, location) VALUES (?,?,?,?)',
      [req.student.id, cat, description.trim(), location?.trim()||null]
    );
    await pool.execute(
      'INSERT INTO notifications (student_id, type, title, message, module) VALUES (?,?,?,?,?)',
      [req.student.id, 'campus', 'Campus request submitted',
       `Your request "${description.trim().slice(0,60)}" was submitted.`, 'campus']
    );
    res.status(201).json({ success: true, message: 'Request submitted.', requestId: result.insertId });
  } catch (err) {
    console.error('[campus POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not submit request.' });
  }
});

module.exports = router;
