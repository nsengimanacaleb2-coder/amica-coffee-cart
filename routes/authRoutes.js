const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// GET /api/auth/captcha - simple math challenge, no external CAPTCHA service/keys required.
// The answer is embedded in a short-lived signed token so the server doesn't need session storage.
router.get('/captcha', (req, res) => {
  const a = Math.floor(Math.random() * 8) + 1;
  const b = Math.floor(Math.random() * 8) + 1;
  const captchaToken = jwt.sign({ answer: a + b }, process.env.JWT_SECRET, { expiresIn: '10m' });
  res.json({ question: `${a} + ${b} = ?`, captchaToken });
});

function verifyCaptcha(captchaToken, answer) {
  try {
    const payload = jwt.verify(captchaToken, process.env.JWT_SECRET);
    return Number(payload.answer) === Number(answer);
  } catch {
    return false;
  }
}

// POST /api/auth/register  (customer sign-up)
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, captchaToken, captchaAnswer } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (!captchaToken || !verifyCaptcha(captchaToken, captchaAnswer)) {
      return res.status(400).json({ error: 'Captcha answer is incorrect. Please try again.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, "customer")',
      [name, email, phone || null, hashed]
    );

    const user = { id: result.insertId, name, email, role: 'customer' };
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login  (used by both customers and admin)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
