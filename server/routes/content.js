/**
 * routes/content.js — Faculty Content Management API
 *
 * Faculty can create and delete shared content that students browse:
 *   - Academic Resources  (GET/POST/DELETE /api/content/resources)
 *   - Opportunities       (GET/POST/DELETE /api/content/opportunities)
 *   - Events              (GET/POST/DELETE /api/content/events)
 *   - Roadmaps            (GET/POST/DELETE /api/content/roadmaps)
 *   - Interview Topics    (GET/POST/DELETE /api/content/interview-topics)
 *
 * All routes require an active faculty session (requireFaculty middleware).
 * Faculty may only delete records they personally created.
 * SQL uses parameterized queries throughout.
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { getAuthenticatedUser } = require('./auth');

// ─── Auth middleware (same pattern as faculty.js) ─────────────────────────────
async function requireFaculty(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (user.role !== 'faculty') return res.status(403).json({ success: false, message: 'Faculty only.' });
    if (user.account_status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your faculty account is not active.' });
    }
    req.faculty = user;
    next();
  } catch (err) {
    console.error('[content auth]', err.message);
    res.status(500).json({ success: false, message: 'Session error.' });
  }
}

router.use(requireFaculty);

function isInt(v) { return Number.isSafeInteger(Number(v)) && Number(v) > 0; }
function isValidUrl(u) {
  if (!u || !u.trim()) return true;
  try { new URL(u); return true; } catch { return false; }
}
function isValidDate(str) {
  if (!str) return true;
  return !isNaN(Date.parse(str));
}

function isValidDateOnly(str) {
  if (!str) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [year, month, day] = str.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function optionalText(value, maxLen) {
  if (value == null) return null;
  if (typeof value !== 'string') return { invalid: true };
  const text = value.trim();
  if (!text) return null;
  if (maxLen && text.length > maxLen) return { tooLong: true, text };
  return text;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACADEMIC RESOURCES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/content/resources — list resources posted by this faculty
router.get('/resources', async (req, res) => {
  try {
    const [resources] = await pool.execute(
      `SELECT r.*, u.full_name AS uploaded_by_name
       FROM resources r JOIN users u ON r.uploaded_by=u.id
       WHERE r.uploaded_by=? ORDER BY r.created_at DESC`,
      [req.faculty.id]
    );
    res.json({ success: true, resources });
  } catch (err) {
    console.error('[content/resources GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load resources.' });
  }
});

// POST /api/content/resources — upload a new resource
router.post('/resources', async (req, res) => {
  try {
    const { title, subject, department, semester, academic_year, resource_type, description, file_url } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ success: false, message: 'Title is required.' });
    const VALID_TYPES = ['notes', 'textbook', 'question_paper', 'reference', 'other'];
    const rtype = VALID_TYPES.includes(resource_type) ? resource_type : 'other';
    if (file_url && !isValidUrl(file_url)) return res.status(400).json({ success: false, message: 'Invalid file URL.' });
    const [result] = await pool.execute(
      `INSERT INTO resources (uploaded_by, title, subject, department, semester, academic_year, resource_type, description, file_url)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.faculty.id, title.trim(), subject || null, department || null, semester || null,
       academic_year || null, rtype, description || null, file_url || null]
    );
    res.status(201).json({ success: true, message: 'Resource added.', resourceId: result.insertId });
  } catch (err) {
    console.error('[content/resources POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not add resource.' });
  }
});

// DELETE /api/content/resources/:id — delete own resource
router.delete('/resources/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute(
      'DELETE FROM resources WHERE id=? AND uploaded_by=?', [id, req.faculty.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found or not yours.' });
    res.json({ success: true, message: 'Resource deleted.' });
  } catch (err) {
    console.error('[content/resources DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete resource.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITIES (internships, scholarships, jobs, competitions)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/content/opportunities — list opportunities posted by this faculty
router.get('/opportunities', async (req, res) => {
  try {
    const [opportunities] = await pool.execute(
      `SELECT o.*, u.full_name AS posted_by_name
       FROM opportunities o JOIN users u ON o.posted_by=u.id
       WHERE o.posted_by=? ORDER BY o.created_at DESC`,
      [req.faculty.id]
    );
    res.json({ success: true, opportunities });
  } catch (err) {
    console.error('[content/opportunities GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load opportunities.' });
  }
});

// POST /api/content/opportunities — post a new opportunity
router.post('/opportunities', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Enter opportunity details.' });
    }
    const { type, title, company_or_org, description, eligibility, skills,
            location, work_mode, stipend, deadline, apply_url } = req.body;
    const VALID_TYPES = ['internship', 'job', 'scholarship', 'competition', 'other'];
    const VALID_MODES = ['remote', 'onsite', 'hybrid'];
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ success: false, message: 'Choose internship, job, scholarship, competition, or other.' });
    if (typeof title !== 'string') return res.status(400).json({ success: false, message: 'Title is required.' });
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return res.status(400).json({ success: false, message: 'Title is required.' });
    if (trimmedTitle.length > 200) return res.status(400).json({ success: false, message: 'Title must be 200 characters or fewer.' });

    const org = optionalText(company_or_org, 150);
    if (org && org.invalid) return res.status(400).json({ success: false, message: 'Organisation name must be text.' });
    if (org && org.tooLong) return res.status(400).json({ success: false, message: 'Organisation name is too long.' });
    const desc = optionalText(description);
    if (desc && desc.invalid) return res.status(400).json({ success: false, message: 'Description must be text.' });
    const elig = optionalText(eligibility);
    if (elig && elig.invalid) return res.status(400).json({ success: false, message: 'Eligibility must be text.' });
    const skillText = optionalText(skills, 300);
    if (skillText && skillText.invalid) return res.status(400).json({ success: false, message: 'Skills must be text.' });
    if (skillText && skillText.tooLong) return res.status(400).json({ success: false, message: 'Skills must be 300 characters or fewer.' });
    const loc = optionalText(location, 150);
    if (loc && loc.invalid) return res.status(400).json({ success: false, message: 'Location must be text.' });
    if (loc && loc.tooLong) return res.status(400).json({ success: false, message: 'Location is too long.' });
    const stipendText = optionalText(stipend, 100);
    if (stipendText && stipendText.invalid) return res.status(400).json({ success: false, message: 'Stipend / award must be text.' });
    if (stipendText && stipendText.tooLong) return res.status(400).json({ success: false, message: 'Stipend / award text is too long.' });
    const urlText = optionalText(apply_url, 500);
    if (urlText && urlText.invalid) return res.status(400).json({ success: false, message: 'Apply URL must be text.' });
    if (urlText && urlText.tooLong) return res.status(400).json({ success: false, message: 'Apply URL is too long.' });
    if (urlText && (!isValidUrl(urlText) || !/^https?:\/\//i.test(urlText))) return res.status(400).json({ success: false, message: 'Enter a valid apply URL, starting with http:// or https://.' });

    const deadlineText = String(deadline || '').trim();
    if (deadlineText && !isValidDateOnly(deadlineText)) {
      return res.status(400).json({ success: false, message: 'Deadline must be a valid date in YYYY-MM-DD format.' });
    }
    const todayInIndia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (deadlineText && deadlineText < todayInIndia) {
      return res.status(400).json({ success: false, message: 'Deadline must be today or later.' });
    }

    let mode = null;
    if (work_mode != null && typeof work_mode !== 'string') return res.status(400).json({ success: false, message: 'Work mode must be text.' });
    const modeRaw = (work_mode || '').trim();
    if (modeRaw) {
      if (!VALID_MODES.includes(modeRaw)) {
        return res.status(400).json({ success: false, message: 'Work mode must be remote, onsite, or hybrid.' });
      }
      mode = modeRaw;
    }

    const [result] = await pool.execute(
      `INSERT INTO opportunities (posted_by, type, title, company_or_org, description, eligibility,
         skills, location, work_mode, stipend, deadline, apply_url, is_verified)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [req.faculty.id, type, trimmedTitle,
       org || null, desc || null, elig || null, skillText || null, loc || null, mode,
       stipendText || null, deadlineText || null, urlText || null]
    );
    res.status(201).json({ success: true, message: 'Opportunity posted.', opportunityId: result.insertId });
  } catch (err) {
    console.error('[content/opportunities POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not post opportunity.' });
  }
});

// DELETE /api/content/opportunities/:id — delete own opportunity
router.delete('/opportunities/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute(
      'DELETE FROM opportunities WHERE id=? AND posted_by=?', [id, req.faculty.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found or not yours.' });
    res.json({ success: true, message: 'Opportunity deleted.' });
  } catch (err) {
    console.error('[content/opportunities DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete opportunity.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/content/events — list events posted by this faculty
router.get('/events', async (req, res) => {
  try {
    const [events] = await pool.execute(
      `SELECT e.*, u.full_name AS posted_by_name
       FROM events e JOIN users u ON e.posted_by=u.id
       WHERE e.posted_by=? ORDER BY e.event_date DESC`,
      [req.faculty.id]
    );
    res.json({ success: true, events });
  } catch (err) {
    console.error('[content/events GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load events.' });
  }
});

// POST /api/content/events — post a new event
router.post('/events', async (req, res) => {
  try {
    const { title, description, event_type, venue, event_date, registration_deadline, registration_url, is_online } = req.body;
    const VALID_TYPES = ['fest', 'workshop', 'seminar', 'hackathon', 'competition', 'webinar', 'other'];
    if (!title || !title.trim())  return res.status(400).json({ success: false, message: 'Title is required.' });
    if (!event_date)              return res.status(400).json({ success: false, message: 'Event date is required.' });
    if (!isValidDate(event_date)) return res.status(400).json({ success: false, message: 'Invalid event date.' });
    if (registration_url && !isValidUrl(registration_url)) return res.status(400).json({ success: false, message: 'Invalid registration URL.' });
    const etype = VALID_TYPES.includes(event_type) ? event_type : 'other';
    const [result] = await pool.execute(
      `INSERT INTO events (posted_by, title, description, event_type, venue, event_date,
         registration_deadline, registration_url, is_online)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.faculty.id, title.trim(), description || null, etype, venue || null, event_date,
       registration_deadline || null, registration_url || null, is_online ? 1 : 0]
    );
    res.status(201).json({ success: true, message: 'Event posted.', eventId: result.insertId });
  } catch (err) {
    console.error('[content/events POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not post event.' });
  }
});

// DELETE /api/content/events/:id — delete own event
router.delete('/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute(
      'DELETE FROM events WHERE id=? AND posted_by=?', [id, req.faculty.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Not found or not yours.' });
    res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    console.error('[content/events DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete event.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// INTERVIEW TOPICS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/content/interview-topics — list all interview topics
router.get('/interview-topics', async (req, res) => {
  try {
    const [topics] = await pool.execute(
      'SELECT * FROM interview_topics ORDER BY category, difficulty, id'
    );
    res.json({ success: true, topics });
  } catch (err) {
    console.error('[content/interview-topics GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load topics.' });
  }
});

// POST /api/content/interview-topics — add a topic
router.post('/interview-topics', async (req, res) => {
  try {
    const { category, title, difficulty, content, tags } = req.body;
    const VALID_CATS  = ['dsa', 'aptitude', 'technical', 'programming', 'hr', 'other'];
    const VALID_DIFFS = ['beginner', 'intermediate', 'advanced'];
    if (!title || !title.trim())   return res.status(400).json({ success: false, message: 'Title is required.' });
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Content is required.' });
    const cat  = VALID_CATS.includes(category)   ? category   : 'other';
    const diff = VALID_DIFFS.includes(difficulty) ? difficulty : 'beginner';
    const [result] = await pool.execute(
      'INSERT INTO interview_topics (category, title, difficulty, content, tags) VALUES (?,?,?,?,?)',
      [cat, title.trim(), diff, content.trim(), tags || null]
    );
    res.status(201).json({ success: true, message: 'Topic added.', topicId: result.insertId });
  } catch (err) {
    console.error('[content/interview-topics POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not add topic.' });
  }
});

// DELETE /api/content/interview-topics/:id — delete a topic
router.delete('/interview-topics/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute('DELETE FROM interview_topics WHERE id=?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Topic not found.' });
    res.json({ success: true, message: 'Topic deleted.' });
  } catch (err) {
    console.error('[content/interview-topics DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete topic.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROADMAPS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/content/roadmaps — list all roadmaps
router.get('/roadmaps', async (req, res) => {
  try {
    const [roadmaps] = await pool.execute('SELECT id, title, category, icon, overview, created_at FROM roadmaps ORDER BY id');
    res.json({ success: true, roadmaps });
  } catch (err) {
    console.error('[content/roadmaps GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load roadmaps.' });
  }
});

// POST /api/content/roadmaps — create a roadmap
// stages_json must be an array of { title, description } objects
router.post('/roadmaps', async (req, res) => {
  try {
    const { title, category, icon, overview, stages } = req.body;
    if (!title || !title.trim())   return res.status(400).json({ success: false, message: 'Title is required.' });
    if (!Array.isArray(stages) || stages.length === 0)
      return res.status(400).json({ success: false, message: 'At least one stage is required.' });
    // Sanitise stages — keep only title + description strings
    const sanitised = stages.map((s, i) => ({
      index:       i + 1,
      title:       String(s.title || `Stage ${i + 1}`).trim(),
      description: String(s.description || '').trim(),
    }));
    const [result] = await pool.execute(
      'INSERT INTO roadmaps (title, category, icon, overview, stages_json) VALUES (?,?,?,?,?)',
      [title.trim(), category || 'General', icon || '🗺️', overview || null, JSON.stringify(sanitised)]
    );
    res.status(201).json({ success: true, message: 'Roadmap created.', roadmapId: result.insertId });
  } catch (err) {
    console.error('[content/roadmaps POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not create roadmap.' });
  }
});

// DELETE /api/content/roadmaps/:id — delete a roadmap
router.delete('/roadmaps/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const [result] = await pool.execute('DELETE FROM roadmaps WHERE id=?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Roadmap not found.' });
    res.json({ success: true, message: 'Roadmap deleted.' });
  } catch (err) {
    console.error('[content/roadmaps DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete roadmap.' });
  }
});

module.exports = router;
