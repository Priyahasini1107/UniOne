/**
 * routes/faculty.js — Faculty Dashboard API Routes
 *
 * ALL routes are protected by the requireFaculty middleware, which:
 *   1. Reads the unione_session cookie.
 *   2. Looks up the token in the shared in-memory sessions Map (from auth.js).
 *   3. Queries MySQL to confirm the user is active.
 *   4. Verifies that the user's role is 'faculty'.
 *
 * SCOPING:
 *   Every query filters by req.faculty.id (the authenticated faculty's user ID).
 *   A faculty member can never read or write another faculty member's data.
 *
 * SECURITY:
 *   - All SQL uses parameterized queries (pool.execute / conn.execute).
 *   - All integer IDs are validated with Number.isSafeInteger().
 *   - Dates are validated with a regex + Date() check.
 *   - Attendance status is validated against a whitelist.
 *   - Ownership is verified before any write or delete operation.
 *   - A MySQL transaction with rollback guards the bulk attendance upsert.
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// Import getAuthenticatedUser from auth.js.
// This reuses the SAME in-memory sessions Map so faculty sessions work correctly.
const { getAuthenticatedUser } = require('./auth');

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * requireFaculty — rejects requests that are not from an authenticated,
 * active faculty user. Attaches the user object to req.faculty.
 */
async function requireFaculty(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    if (user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'This area is restricted to faculty members.',
      });
    }

    // user already has { id, full_name, email, role, account_status, token }
    req.faculty = user;
    next();
  } catch (err) {
    console.error('[Faculty Auth Error]', err.message);
    res.status(500).json({ success: false, message: 'Session verification failed.' });
  }
}

// Apply to every route in this file
router.use(requireFaculty);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the given classId belongs to the given facultyId.
 * Used to verify ownership before any read/write/delete on class-scoped data.
 */
async function assertOwnsClass(facultyId, classId) {
  const [rows] = await pool.execute(
    'SELECT id FROM faculty_classes WHERE id = ? AND faculty_id = ? LIMIT 1',
    [classId, facultyId]
  );
  return rows.length > 0;
}

/**
 * Returns true if the string is a valid YYYY-MM-DD calendar date.
 */
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return d instanceof Date && !isNaN(d.getTime());
}

// ─── GET /api/faculty/summary ────────────────────────────────────────────────
// Overview card counts for the faculty's own data.
router.get('/summary', async (req, res) => {
  try {
    const id = req.faculty.id;

    const [[summary]] = await pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM faculty_classes      WHERE faculty_id = ?)          AS classes,
         (SELECT COUNT(ce.id)
          FROM   class_enrollments ce
          JOIN   faculty_classes fc ON ce.class_id = fc.id
          WHERE  fc.faculty_id = ?)                                                AS students,
         (SELECT COUNT(*) FROM assignments            WHERE faculty_id = ?)        AS assignments,
         (SELECT COUNT(*) FROM announcements          WHERE faculty_id = ?)        AS announcements`,
      [id, id, id, id]
    );

    res.json({ success: true, summary });
  } catch (err) {
    console.error('[faculty/summary]', err.message);
    res.status(500).json({ success: false, message: 'Could not load summary.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// CLASSES
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/faculty/classes — list the faculty's own classes with enrollment count
router.get('/classes', async (req, res) => {
  try {
    const [classes] = await pool.execute(
      `SELECT fc.id, fc.subject_name, fc.subject_code, fc.semester,
              fc.department, fc.created_at,
              COUNT(ce.id) AS student_count
       FROM   faculty_classes fc
       LEFT JOIN class_enrollments ce ON ce.class_id = fc.id
       WHERE  fc.faculty_id = ?
       GROUP  BY fc.id
       ORDER  BY fc.created_at DESC`,
      [req.faculty.id]
    );

    res.json({ success: true, classes });
  } catch (err) {
    console.error('[faculty/classes GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load classes.' });
  }
});

// POST /api/faculty/classes — create a new class
router.post('/classes', async (req, res) => {
  try {
    const subjectName = String(req.body.subject_name || '').trim();
    const subjectCode = String(req.body.subject_code || '').trim() || null;
    const semester    = String(req.body.semester    || '').trim() || null;
    const department  = String(req.body.department  || '').trim() || null;

    if (!subjectName) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }
    if (subjectName.length > 150) {
      return res.status(400).json({
        success: false, message: 'Subject name must be 150 characters or fewer.',
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO faculty_classes (faculty_id, subject_name, subject_code, semester, department)
       VALUES (?, ?, ?, ?, ?)`,
      [req.faculty.id, subjectName, subjectCode, semester, department]
    );

    res.status(201).json({
      success: true,
      message: 'Class created successfully.',
      classId: result.insertId,
    });
  } catch (err) {
    console.error('[faculty/classes POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not create class.' });
  }
});

// DELETE /api/faculty/classes/:id — delete own class (cascades to enrollments & attendance)
router.delete('/classes/:id', async (req, res) => {
  try {
    const classId = Number(req.params.id);
    if (!Number.isSafeInteger(classId) || classId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid class ID.' });
    }

    // WHERE clause includes faculty_id to guarantee ownership
    const [result] = await pool.execute(
      'DELETE FROM faculty_classes WHERE id = ? AND faculty_id = ?',
      [classId, req.faculty.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or you do not have permission to delete it.',
      });
    }

    res.json({ success: true, message: 'Class and all related data deleted.' });
  } catch (err) {
    console.error('[faculty/classes DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete class.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// STUDENT SEARCH (for enrollment UI)
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/faculty/students?q=searchTerm
// Returns active student accounts matching name or email (max 20 results).
router.get('/students', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();

    if (q.length < 2) {
      return res.json({ success: true, students: [] });
    }

    const like = `%${q}%`;
    const [students] = await pool.execute(
      `SELECT id, full_name, email
       FROM   users
       WHERE  role = 'student' AND account_status = 'active'
         AND  (full_name LIKE ? OR email LIKE ?)
       ORDER  BY full_name ASC
       LIMIT  20`,
      [like, like]
    );

    res.json({ success: true, students });
  } catch (err) {
    console.error('[faculty/students]', err.message);
    res.status(500).json({ success: false, message: 'Could not search students.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ENROLLMENTS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/faculty/classes/:classId/enrollments — list enrolled students
router.get('/classes/:classId/enrollments', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    if (!Number.isSafeInteger(classId) || classId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid class ID.' });
    }
    if (!(await assertOwnsClass(req.faculty.id, classId))) {
      return res.status(403).json({
        success: false, message: 'You do not have access to this class.',
      });
    }

    const [enrollments] = await pool.execute(
      `SELECT ce.id, ce.roll_number, u.id AS user_id, u.full_name, u.email
       FROM   class_enrollments ce
       JOIN   users u ON ce.student_user_id = u.id
       WHERE  ce.class_id = ?
       ORDER  BY u.full_name ASC`,
      [classId]
    );

    res.json({ success: true, enrollments });
  } catch (err) {
    console.error('[enrollments GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load enrollments.' });
  }
});

// POST /api/faculty/classes/:classId/enrollments — enroll a student (by real user account)
router.post('/classes/:classId/enrollments', async (req, res) => {
  try {
    const classId       = Number(req.params.classId);
    const studentUserId = Number(req.body.student_user_id);
    const rollNumber    = String(req.body.roll_number || '').trim() || null;

    if (!Number.isSafeInteger(classId) || classId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid class ID.' });
    }
    if (!Number.isSafeInteger(studentUserId) || studentUserId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid student user ID.' });
    }
    if (!(await assertOwnsClass(req.faculty.id, classId))) {
      return res.status(403).json({
        success: false, message: 'You do not have access to this class.',
      });
    }

    // Verify the student exists and is an active student
    const [students] = await pool.execute(
      `SELECT id, full_name FROM users
       WHERE  id = ? AND role = 'student' AND account_status = 'active' LIMIT 1`,
      [studentUserId]
    );
    if (students.length === 0) {
      return res.status(404).json({
        success: false, message: 'Student not found or account is not active.',
      });
    }

    await pool.execute(
      `INSERT INTO class_enrollments (class_id, student_user_id, roll_number)
       VALUES (?, ?, ?)`,
      [classId, studentUserId, rollNumber]
    );

    res.status(201).json({
      success: true,
      message: `${students[0].full_name} enrolled successfully.`,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false, message: 'This student is already enrolled in this class.',
      });
    }
    console.error('[enrollments POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not enroll student.' });
  }
});

// DELETE /api/faculty/enrollments/:id — remove a student from a class
router.delete('/enrollments/:id', async (req, res) => {
  try {
    const enrollmentId = Number(req.params.id);
    if (!Number.isSafeInteger(enrollmentId) || enrollmentId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid enrollment ID.' });
    }

    // JOIN ensures the class belongs to this faculty before deleting
    const [result] = await pool.execute(
      `DELETE ce FROM class_enrollments ce
       JOIN   faculty_classes fc ON ce.class_id = fc.id
       WHERE  ce.id = ? AND fc.faculty_id = ?`,
      [enrollmentId, req.faculty.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false, message: 'Enrollment not found or you do not have permission.',
      });
    }

    res.json({ success: true, message: 'Student removed from class.' });
  } catch (err) {
    console.error('[enrollments DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not remove enrollment.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/faculty/attendance/:classId/:date
// Returns all enrollments with their attendance status for the given date.
// Missing records default to 'absent'.
router.get('/attendance/:classId/:date', async (req, res) => {
  try {
    const classId = Number(req.params.classId);
    const date    = req.params.date;

    if (!Number.isSafeInteger(classId) || classId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid class ID.' });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ success: false, message: 'Invalid date. Use YYYY-MM-DD.' });
    }
    if (!(await assertOwnsClass(req.faculty.id, classId))) {
      return res.status(403).json({
        success: false, message: 'You do not have access to this class.',
      });
    }

    const [records] = await pool.execute(
      `SELECT ce.id AS enrollment_id,
              u.full_name, u.email, ce.roll_number,
              COALESCE(ar.status, 'absent') AS status
       FROM   class_enrollments ce
       JOIN   users u ON ce.student_user_id = u.id
       LEFT JOIN attendance_records ar
         ON   ar.enrollment_id = ce.id
         AND  ar.class_id      = ?
         AND  ar.date          = ?
       WHERE  ce.class_id = ?
       ORDER  BY u.full_name ASC`,
      [classId, date, classId]
    );

    res.json({ success: true, records, date, classId });
  } catch (err) {
    console.error('[attendance GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load attendance.' });
  }
});

// POST /api/faculty/attendance
// Body: { class_id, date, records: [{ enrollment_id, status }] }
// Uses a MySQL transaction so the entire batch succeeds or fails together.
router.post('/attendance', async (req, res) => {
  // Acquire a dedicated connection for the transaction
  const conn = await pool.getConnection();
  try {
    const classId = Number(req.body.class_id);
    const date    = String(req.body.date || '').trim();
    const records = req.body.records;

    if (!Number.isSafeInteger(classId) || classId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid class ID.' });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ success: false, message: 'Invalid date. Use YYYY-MM-DD.' });
    }
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Attendance records array is required.' });
    }
    if (!(await assertOwnsClass(req.faculty.id, classId))) {
      return res.status(403).json({
        success: false, message: 'You do not have access to this class.',
      });
    }

    const VALID_STATUSES = ['present', 'absent', 'late'];

    // Validate every record before opening the transaction
    for (const rec of records) {
      const eid = Number(rec.enrollment_id);
      if (!Number.isSafeInteger(eid) || eid <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid enrollment ID in records.' });
      }
      if (!VALID_STATUSES.includes(rec.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status "${rec.status}". Allowed: present, absent, late.`,
        });
      }
    }

    // Verify ALL enrollment IDs belong to this class (prevents cross-class tampering)
    const enrollmentIds  = records.map(r => Number(r.enrollment_id));
    const placeholders   = enrollmentIds.map(() => '?').join(',');
    const [validRows]    = await conn.execute(
      `SELECT id FROM class_enrollments
       WHERE  id IN (${placeholders}) AND class_id = ?`,
      [...enrollmentIds, classId]
    );
    if (validRows.length !== enrollmentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more enrollment IDs do not belong to this class.',
      });
    }

    // ── Transaction: upsert each attendance record ──
    await conn.beginTransaction();

    for (const rec of records) {
      await conn.execute(
        `INSERT INTO attendance_records
           (class_id, enrollment_id, date, status, marked_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status    = VALUES(status),
           marked_by = VALUES(marked_by)`,
        [classId, Number(rec.enrollment_id), date, rec.status, req.faculty.id]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: `Attendance saved for ${records.length} student(s) on ${date}.`,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('[attendance POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not save attendance.' });
  } finally {
    conn.release();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/faculty/assignments — list all assignments across faculty's classes
router.get('/assignments', async (req, res) => {
  try {
    const [assignments] = await pool.execute(
      `SELECT a.id, a.title, a.description, a.due_date, a.created_at,
              fc.id AS class_id, fc.subject_name
       FROM   assignments a
       JOIN   faculty_classes fc ON a.class_id = fc.id
       WHERE  a.faculty_id = ?
       ORDER  BY a.created_at DESC`,
      [req.faculty.id]
    );

    res.json({ success: true, assignments });
  } catch (err) {
    console.error('[assignments GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load assignments.' });
  }
});

// POST /api/faculty/assignments — create assignment in an owned class
router.post('/assignments', async (req, res) => {
  try {
    const classId     = Number(req.body.class_id);
    const title       = String(req.body.title       || '').trim();
    const description = String(req.body.description || '').trim() || null;
    const dueDate     = String(req.body.due_date     || '').trim() || null;

    if (!Number.isSafeInteger(classId) || classId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid class ID.' });
    }
    if (!title) {
      return res.status(400).json({ success: false, message: 'Assignment title is required.' });
    }
    if (title.length > 200) {
      return res.status(400).json({ success: false, message: 'Title must be 200 characters or fewer.' });
    }
    if (dueDate && !isValidDate(dueDate)) {
      return res.status(400).json({ success: false, message: 'Invalid due date. Use YYYY-MM-DD.' });
    }
    if (!(await assertOwnsClass(req.faculty.id, classId))) {
      return res.status(403).json({
        success: false, message: 'You do not have access to this class.',
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO assignments (class_id, faculty_id, title, description, due_date)
       VALUES (?, ?, ?, ?, ?)`,
      [classId, req.faculty.id, title, description, dueDate || null]
    );

    res.status(201).json({
      success: true, message: 'Assignment created.', assignmentId: result.insertId,
    });
  } catch (err) {
    console.error('[assignments POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not create assignment.' });
  }
});

// DELETE /api/faculty/assignments/:id — delete own assignment
router.delete('/assignments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid assignment ID.' });
    }

    const [result] = await pool.execute(
      'DELETE FROM assignments WHERE id = ? AND faculty_id = ?',
      [id, req.faculty.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false, message: 'Assignment not found or you do not have permission.',
      });
    }

    res.json({ success: true, message: 'Assignment deleted.' });
  } catch (err) {
    console.error('[assignments DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete assignment.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/faculty/announcements — list all announcements by this faculty
router.get('/announcements', async (req, res) => {
  try {
    const [announcements] = await pool.execute(
      `SELECT a.id, a.title, a.content, a.created_at, a.class_id,
              fc.subject_name
       FROM   announcements a
       LEFT JOIN faculty_classes fc ON a.class_id = fc.id
       WHERE  a.faculty_id = ?
       ORDER  BY a.created_at DESC`,
      [req.faculty.id]
    );

    res.json({ success: true, announcements });
  } catch (err) {
    console.error('[announcements GET]', err.message);
    res.status(500).json({ success: false, message: 'Could not load announcements.' });
  }
});

// POST /api/faculty/announcements — post an announcement (class_id is optional)
router.post('/announcements', async (req, res) => {
  try {
    const title      = String(req.body.title   || '').trim();
    const content    = String(req.body.content || '').trim();
    const rawClassId = req.body.class_id;
    const classId    = rawClassId ? Number(rawClassId) : null;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }
    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required.' });
    }
    if (title.length > 200) {
      return res.status(400).json({ success: false, message: 'Title must be 200 characters or fewer.' });
    }

    // If a class is specified, verify it belongs to this faculty
    if (classId !== null) {
      if (!Number.isSafeInteger(classId) || classId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid class ID.' });
      }
      if (!(await assertOwnsClass(req.faculty.id, classId))) {
        return res.status(403).json({
          success: false, message: 'You do not have access to this class.',
        });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO announcements (faculty_id, class_id, title, content)
       VALUES (?, ?, ?, ?)`,
      [req.faculty.id, classId, title, content]
    );

    res.status(201).json({
      success: true, message: 'Announcement posted.', announcementId: result.insertId,
    });
  } catch (err) {
    console.error('[announcements POST]', err.message);
    res.status(500).json({ success: false, message: 'Could not post announcement.' });
  }
});

// DELETE /api/faculty/announcements/:id — delete own announcement
router.delete('/announcements/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid announcement ID.' });
    }

    const [result] = await pool.execute(
      'DELETE FROM announcements WHERE id = ? AND faculty_id = ?',
      [id, req.faculty.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false, message: 'Announcement not found or you do not have permission.',
      });
    }

    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    console.error('[announcements DELETE]', err.message);
    res.status(500).json({ success: false, message: 'Could not delete announcement.' });
  }
});

module.exports = router;
