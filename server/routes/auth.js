
const express = require('express');
const crypto = require('node:crypto');
const pool = require('../config/db');

const router = express.Router();

// Temporary sessions for local development.
// Sessions expire after 8 hours and are cleared when the server restarts.
const sessions = new Map();
const SESSION_DURATION = 8 * 60 * 60 * 1000;

// Password hashing using Node.js built-in crypto.
function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) return reject(error);
      resolve(key.toString('hex'));
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const parts = storedHash.split(':');

    if (parts.length !== 2) {
      return resolve(false);
    }

    const [salt, savedHash] = parts;

    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) return reject(error);

      const savedBuffer = Buffer.from(savedHash, 'hex');
      const candidateBuffer = Buffer.from(key);

      if (savedBuffer.length !== candidateBuffer.length) {
        return resolve(false);
      }

      resolve(crypto.timingSafeEqual(savedBuffer, candidateBuffer));
    });
  });
}

function getSessionToken(req) {
  const cookies = req.headers.cookie || '';

  for (const cookie of cookies.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;

    const name = cookie.slice(0, separator).trim();

    if (name === 'unione_session') {
      return cookie.slice(separator + 1).trim();
    }
  }

  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setSessionCookie(res, token) {
  const secureFlag =
    process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `unione_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secureFlag}`
  );
}

function clearSessionCookie(res) {
  const secureFlag =
    process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `unione_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`
  );
}

// Check the logged-in session and verify the user's role in MySQL.
async function getAuthenticatedUser(req) {
  const token = getSessionToken(req);
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }

  const [users] = await pool.execute(
    `SELECT id, full_name, email, role, account_status
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [session.userId]
  );

  if (users.length === 0 || users[0].account_status !== 'active') {
    sessions.delete(token);
    return null;
  }

  return { ...users[0], token };
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    accountStatus: user.account_status
  };
}

// POST /api/auth/register
// Public registration creates active student accounts only.
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const first = String(firstName || '').trim();
    const last = String(lastName || '').trim();
    const fullName = `${first} ${last}`.trim();

    if (!first || !last || !normalizedEmail ||
        typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.'
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    const storedHash = `${salt}:${passwordHash}`;

    const [result] = await pool.execute(
      `INSERT INTO users
       (full_name, email, password_hash, role, account_status)
       VALUES (?, ?, ?, 'student', 'active')`,
      [fullName, normalizedEmail, storedHash]
    );

    return res.status(201).json({
      success: true,
      message: 'Your student account has been created successfully.',
      user: {
        id: result.insertId,
        fullName,
        email: normalizedEmail,
        role: 'student',
        accountStatus: 'active'
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    console.error('Registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// POST /api/auth/faculty-register
// Faculty can apply publicly, but their account remains pending.
router.post('/faculty-register', async (req, res) => {
  try {
    const facultyCode = String(req.body.facultyCode || '').trim();

    if (
    !process.env.FACULTY_REGISTRATION_CODE ||
    facultyCode !== process.env.FACULTY_REGISTRATION_CODE
    ) {
    return res.status(403).json({
        success: false,
        message: 'Invalid faculty registration code.'
    });
    }
    const { firstName, lastName, email, password } = req.body;

    const first = String(firstName || '').trim();
    const last = String(lastName || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const fullName = `${first} ${last}`.trim();

    if (!first || !last || !normalizedEmail ||
        typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.'
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    const storedHash = `${salt}:${passwordHash}`;

    const [result] = await pool.execute(
      `INSERT INTO users
       (full_name, email, password_hash, role, account_status)
       VALUES (?, ?, ?, 'faculty', 'active')`,
      [fullName, normalizedEmail, storedHash]
    );

    return res.status(201).json({
      success: true,
      message: 'Faculty account created successfully.',
      user: {
        id: result.insertId,
        fullName,
        email: normalizedEmail,
        role: 'faculty',
        accountStatus: 'active'
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    console.error('Faculty registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Faculty registration failed. Please try again.'
    });
  }
});

// POST /api/auth/login
// Pending/rejected faculty and inactive accounts cannot log in.
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email and password.'
      });
    }

    const [users] = await pool.execute(
      `SELECT id, full_name, email, password_hash, role, account_status
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];
    const passwordMatches = await verifyPassword(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.account_status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is awaiting admin approval.'
      });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact the administrator.'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');

    sessions.set(token, {
      userId: user.id,
      expiresAt: Date.now() + SESSION_DURATION
    });

    setSessionCookie(res, token);

    return res.json({
      success: true,
      message: 'Login successful.',
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// POST /api/auth/change-password — authenticated students change their own password
router.post('/change-password', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (user.role !== 'student') return res.status(403).json({ success: false, message: 'Student account required.' });
    const { current_password: currentPassword, new_password: newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({ success: false, message: 'Enter your current password and a new password.' });
    }
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'New password must contain at least 8 characters.' });
    if (currentPassword === newPassword) return res.status(400).json({ success: false, message: 'Choose a new password different from your current one.' });
    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id=? AND role=\'student\' LIMIT 1', [user.id]);
    if (!rows.length || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${await hashPassword(newPassword, salt)}`;
    await pool.execute('UPDATE users SET password_hash=? WHERE id=? AND role=\'student\'', [passwordHash, user.id]);
    for (const [token, session] of sessions) {
      if (session.userId === user.id) sessions.delete(token);
    }
    clearSessionCookie(res);
    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    console.error('Password change error:', err.message);
    res.status(500).json({ success: false, message: 'Could not change password.' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Please log in with an active account.'
      });
    }

    return res.json({
      success: true,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Session check error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not verify your session.'
    });
  }
});

// GET /api/auth/pending-faculty
// Only active admins can view applications.
router.get('/pending-faculty', async (req, res) => {
  try {
    const admin = await getAuthenticatedUser(req);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Please log in with an active admin account.'
      });
    }

    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view faculty applications.'
      });
    }

    const [faculty] = await pool.execute(
      `SELECT id, full_name, email, created_at
       FROM users
       WHERE role = 'faculty' AND account_status = 'pending'
       ORDER BY created_at ASC`
    );

    return res.json({
      success: true,
      faculty
    });
  } catch (error) {
    console.error('Pending faculty error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not load faculty applications.'
    });
  }
});

// PATCH /api/auth/faculty/:id/approve
router.patch('/faculty/:id/approve', async (req, res) => {
  try {
    const admin = await getAuthenticatedUser(req);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Please log in with an active admin account.'
      });
    }

    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can approve faculty.'
      });
    }

    const facultyId = Number(req.params.id);

    if (!Number.isSafeInteger(facultyId) || facultyId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty account ID.'
      });
    }

    const [result] = await pool.execute(
      `UPDATE users
       SET account_status = 'active'
       WHERE id = ? AND role = 'faculty' AND account_status = 'pending'`,
      [facultyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending faculty application not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Faculty application approved successfully.'
    });
  } catch (error) {
    console.error('Faculty approval error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not approve faculty application.'
    });
  }
});

// PATCH /api/auth/faculty/:id/reject
router.patch('/faculty/:id/reject', async (req, res) => {
  try {
    const admin = await getAuthenticatedUser(req);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Please log in with an active admin account.'
      });
    }

    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reject faculty.'
      });
    }

    const facultyId = Number(req.params.id);

    if (!Number.isSafeInteger(facultyId) || facultyId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty account ID.'
      });
    }

    const [result] = await pool.execute(
      `UPDATE users
       SET account_status = 'rejected'
       WHERE id = ? AND role = 'faculty' AND account_status = 'pending'`,
      [facultyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending faculty application not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Faculty application rejected.'
    });
  } catch (error) {
    console.error('Faculty rejection error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not reject faculty application.'
    });
  }
});

// POST /api/auth/create-user
// Only an active admin can create faculty/admin accounts.
router.post('/create-user', async (req, res) => {
  try {
    const admin = await getAuthenticatedUser(req);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Please log in with an active admin account.'
      });
    }

    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create these accounts.'
      });
    }

    const { email, password, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Accept either firstName/lastName or fullName from the frontend.
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const fullName = String(req.body.fullName || '').trim() ||
      `${firstName} ${lastName}`.trim();

    if (!fullName || !normalizedEmail ||
        typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.'
      });
    }

    if (!['faculty', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be faculty or admin.'
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    const storedHash = `${salt}:${passwordHash}`;

    const [result] = await pool.execute(
      `INSERT INTO users
       (full_name, email, password_hash, role, account_status)
       VALUES (?, ?, ?, ?, 'active')`,
      [fullName, normalizedEmail, storedHash, role]
    );

    return res.status(201).json({
      success: true,
      message: `${role === 'admin' ? 'Admin' : 'Faculty'} account created successfully.`,
      user: {
        id: result.insertId,
        fullName,
        email: normalizedEmail,
        role,
        accountStatus: 'active'
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    console.error('Create-user error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not create the account.'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = getSessionToken(req);

  if (token) sessions.delete(token);

  clearSessionCookie(res);

  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

module.exports = router;
// Exported so other route files (e.g. faculty.js) can reuse the same
// in-memory sessions Map and authentication logic without duplication.
module.exports.getAuthenticatedUser = getAuthenticatedUser;
