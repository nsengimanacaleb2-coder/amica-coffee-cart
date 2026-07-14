const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users/me - the logged-in user's profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load profile.' });
  }
});

// PUT /api/users/me - update own profile (name / phone)
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
      [name, phone, req.user.id]
    );
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

// ---- Admin: customer management ----

// GET /api/users - admin: list all customers
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load customers.' });
  }
});

// DELETE /api/users/:id - admin: remove a customer account
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ? AND role = "customer"', [req.params.id]);
    res.json({ message: 'Customer removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not remove customer.' });
  }
});

module.exports = router;
