/**
 * routes/portfolio.js — Student Portfolio (extends student_profiles)
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireStudent } = require('./student');

router.use(requireStudent);

function isValidUrl(u) {
  if (!u || !u.trim()) return true;
  try { new URL(u); return true; } catch { return false; }
}

// GET /api/portfolio — own portfolio
router.get('/', async (req, res) => {
  try {
    const sid = req.student.id;
    const [[profile]] = await pool.execute(
      `SELECT sp.*, u.full_name, u.email
       FROM student_profiles sp JOIN users u ON sp.user_id=u.id
       WHERE sp.user_id=?`,
      [sid]
    );
    if (!profile) {
      // Return empty shell if profile row does not exist yet
      return res.json({ success: true, portfolio: { full_name: req.student.fullName, email: req.student.email } });
    }
    // Parse JSON fields
    ['skills_json','certifications_json','achievements_json','internship_exp_json'].forEach(f => {
      if (profile[f] && typeof profile[f] === 'string') {
        try { profile[f] = JSON.parse(profile[f]); } catch { profile[f] = null; }
      }
    });
    // Attach own projects
    const [projects] = await pool.execute(
      'SELECT * FROM student_projects WHERE student_id=? ORDER BY created_at DESC', [sid]
    );
    profile.projects = projects;
    profile.full_name = req.student.fullName;
    profile.email     = req.student.email;
    res.json({ success: true, portfolio: profile });
  } catch (err) {
    console.error('[portfolio GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load portfolio.' });
  }
});

// PUT /api/portfolio — update own portfolio
router.put('/', async (req, res) => {
  try {
    const sid = req.student.id;
    const { bio, skills, linkedin_url, github_url, certifications, achievements, internship_exp, department, study_year, phone } = req.body;
    if (linkedin_url && !isValidUrl(linkedin_url)) return res.status(400).json({ success: false, message: 'Invalid LinkedIn URL.' });
    if (github_url   && !isValidUrl(github_url))   return res.status(400).json({ success: false, message: 'Invalid GitHub URL.' });
    // Upsert student_profiles
    const [[existing]] = await pool.execute('SELECT id FROM student_profiles WHERE user_id=?', [sid]);
    if (existing) {
      await pool.execute(
        `UPDATE student_profiles SET
           bio=?, skills_json=?, linkedin_url=?, github_url=?,
           certifications_json=?, achievements_json=?, internship_exp_json=?,
           department=?, study_year=?, phone=?
         WHERE user_id=?`,
        [
          bio||null,
          skills            ? JSON.stringify(skills)         : null,
          linkedin_url||null,
          github_url||null,
          certifications    ? JSON.stringify(certifications) : null,
          achievements      ? JSON.stringify(achievements)   : null,
          internship_exp    ? JSON.stringify(internship_exp) : null,
          department||null,
          study_year||null,
          phone||null,
          sid,
        ]
      );
    } else {
      await pool.execute(
        `INSERT INTO student_profiles
           (user_id, bio, skills_json, linkedin_url, github_url,
            certifications_json, achievements_json, internship_exp_json, department, study_year, phone)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          sid,
          bio||null,
          skills         ? JSON.stringify(skills)         : null,
          linkedin_url||null,
          github_url||null,
          certifications ? JSON.stringify(certifications) : null,
          achievements   ? JSON.stringify(achievements)   : null,
          internship_exp ? JSON.stringify(internship_exp) : null,
          department||null,
          study_year||null,
          phone||null,
        ]
      );
    }
    res.json({ success: true, message: 'Portfolio updated.' });
  } catch (err) {
    console.error('[portfolio PUT]', err.message);
    res.status(500).json({ success: false, message: 'Could not update portfolio.' });
  }
});

module.exports = router;
