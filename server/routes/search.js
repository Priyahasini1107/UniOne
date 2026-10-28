/**
 * routes/search.js — Global search across student modules
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

// GET /api/search?q=... — search across resources, opportunities, events, projects, posts
router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, results: [] });
    const like = `%${q}%`;

    const [resources] = await pool.execute(
      `SELECT id, title, 'resource' AS type, subject AS subtitle FROM resources
       WHERE title LIKE ? OR subject LIKE ? LIMIT 5`, [like, like]
    );
    const [opportunities] = await pool.execute(
      `SELECT id, title, type AS type, company_or_org AS subtitle FROM opportunities
       WHERE title LIKE ? OR company_or_org LIKE ? LIMIT 5`, [like, like]
    );
    const [events] = await pool.execute(
      `SELECT id, title, 'event' AS type, venue AS subtitle FROM events
       WHERE title LIKE ? OR description LIKE ? LIMIT 5`, [like, like]
    );
    const [projects] = await pool.execute(
      `SELECT id, title, 'project' AS type, technologies AS subtitle FROM student_projects
       WHERE title LIKE ? OR technologies LIKE ? LIMIT 5`, [like, like]
    );
    const [posts] = await pool.execute(
      `SELECT id, title, 'community' AS type, category AS subtitle FROM community_posts
       WHERE title LIKE ? OR content LIKE ? LIMIT 5`, [like, like]
    );

    const results = [
      ...resources.map(r => ({ ...r, module: 'academic' })),
      ...opportunities.map(r => ({ ...r, module: r.type === 'scholarship' ? 'scholarships' : 'internships' })),
      ...events.map(r => ({ ...r, module: 'events' })),
      ...projects.map(r => ({ ...r, module: 'projectvault' })),
      ...posts.map(r => ({ ...r, module: 'community' })),
    ];

    res.json({ success: true, results, query: q });
  } catch (err) {
    console.error('[search]', err.message);
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
});

module.exports = router;
