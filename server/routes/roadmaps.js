/**
 * routes/roadmaps.js — Career Roadmaps API
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }

// GET /api/roadmaps
router.get('/', async (req, res) => {
  try {
    const sid = req.student.id;
    const [roadmaps] = await pool.execute(
      `SELECT r.id, r.title, r.category, r.icon, r.overview, r.stages_json, r.created_at,
              JSON_LENGTH(r.stages_json) AS stage_count,
              rp.completed_stages_json
       FROM roadmaps r
       LEFT JOIN roadmap_progress rp ON rp.roadmap_id=r.id AND rp.student_id=?
       ORDER BY r.id`,
      [sid]
    );
    res.json({ success: true, roadmaps });
  } catch (err) {
    console.error('[roadmaps GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load roadmaps.' });
  }
});

// GET /api/roadmaps/:id
router.get('/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const sid = req.student.id;
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [[roadmap]] = await pool.execute(
      `SELECT r.*, rp.completed_stages_json
       FROM roadmaps r
       LEFT JOIN roadmap_progress rp ON rp.roadmap_id=r.id AND rp.student_id=?
       WHERE r.id=?`,
      [sid, id]
    );
    if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found.' });
    if (typeof roadmap.stages_json === 'string') roadmap.stages_json = JSON.parse(roadmap.stages_json);
    if (roadmap.completed_stages_json && typeof roadmap.completed_stages_json === 'string') {
      roadmap.completed_stages_json = JSON.parse(roadmap.completed_stages_json);
    }
    res.json({ success: true, roadmap });
  } catch (err) {
    console.error('[roadmaps/:id]', err.message);
    res.status(500).json({ success: false, message: 'Could not load roadmap.' });
  }
});

// POST /api/roadmaps/:id/progress — save which stages are completed
router.post('/:id/progress', async (req, res) => {
  try {
    const roadmapId = Number(req.params.id);
    const sid       = req.student.id;
    if (!isInt(roadmapId)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ success: false, message: 'Enter valid progress data.' });
    const completedStages = req.body.completed_stages; // stage numbers and task IDs
    if (!Array.isArray(completedStages) || completedStages.length > 1000) return res.status(400).json({ success: false, message: 'completed_stages must be an array of at most 1,000 items.' });
    const [[roadmap]] = await pool.execute('SELECT stages_json FROM roadmaps WHERE id=?', [roadmapId]);
    if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found.' });
    const stages = typeof roadmap.stages_json === 'string' ? JSON.parse(roadmap.stages_json) : roadmap.stages_json;
    const validProgress = new Set();
    for (const stage of stages) {
      validProgress.add(stage.stage);
      const tasks = Array.isArray(stage.checklist) && stage.checklist.length
        ? stage.checklist
        : (Array.isArray(stage.essential) && stage.essential.length
          ? stage.essential
          : (Array.isArray(stage.topics) ? stage.topics : []));
      tasks.forEach((_, index) => validProgress.add(`task:${stage.stage}:${index}`));
    }
    if (completedStages.some(item => !validProgress.has(item)) || new Set(completedStages).size !== completedStages.length) {
      return res.status(400).json({ success: false, message: 'Progress must contain unique stage numbers or task IDs for this roadmap.' });
    }
    await pool.execute(
      `INSERT INTO roadmap_progress (student_id, roadmap_id, completed_stages_json)
       VALUES (?,?,?) ON DUPLICATE KEY UPDATE completed_stages_json=VALUES(completed_stages_json)`,
      [sid, roadmapId, JSON.stringify(completedStages)]
    );
    res.json({ success: true, message: 'Progress saved.' });
  } catch (err) {
    console.error('[roadmaps/progress]', err.message);
    res.status(500).json({ success: false, message: 'Could not save progress.' });
  }
});

module.exports = router;
