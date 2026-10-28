/**
 * routes/projects.js — ProjectVault API
 * Students create/edit/delete their own projects. All students can browse.
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }
function isValidUrl(u) {
  if (u == null || u === '') return true;
  if (typeof u !== 'string') return false;
  try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; }
}
function optionalText(value, max) { return value == null || value === '' || (typeof value === 'string' && value.trim().length <= max); }

// GET /api/projects — browse all projects with optional filters
router.get('/', async (req, res) => {
  try {
    const sid = req.student.id;
    const { q, category, technology } = req.query;
    if (q != null && (typeof q !== 'string' || q.length > 200)) return res.status(400).json({ success: false, message: 'Search text must be 200 characters or fewer.' });
    if (category != null && (typeof category !== 'string' || category.length > 100)) return res.status(400).json({ success: false, message: 'Invalid project category.' });
    if (technology != null && (typeof technology !== 'string' || technology.length > 100)) return res.status(400).json({ success: false, message: 'Invalid technology filter.' });
    let sql = `
      SELECT p.*, u.full_name AS student_name,
             CASE WHEN p.student_id = ? THEN 1 ELSE 0 END AS is_mine,
             CASE WHEN LOCATE('[DEMO:UNIONE-PROJECT] ', p.description)=1 THEN 1 ELSE 0 END AS is_demo
      FROM student_projects p JOIN users u ON p.student_id=u.id WHERE 1=1`;
    const params = [sid];
    if (q)        { sql += ' AND (p.title LIKE ? OR p.technologies LIKE ? OR p.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (category) { sql += ' AND p.category = ?'; params.push(category); }
    if (technology) { sql += ' AND p.technologies LIKE ?'; params.push(`%${technology}%`); }
    sql += ' ORDER BY p.created_at DESC LIMIT 100';
    const [projects] = await pool.execute(sql, params);
    res.json({ success: true, projects });
  } catch (err) {
    console.error('[projects GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load projects.' });
  }
});

// GET /api/projects/mine — only current student's projects
router.get('/mine', async (req, res) => {
  try {
    const { q, category, technology } = req.query;
    if (q != null && (typeof q !== 'string' || q.length > 200)) return res.status(400).json({ success: false, message: 'Search text must be 200 characters or fewer.' });
    if (category != null && (typeof category !== 'string' || category.length > 100)) return res.status(400).json({ success: false, message: 'Invalid project category.' });
    if (technology != null && (typeof technology !== 'string' || technology.length > 100)) return res.status(400).json({ success: false, message: 'Invalid technology filter.' });
    let sql = 'SELECT * FROM student_projects WHERE student_id=?';
    const params = [req.student.id];
    if (q) { sql += ' AND (title LIKE ? OR technologies LIKE ? OR description LIKE ?)'; params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
    if (category) { sql += ' AND category=?'; params.push(category); }
    if (technology) { sql += ' AND technologies LIKE ?'; params.push(`%${technology}%`); }
    sql += ' ORDER BY created_at DESC';
    const [projects] = await pool.execute(
      sql, params
    );
    res.json({ success: true, projects });
  } catch (err) {
    console.error('[projects/mine]', err.message);
    res.status(500).json({ success: false, message: 'Could not load your projects.' });
  }
});

// POST /api/projects — create a project
router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ success: false, message: 'Enter project details.' });
    const { title, description, technologies, category, github_url, demo_url } = req.body;
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ success: false, message: 'Title is required.' });
    if (title.trim().length > 200 || !optionalText(description, 20000) || !optionalText(technologies, 400) || !optionalText(category, 100) || !optionalText(github_url, 500) || !optionalText(demo_url, 500)) return res.status(400).json({ success: false, message: 'One or more project fields exceed their allowed length or have the wrong type.' });
    if (!isValidUrl(github_url)) return res.status(400).json({ success: false, message: 'Invalid GitHub URL.' });
    if (!isValidUrl(demo_url))   return res.status(400).json({ success: false, message: 'Invalid demo URL.' });
    const [result] = await pool.execute(
      `INSERT INTO student_projects (student_id, title, description, technologies, category, github_url, demo_url)
       VALUES (?,?,?,?,?,?,?)`,
      [req.student.id, title.trim(), description||null, technologies||null, category||null, github_url||null, demo_url||null]
    );
    res.status(201).json({ success: true, message: 'Project added.', projectId: result.insertId });
  } catch (err) {
    console.error('[projects POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not add project.' });
  }
});

// PUT /api/projects/:id — edit own project
router.put('/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const sid = req.student.id;
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [[proj]] = await pool.execute('SELECT * FROM student_projects WHERE id=? AND student_id=?', [id, sid]);
    if (!proj) return res.status(404).json({ success: false, message: 'Project not found or not yours.' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ success: false, message: 'Enter project details.' });
    const { title, description, technologies, category, github_url, demo_url } = req.body;
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) return res.status(400).json({ success: false, message: 'Title cannot be empty.' });
    for (const [value, max] of [[description,20000],[technologies,400],[category,100],[github_url,500],[demo_url,500]]) {
      if (value !== undefined && !optionalText(value, max)) return res.status(400).json({ success: false, message: 'One or more project fields exceed their allowed length or have the wrong type.' });
    }
    const nextGithub = github_url === undefined ? proj.github_url : github_url;
    const nextDemo = demo_url === undefined ? proj.demo_url : demo_url;
    if (!isValidUrl(nextGithub)) return res.status(400).json({ success: false, message: 'Invalid GitHub URL.' });
    if (!isValidUrl(nextDemo))   return res.status(400).json({ success: false, message: 'Invalid demo URL.' });
    await pool.execute(
      `UPDATE student_projects SET title=?, description=?, technologies=?, category=?, github_url=?, demo_url=? WHERE id=? AND student_id=?`,
      [title === undefined ? proj.title : title.trim(), description === undefined ? proj.description : description||null,
       technologies === undefined ? proj.technologies : technologies||null, category === undefined ? proj.category : category||null,
       nextGithub||null, nextDemo||null, id, sid]
    );
    res.json({ success: true, message: 'Project updated.' });
  } catch (err) {
    console.error('[projects PUT]', err.message);
    res.status(500).json({ success: false, message: 'Could not update project.' });
  }
});

// DELETE /api/projects/:id — delete own project
router.delete('/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const sid = req.student.id;
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute(
      'DELETE FROM student_projects WHERE id=? AND student_id=?', [id, sid]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found or not yours.' });
    res.json({ success: true, message: 'Project deleted.' });
  } catch (err) {
    console.error('[projects DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete project.' });
  }
});

module.exports = router;
