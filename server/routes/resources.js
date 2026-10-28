/**
 * routes/resources.js — Academic Resources API
 * Students browse/search shared resources. Only admins/faculty post resources.
 * Students can save resources for quick access.
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }

// GET /api/resources — list/search/filter resources
router.get('/', async (req, res) => {
  try {
    const { q, department, subject, semester, resource_type, academic_year } = req.query;
    for (const value of [q, department, subject, semester, resource_type, academic_year]) {
      if (value != null && (typeof value !== 'string' || value.length > 200)) return res.status(400).json({ success: false, message: 'Search and filter values must be 200 characters or fewer.' });
    }
    let sql = `SELECT r.id, r.title, r.subject, r.department, r.semester,
                      r.academic_year, r.resource_type, r.description, r.file_url,
                      r.created_at, u.full_name AS uploaded_by_name
               FROM resources r
               JOIN users u ON r.uploaded_by = u.id
               WHERE 1=1`;
    const params = [];
    if (q)             { sql += ' AND (r.title LIKE ? OR r.subject LIKE ? OR r.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (department)    { sql += ' AND r.department = ?';    params.push(department); }
    if (subject)       { sql += ' AND r.subject = ?';       params.push(subject); }
    if (semester)      { sql += ' AND r.semester = ?';      params.push(semester); }
    if (resource_type) { sql += ' AND r.resource_type = ?'; params.push(resource_type); }
    if (academic_year) { sql += ' AND r.academic_year = ?'; params.push(academic_year); }
    sql += ' ORDER BY r.created_at DESC LIMIT 100';
    const [resources] = await pool.execute(sql, params);
    res.json({ success: true, resources });
  } catch (err) {
    console.error('[resources GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load resources.' });
  }
});

// GET /api/resources/filters — get distinct filter values for dropdowns
router.get('/filters', async (req, res) => {
  try {
    const [depts]  = await pool.execute('SELECT DISTINCT department  FROM resources WHERE department IS NOT NULL ORDER BY department');
    const [subjects] = await pool.execute('SELECT DISTINCT subject FROM resources WHERE subject IS NOT NULL ORDER BY subject');
    const [sems]   = await pool.execute('SELECT DISTINCT semester    FROM resources WHERE semester IS NOT NULL ORDER BY semester');
    const [years]  = await pool.execute('SELECT DISTINCT academic_year FROM resources WHERE academic_year IS NOT NULL ORDER BY academic_year DESC');
    const [types]  = await pool.execute("SELECT DISTINCT resource_type FROM resources ORDER BY resource_type");
    res.json({
      success: true,
      departments:    depts.map(r => r.department),
      subjects: subjects.map(r => r.subject),
      semesters:      sems.map(r => r.semester),
      academic_years: years.map(r => r.academic_year),
      resource_types: types.map(r => r.resource_type),
    });
  } catch (err) {
    console.error('[resources/filters]', err.message);
    res.status(500).json({ success: false, message: 'Could not load filters.' });
  }
});

// GET /api/resources/:id — single resource detail
router.get('/:id', async (req, res) => {
  try {
    if (!isInt(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [[resource]] = await pool.execute(
      `SELECT r.*, u.full_name AS uploaded_by_name
       FROM resources r JOIN users u ON r.uploaded_by = u.id
       WHERE r.id = ?`,
      [Number(req.params.id)]
    );
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found.' });
    res.json({ success: true, resource });
  } catch (err) {
    console.error('[resources/:id]', err.message);
    res.status(500).json({ success: false, message: 'Could not load resource.' });
  }
});

module.exports = router;
