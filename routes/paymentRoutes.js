const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/payments - record a payment against a booking (admin, or customer for online payment later)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { booking_id, amount, payment_method, payment_status } = req.body;
    if (!booking_id || !amount) {
      return res.status(400).json({ error: 'booking_id and amount are required.' });
    }
    const [result] = await pool.query(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_status)
       VALUES (?, ?, ?, ?)`,
      [booking_id, amount, payment_method || 'cash', payment_status || 'Pending']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not record payment.' });
  }
});

// GET /api/payments - admin: view all payments
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, b.event_date, c.cart_name, u.name AS customer_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN coffee_carts c ON b.cart_id = c.id
       JOIN users u ON b.user_id = u.id
       ORDER BY p.date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load payments.' });
  }
});

// PATCH /api/payments/:id/status - admin: mark a payment as Paid / Refunded / Failed
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { payment_status } = req.body;
    const allowed = ['Pending', 'Paid', 'Refunded', 'Failed'];
    if (!allowed.includes(payment_status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }
    await pool.query('UPDATE payments SET payment_status = ? WHERE id = ?', [payment_status, req.params.id]);
    res.json({ message: `Payment marked as ${payment_status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update payment status.' });
  }
});

module.exports = router;
