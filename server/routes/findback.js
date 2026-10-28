/**
 * routes/findback.js — Lost & Found API
 * Students create their own reports and can update/close them.
 * All students can browse open reports.
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }
const VALID_TYPES     = ['lost','found'];
const VALID_CATS      = ['electronics','clothing','accessories','books','id_cards','keys','bags','other'];
const VALID_STATUSES  = ['open','resolved','closed'];

// GET /api/findback
router.get('/', async (req, res) => {
  try {
    const { type, category, status, q } = req.query;
    if (type != null && (typeof type !== 'string' || !VALID_TYPES.includes(type))) return res.status(400).json({ success: false, message: 'Invalid item type.' });
    if (category != null && (typeof category !== 'string' || !VALID_CATS.includes(category))) return res.status(400).json({ success: false, message: 'Invalid category.' });
    if (status != null && (typeof status !== 'string' || !['all', ...VALID_STATUSES].includes(status))) return res.status(400).json({ success: false, message: 'Invalid status.' });
    if (q != null && (typeof q !== 'string' || q.length > 200)) return res.status(400).json({ success: false, message: 'Search must be 200 characters or fewer.' });
    let sql = `
      SELECT f.id, f.type, f.title, f.description, f.category, f.campus_location,
             f.item_date, f.image_url, f.status, f.contact_via_platform, f.created_at,
             CASE WHEN f.reported_by = ? THEN u.full_name ELSE NULL END AS reporter_name,
             CASE WHEN f.reported_by = ? THEN 1 ELSE 0 END AS is_mine,
             CASE WHEN f.title LIKE '[DEMO]%' THEN 1 ELSE 0 END AS is_demo
      FROM findback_items f JOIN users u ON f.reported_by=u.id
      WHERE 1=1`;
    const params = [req.student.id, req.student.id];
    if (type)     { sql += ' AND f.type = ?';     params.push(type); }
    if (category) { sql += ' AND f.category = ?'; params.push(category); }
    const s = status || 'open';
    if (s !== 'all') { sql += ' AND f.status = ?'; params.push(s); }
    if (q)        { sql += ' AND (f.title LIKE ? OR f.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    sql += ' ORDER BY f.created_at DESC LIMIT 100';
    const [items] = await pool.execute(sql, params);
    res.json({ success: true, items });
  } catch (err) {
    console.error('[findback GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load items.' });
  }
});

// POST /api/findback — report an item
router.post('/', async (req, res) => {
  try {
    const { type, title, description, category, campus_location, item_date, image_url } = req.body;
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ success: false, message: 'Enter report details.' });
    if (!VALID_TYPES.includes(type))  return res.status(400).json({ success: false, message: 'Type must be lost or found.' });
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ success: false, message: 'Title is required.' });
    if (title.trim().length > 200 || (description != null && (typeof description !== 'string' || description.length > 10000)) || (campus_location != null && (typeof campus_location !== 'string' || campus_location.length > 200))) return res.status(400).json({ success: false, message: 'One or more fields exceed the allowed length or have the wrong type.' });
    if (!VALID_CATS.includes(category)) return res.status(400).json({ success: false, message: 'Choose a valid item category.' });
    if (item_date != null && item_date !== '') {
      if (typeof item_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item_date) || Number.isNaN(Date.parse(`${item_date}T00:00:00Z`)) || new Date(`${item_date}T00:00:00Z`).toISOString().slice(0,10) !== item_date) return res.status(400).json({ success: false, message: 'Enter a valid item date.' });
    }
    if (image_url != null && image_url !== '') {
      if (typeof image_url !== 'string' || image_url.length > 500) return res.status(400).json({ success: false, message: 'Image URL must be 500 characters or fewer.' });
      try { if (typeof image_url !== 'string' || !['http:','https:'].includes(new URL(image_url).protocol)) throw new Error(); } catch { return res.status(400).json({ success: false, message: 'Image URL must be a valid HTTP or HTTPS URL.' }); }
    }
    const cat = category;
    const [result] = await pool.execute(
      `INSERT INTO findback_items (reported_by, type, title, description, category, campus_location, item_date, image_url)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.student.id, type, title.trim(), description?.trim()||null, cat, campus_location?.trim()||null, item_date||null, image_url||null]
    );
    // Create a notification for themselves
    await pool.execute(
      `INSERT INTO notifications (student_id, type, title, message, module) VALUES (?,?,?,?,?)`,
      [req.student.id, 'findback', 'FindBack report created',
       `Your ${type} item report "${title.trim()}" was submitted.`, 'findback']
    );
    res.status(201).json({ success: true, message: 'Report submitted.', itemId: result.insertId });
  } catch (err) {
    console.error('[findback POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not submit report.' });
  }
});

// POST /api/findback/:id/claim — send a private note to the report owner.
router.post('/:id/claim', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const message = req.body?.message;
    if (typeof message !== 'string' || !message.trim() || message.trim().length > 1000) return res.status(400).json({ success: false, message: 'Enter a claim note of up to 1,000 characters.' });
    const [[item]] = await pool.execute('SELECT id, reported_by, status, title FROM findback_items WHERE id=?', [id]);
    if (!item || item.status !== 'open') return res.status(404).json({ success: false, message: 'Open report not found.' });
    if (item.title.startsWith('[DEMO]')) return res.status(400).json({ success: false, message: 'Demo listings cannot receive claim notes.' });
    if (Number(item.reported_by) === Number(req.student.id)) return res.status(400).json({ success: false, message: 'You cannot claim your own report.' });
    const [[sender]] = await pool.execute('SELECT full_name FROM users WHERE id=?', [req.student.id]);
    const marker = `[FINDBACK_CLAIM item=${id} user=${req.student.id}]`;
    const [existing] = await pool.execute('SELECT id FROM notifications WHERE student_id=? AND type=? AND module=? AND LOCATE(?, message)>0 LIMIT 1', [item.reported_by, 'findback_claim', 'findback', marker]);
    if (existing.length) return res.status(409).json({ success: false, message: 'You have already sent a claim note for this report.' });
    await pool.execute('INSERT INTO notifications (student_id,type,title,message,module) VALUES (?,?,?,?,?)', [item.reported_by, 'findback_claim', 'Private FindBack claim', `${marker} ${sender?.full_name || 'A student'} wrote: ${message.trim()}`, 'findback']);
    res.status(201).json({ success: true, message: 'Private claim note sent to the report owner.' });
  } catch (err) {
    console.error('[findback CLAIM]', err.message);
    res.status(500).json({ success: false, message: 'Could not send claim note.' });
  }
});

// PATCH /api/findback/:id — update own report status or description
router.patch('/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const sid = req.student.id;
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [[item]] = await pool.execute('SELECT * FROM findback_items WHERE id=? AND reported_by=?', [id, sid]);
    if (!item) return res.status(404).json({ success: false, message: 'Report not found or not yours.' });
    if (req.body.status !== undefined && !VALID_STATUSES.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    if (req.body.description !== undefined && (typeof req.body.description !== 'string' || req.body.description.length > 10000)) return res.status(400).json({ success: false, message: 'Description must be 10,000 characters or fewer.' });
    const status      = req.body.status === undefined ? item.status : req.body.status;
    const description = req.body.description !== undefined ? req.body.description.trim() : item.description;
    await pool.execute('UPDATE findback_items SET status=?, description=? WHERE id=?', [status, description, id]);
    res.json({ success: true, message: 'Report updated.' });
  } catch (err) {
    console.error('[findback PATCH]', err.message);
    res.status(500).json({ success: false, message: 'Could not update report.' });
  }
});

// DELETE /api/findback/:id — delete own report
router.delete('/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const sid = req.student.id;
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute(
      'DELETE FROM findback_items WHERE id=? AND reported_by=?', [id, sid]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found or not yours.' });
    res.json({ success: true, message: 'Report deleted.' });
  } catch (err) {
    console.error('[findback DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete report.' });
  }
});

module.exports = router;
