/** Shared opportunity listings, private student applications, and authorized reviews. */
const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const router = express.Router();
const pool = require('../config/db');
const { requireStudent } = require('./student');
const { getAuthenticatedUser } = require('./auth');

const RESUME_DIR = path.join(__dirname, '..', 'private_uploads', 'resumes');
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const REVIEW_STATUSES = ['under_review', 'shortlisted', 'interview', 'selected', 'rejected'];
const TRANSITIONS = {
  interested: REVIEW_STATUSES,
  applied: REVIEW_STATUSES,
  submitted: ['under_review', 'rejected'],
  under_review: ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['interview', 'selected', 'rejected'],
  interview: ['selected', 'rejected'],
  selected: [],
  rejected: [],
};

function isInt(value) { return Number.isSafeInteger(Number(value)) && Number(value) > 0; }
function safeName(value) {
  if (typeof value !== 'string') return '';
  return path.basename(value.replace(/\\/g, '/')).replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 180);
}

async function requireReviewer(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (!['faculty', 'admin'].includes(user.role)) return res.status(403).json({ success: false, message: 'Only faculty or admins can review applications.' });
    if (user.account_status !== 'active') return res.status(403).json({ success: false, message: 'Your account is not active.' });
    req.reviewer = user;
    next();
  } catch (error) {
    console.error('[opportunities reviewer auth]', error.message);
    res.status(500).json({ success: false, message: 'Session verification failed.' });
  }
}

async function reviewerOwnsOpportunity(user, opportunityId) {
  if (user.role === 'admin') return true;
  const [rows] = await pool.execute('SELECT id FROM opportunities WHERE id=? AND posted_by=? LIMIT 1', [opportunityId, user.id]);
  return rows.length > 0;
}

async function parseResume(resume) {
  if (!resume || typeof resume !== 'object' || Array.isArray(resume)) throw new Error('Upload a PDF resume to apply.');
  const name = safeName(resume.fileName);
  if (!name || !/\.pdf$/i.test(name)) throw new Error('Resume must be a PDF file.');
  if (resume.mimeType !== 'application/pdf' || typeof resume.base64 !== 'string') throw new Error('Resume must be a valid PDF file.');
  if (resume.base64.length > Math.ceil(MAX_RESUME_BYTES * 4 / 3) + 8 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(resume.base64)) {
    throw new Error('Resume file is too large or invalid. Maximum size is 5 MB.');
  }
  const buffer = Buffer.from(resume.base64, 'base64');
  if (!buffer.length || buffer.length > MAX_RESUME_BYTES) throw new Error('Resume file is too large or empty. Maximum size is 5 MB.');
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('The uploaded file does not contain a valid PDF header.');
  return { name, buffer };
}

// Reviewer inbox must precede the parameterized student routes.
router.get('/review', requireReviewer, async (req, res) => {
  try {
    const params = [];
    let scope = '';
    if (req.reviewer.role !== 'admin') { scope = 'AND o.posted_by=?'; params.push(req.reviewer.id); }
    const [applications] = await pool.execute(
      `SELECT oa.id, oa.student_id, oa.opportunity_id, oa.status, oa.applied_at,
              oa.resume_original_name, oa.reviewer_feedback, oa.reviewed_at,
              o.title AS opportunity_title, o.type AS opportunity_type,
              u.full_name AS student_name, u.email AS student_email
       FROM opportunity_applications oa
       JOIN opportunities o ON o.id=oa.opportunity_id
       JOIN users u ON u.id=oa.student_id
       WHERE 1=1 ${scope}
       ORDER BY oa.applied_at DESC LIMIT 250`, params
    );
    res.json({ success: true, applications });
  } catch (error) {
    console.error('[opportunities review GET]', error.message);
    res.status(500).json({ success: false, message: 'Could not load applications.' });
  }
});

router.patch('/review/:id', requireReviewer, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, feedback } = req.body || {};
    if (!isInt(id)) return res.status(400).json({ success: false, message: 'Invalid application ID.' });
    if (typeof status !== 'string' || !REVIEW_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Choose a valid review status.' });
    if (feedback != null && typeof feedback !== 'string') return res.status(400).json({ success: false, message: 'Feedback must be text.' });
    const note = String(feedback || '').trim();
    if (note.length > 5000) return res.status(400).json({ success: false, message: 'Feedback must be 5,000 characters or fewer.' });
    const [[application]] = await pool.execute(
      'SELECT id, opportunity_id, status FROM opportunity_applications WHERE id=?', [id]
    );
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (!await reviewerOwnsOpportunity(req.reviewer, application.opportunity_id)) return res.status(403).json({ success: false, message: 'You cannot review applications for this opportunity.' });
    if (status !== application.status && !TRANSITIONS[application.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot move an application from ${application.status} to ${status}.` });
    }
    await pool.execute(
      `UPDATE opportunity_applications SET status=?, reviewer_feedback=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?`,
      [status, note || null, req.reviewer.id, id]
    );
    res.json({ success: true, message: 'Application review saved.' });
  } catch (error) {
    console.error('[opportunities review PATCH]', error.message);
    res.status(500).json({ success: false, message: 'Could not save application review.' });
  }
});

router.get('/applications', requireStudent, async (req, res) => {
  try {
    const [applications] = await pool.execute(
      `SELECT oa.id, oa.opportunity_id, oa.status, oa.applied_at,
              oa.resume_original_name, oa.reviewer_feedback, oa.reviewed_at,
              o.type, o.title, o.company_or_org, o.apply_url, o.is_verified
       FROM opportunity_applications oa JOIN opportunities o ON o.id=oa.opportunity_id
       WHERE oa.student_id=? ORDER BY oa.applied_at DESC`, [req.student.id]
    );
    res.json({ success: true, applications });
  } catch (error) {
    console.error('[opportunities applications GET]', error.message);
    res.status(500).json({ success: false, message: 'Could not load your applications.' });
  }
});

router.get('/applications/:id/resume', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (!isInt(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid application ID.' });
    const [[application]] = await pool.execute(
      `SELECT oa.student_id, oa.opportunity_id, oa.resume_storage_key, oa.resume_original_name
       FROM opportunity_applications oa WHERE oa.id=?`, [Number(req.params.id)]
    );
    if (!application?.resume_storage_key) return res.status(404).json({ success: false, message: 'Resume not found.' });
    const isOwner = user.role === 'student' && user.id === application.student_id;
    const allowed = isOwner || (['faculty', 'admin'].includes(user.role) && await reviewerOwnsOpportunity(user, application.opportunity_id));
    if (!allowed) return res.status(403).json({ success: false, message: 'You are not authorized to view this resume.' });
    if (!/^[a-f0-9]{64}$/.test(application.resume_storage_key)) return res.status(404).json({ success: false, message: 'Resume not found.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.download(path.join(RESUME_DIR, `${application.resume_storage_key}.pdf`), application.resume_original_name || 'resume.pdf', error => {
      if (error && !res.headersSent) res.status(error.code === 'ENOENT' ? 404 : 500).json({ success: false, message: error.code === 'ENOENT' ? 'Resume file is no longer available.' : 'Could not retrieve this resume.' });
    });
  } catch (error) {
    console.error('[opportunities resume GET]', error.message);
    res.status(500).json({ success: false, message: 'Could not retrieve this resume.' });
  }
});

// Student listing with saved/application state scoped to the authenticated session.
router.get('/', requireStudent, async (req, res) => {
  try {
    const { type, q, work_mode } = req.query;
    const validTypes = ['internship', 'job', 'scholarship', 'competition', 'other'];
    const validModes = ['remote', 'onsite', 'hybrid'];
    if (type && !validTypes.includes(type)) return res.status(400).json({ success: false, message: 'Invalid opportunity type.' });
    if (work_mode && !validModes.includes(work_mode)) return res.status(400).json({ success: false, message: 'Invalid work mode.' });
    if (q && (typeof q !== 'string' || q.length > 200)) return res.status(400).json({ success: false, message: 'Search text must be 200 characters or fewer.' });
    let sql = `SELECT o.*, u.full_name AS posted_by_name,
        CASE WHEN so.id IS NOT NULL THEN 1 ELSE 0 END AS is_saved, oa.status AS application_status,
        oa.resume_original_name AS application_resume_name
      FROM opportunities o JOIN users u ON o.posted_by=u.id
      LEFT JOIN saved_opportunities so ON so.opportunity_id=o.id AND so.student_id=?
      LEFT JOIN opportunity_applications oa ON oa.opportunity_id=o.id AND oa.student_id=? WHERE 1=1`;
    const params = [req.student.id, req.student.id];
    if (type) { sql += ' AND o.type=?'; params.push(type); }
    if (work_mode) { sql += ' AND o.work_mode=?'; params.push(work_mode); }
    if (q) { sql += ' AND (o.title LIKE ? OR o.company_or_org LIKE ? OR o.skills LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    sql += ' ORDER BY o.created_at DESC LIMIT 100';
    const [opportunities] = await pool.execute(sql, params);
    res.json({ success: true, opportunities });
  } catch (error) {
    console.error('[opportunities GET]', error.message);
    res.status(500).json({ success: false, message: 'Could not load opportunities.' });
  }
});

router.get('/saved', requireStudent, async (req, res) => {
  try {
    const [saved] = await pool.execute(
      `SELECT o.*, so.created_at AS saved_at, 1 AS is_saved, oa.status AS application_status
       FROM saved_opportunities so JOIN opportunities o ON so.opportunity_id=o.id
       LEFT JOIN opportunity_applications oa ON oa.opportunity_id=o.id AND oa.student_id=?
       WHERE so.student_id=? ORDER BY so.created_at DESC`, [req.student.id, req.student.id]
    );
    res.json({ success: true, saved });
  } catch (error) {
    console.error('[opportunities saved GET]', error.message);
    res.status(500).json({ success: false, message: 'Could not load saved opportunities.' });
  }
});

router.post('/:id/save', requireStudent, async (req, res) => {
  try {
    const opportunityId = Number(req.params.id);
    if (!isInt(opportunityId)) return res.status(400).json({ success: false, message: 'Invalid opportunity ID.' });
    const [[opportunity]] = await pool.execute('SELECT id FROM opportunities WHERE id=?', [opportunityId]);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    const [existing] = await pool.execute('SELECT id FROM saved_opportunities WHERE student_id=? AND opportunity_id=?', [req.student.id, opportunityId]);
    if (existing.length) {
      await pool.execute('DELETE FROM saved_opportunities WHERE student_id=? AND opportunity_id=?', [req.student.id, opportunityId]);
      return res.json({ success: true, saved: false, message: 'Removed from saved.' });
    }
    await pool.execute('INSERT INTO saved_opportunities (student_id, opportunity_id) VALUES (?,?)', [req.student.id, opportunityId]);
    res.json({ success: true, saved: true, message: 'Saved.' });
  } catch (error) {
    console.error('[opportunities save POST]', error.message);
    res.status(500).json({ success: false, message: 'Could not update saved status.' });
  }
});

router.post('/:id/apply', requireStudent, async (req, res) => {
  let storagePath;
  try {
    const opportunityId = Number(req.params.id);
    if (!isInt(opportunityId)) return res.status(400).json({ success: false, message: 'Invalid opportunity ID.' });
    if (!req.body || Object.keys(req.body).some(key => key !== 'resume')) return res.status(400).json({ success: false, message: 'Application accepts a resume file only. Students cannot set their own status.' });
    const parsed = await parseResume(req.body.resume);
    const [[opportunity]] = await pool.execute('SELECT id, deadline FROM opportunities WHERE id=?', [opportunityId]);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    if (opportunity.deadline && new Date(opportunity.deadline).getTime() < Date.now() - 86400000) return res.status(400).json({ success: false, message: 'The application deadline has passed.' });
    const [[existing]] = await pool.execute('SELECT id, status, resume_storage_key FROM opportunity_applications WHERE student_id=? AND opportunity_id=?', [req.student.id, opportunityId]);
    const canUpgradeLegacyTrack = existing && ['interested', 'applied'].includes(existing.status) && !existing.resume_storage_key;
    if (existing && !canUpgradeLegacyTrack) return res.status(409).json({ success: false, message: 'You have already applied to this opportunity.' });
    await fs.mkdir(RESUME_DIR, { recursive: true });
    const storageKey = crypto.randomBytes(32).toString('hex');
    storagePath = path.join(RESUME_DIR, `${storageKey}.pdf`);
    await fs.writeFile(storagePath, parsed.buffer, { flag: 'wx', mode: 0o600 });
    let applicationId;
    if (canUpgradeLegacyTrack) {
      const [update] = await pool.execute(
        `UPDATE opportunity_applications SET status='submitted', resume_original_name=?, resume_storage_key=?, applied_at=NOW()
         WHERE id=? AND student_id=? AND resume_storage_key IS NULL AND status IN ('interested','applied')`, [parsed.name, storageKey, existing.id, req.student.id]
      );
      if (!update.affectedRows) { const duplicate = new Error('Already submitted.'); duplicate.code = 'ER_DUP_ENTRY'; throw duplicate; }
      applicationId = existing.id;
    } else {
      const [insert] = await pool.execute(
        `INSERT INTO opportunity_applications (student_id, opportunity_id, status, resume_original_name, resume_storage_key)
         VALUES (?, ?, 'submitted', ?, ?)`, [req.student.id, opportunityId, parsed.name, storageKey]
      );
      applicationId = insert.insertId;
    }
    res.status(201).json({ success: true, applicationId, status: 'submitted', message: 'Application submitted.' });
  } catch (error) {
    if (storagePath) await fs.unlink(storagePath).catch(() => {});
    if (error.message && /resume|PDF|file/i.test(error.message)) return res.status(400).json({ success: false, message: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'You have already applied to this opportunity.' });
    console.error('[opportunities apply POST]', error.message);
    res.status(500).json({ success: false, message: 'Could not submit your application.' });
  }
});

module.exports = router;
