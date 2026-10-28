
const express = require('express');
const crypto = require('node:crypto');
const pool = require('../config/db');
// Temporary server-side sessions for local development.
// Sessions expire after 8 hours and are cleared when the server restarts.
const sessions = new Map();
const SESSION_DURATION = 8 * 60 * 60 * 1000;

const router = express.Router();

// Hash passwords using Node.js built-in crypto.
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

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!firstName?.trim() || !lastName?.trim() ||
        !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
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

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    const storedHash = `${salt}:${passwordHash}`;

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, 'student')`,
      [fullName, normalizedEmail, storedHash]
    );

    return res.status(201).json({
      success: true,
      message: 'Your student account has been created successfully.',
      user: {
        id: result.insertId,
        fullName,
        email: normalizedEmail,
        role: 'student'
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

// POST /api/auth/login
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
      `SELECT id, full_name, email, password_hash, role
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

    // Create an unpredictable, opaque session token.
    const token = crypto.randomBytes(32).toString('hex');

    sessions.set(token, {
      userId: user.id,
      expiresAt: Date.now() + SESSION_DURATION
    });

    // Never expose the session token to JavaScript.
    const secureFlag =
      process.env.NODE_ENV === 'production' ? '; Secure' : '';

    res.setHeader(
      'Set-Cookie',
      `unione_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secureFlag}`
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// GET /api/auth/me — identify the currently logged-in user
router.get('/me', async (req, res) => {
  const token = getSessionToken(req);
  const session = token ? sessions.get(token) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);

    return res.status(401).json({
      success: false,
      message: 'Please log in.'
    });
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [session.userId]
    );

    if (users.length === 0) {
      sessions.delete(token);
      return res.status(401).json({
        success: false,
        message: 'Account not found.'
      });
    }

    const user = users[0];

    return res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Session check error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Could not verify your session.'
    });
  }
});

// POST /api/auth/create-user
// Only an authenticated admin can create faculty/admin accounts.
router.post('/create-user', async (req, res) => {
  try {
    // 1. Verify the current session.
    const token = getSessionToken(req);
    const session = token ? sessions.get(token) : null;

    if (!session || session.expiresAt <= Date.now()) {
      if (token) sessions.delete(token);

      return res.status(401).json({
        success: false,
        message: 'Please log in as an admin.'
      });
    }

    // 2. Check the role directly in MySQL.
    const [admins] = await pool.execute(
      'SELECT id, role FROM users WHERE id = ? LIMIT 1',
      [session.userId]
    );

    if (admins.length === 0 || admins[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only an admin can create these accounts.'
      });
    }

    // 3. Read and validate the new account details.
    const {
      firstName,
      lastName,
      email,
      password,
      role
    } = req.body;

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    const fullName =
      `${firstName || ''} ${lastName || ''}`.trim();

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !normalizedEmail ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
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

    // Public registration remains student-only.
    // This admin endpoint accepts faculty or admin only.
    if (!['faculty', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be faculty or admin.'
      });
    }

    // 4. Hash the password using the existing helper.
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    const storedHash = `${salt}:${passwordHash}`;

    // 5. Save the account in MySQL.
    const [result] = await pool.execute(
      `INSERT INTO users
        (full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [fullName, normalizedEmail, storedHash, role]
    );

    return res.status(201).json({
      success: true,
      message: `${role === 'admin' ? 'Admin' : 'Faculty'} account created successfully.`,
      user: {
        id: result.insertId,
        fullName,
        email: normalizedEmail,
        role
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

  const secureFlag =
    process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `unione_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`
  );

  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});


module.exports = router;
