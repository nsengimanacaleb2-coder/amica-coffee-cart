const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/bookings - customer creates a booking request
router.post('/', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { cart_id, event_type, event_date, event_time, location, guests, message, payment_method } = req.body;
    if (!cart_id || !event_date) {
      return res.status(400).json({ error: 'A coffee cart and event date are required.' });
    }
    const allowedMethods = ['Cash', 'Mobile Money', 'Bank Transfer'];
    const method = allowedMethods.includes(payment_method) ? payment_method : 'Cash';

    await conn.beginTransaction();

    // Lock and check for an existing active booking on the same cart + date to prevent double booking
    const [clashes] = await conn.query(
      `SELECT id FROM bookings
       WHERE cart_id = ? AND event_date = ? AND status IN ('Pending', 'Approved')
       FOR UPDATE`,
      [cart_id, event_date]
    );
    if (clashes.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'This coffee cart is already booked for that date.' });
    }

    const [cartRows] = await conn.query('SELECT price FROM coffee_carts WHERE id = ?', [cart_id]);
    if (cartRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Selected coffee cart could not be found.' });
    }

    const [result] = await conn.query(
      `INSERT INTO bookings (user_id, cart_id, event_type, event_date, event_time, location, guests, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [req.user.id, cart_id, event_type || null, event_date, event_time || null, location || null, guests || null, message || null]
    );

    // Create a matching payment record, marked Pending until the admin confirms it's been paid
    await conn.query(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_status)
       VALUES (?, ?, ?, 'Pending')`,
      [result.insertId, cartRows[0].price, method]
    );

    await conn.commit();
    res.status(201).json({ id: result.insertId, message: 'Booking request submitted.' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Could not submit booking request.' });
  } finally {
    conn.release();
  }
});

// GET /api/bookings/me - customer: view their own bookings
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, c.cart_name, c.image, c.price,
              p.id AS payment_id, p.payment_method, p.payment_status, p.amount AS payment_amount
       FROM bookings b
       JOIN coffee_carts c ON b.cart_id = c.id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load your bookings.' });
  }
});

// PATCH /api/bookings/:id/cancel - customer cancels their own pending/approved booking
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found.' });
    if (rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own bookings.' });
    }
    await pool.query('UPDATE bookings SET status = "Cancelled" WHERE id = ?', [req.params.id]);
    res.json({ message: 'Booking cancelled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not cancel booking.' });
  }
});

// ---- Admin routes ----

// GET /api/bookings - admin: view all bookings (optional ?status= filter)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status
      ? `SELECT b.*, c.cart_name, u.name AS customer_name, u.email AS customer_email,
                p.id AS payment_id, p.payment_method, p.payment_status, p.amount AS payment_amount
         FROM bookings b
         JOIN coffee_carts c ON b.cart_id = c.id
         JOIN users u ON b.user_id = u.id
         LEFT JOIN payments p ON p.booking_id = b.id
         WHERE b.status = ? ORDER BY b.event_date ASC`
      : `SELECT b.*, c.cart_name, u.name AS customer_name, u.email AS customer_email,
                p.id AS payment_id, p.payment_method, p.payment_status, p.amount AS payment_amount
         FROM bookings b
         JOIN coffee_carts c ON b.cart_id = c.id
         JOIN users u ON b.user_id = u.id
         LEFT JOIN payments p ON p.booking_id = b.id
         ORDER BY b.event_date ASC`;
    const [rows] = await pool.query(query, status ? [status] : []);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load bookings.' });
  }
});

// PATCH /api/bookings/:id/status - admin: approve / reject / complete a booking
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `Booking marked as ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update booking status.' });
  }
});

module.exports = router;
