const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { sendMail } = require('../config/mailer');

const router = express.Router();

// Shared helper: computes { subtotal, discount, total } for a cart (+ optional package, + optional promo)
async function computeEstimate(conn, { cart_id, package_id, promo_code }) {
  const [cartRows] = await conn.query('SELECT price FROM coffee_carts WHERE id = ?', [cart_id]);
  if (cartRows.length === 0) throw new Error('CART_NOT_FOUND');
  let subtotal = Number(cartRows[0].price);

  if (package_id) {
    const [pkgRows] = await conn.query('SELECT price FROM packages WHERE id = ?', [package_id]);
    if (pkgRows.length > 0) subtotal += Number(pkgRows[0].price);
  }

  let discount = 0;
  let appliedCode = null;
  if (promo_code) {
    const [promoRows] = await conn.query(
      `SELECT * FROM promo_codes WHERE code = ? AND active = 1
       AND (expires_at IS NULL OR expires_at >= CURDATE())
       AND (max_uses IS NULL OR used_count < max_uses)`,
      [promo_code.toUpperCase()]
    );
    if (promoRows.length > 0) {
      const promo = promoRows[0];
      discount = promo.discount_type === 'percent' ? subtotal * (Number(promo.discount_value) / 100) : Number(promo.discount_value);
      discount = Math.min(discount, subtotal);
      appliedCode = promo.code;
    }
  }

  return { subtotal, discount, total: Math.max(subtotal - discount, 0), appliedCode };
}

// POST /api/bookings/estimate - live price preview while filling the booking form (no auth required)
router.post('/estimate', async (req, res) => {
  try {
    const estimate = await computeEstimate(pool, req.body);
    res.json(estimate);
  } catch (err) {
    if (err.message === 'CART_NOT_FOUND') return res.status(404).json({ error: 'Selected coffee cart could not be found.' });
    console.error(err);
    res.status(500).json({ error: 'Could not calculate an estimate.' });
  }
});

// POST /api/bookings - customer creates a booking request
router.post('/', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { cart_id, package_id, event_type, event_date, event_time, location, guests, message, payment_method, promo_code } = req.body;
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

    let estimate;
    try {
      estimate = await computeEstimate(conn, { cart_id, package_id, promo_code });
    } catch (err) {
      await conn.rollback();
      if (err.message === 'CART_NOT_FOUND') return res.status(404).json({ error: 'Selected coffee cart could not be found.' });
      throw err;
    }

    const [result] = await conn.query(
      `INSERT INTO bookings (user_id, cart_id, package_id, event_type, event_date, event_time, location, guests, message, status, promo_code, estimated_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [req.user.id, cart_id, package_id || null, event_type || null, event_date, event_time || null, location || null, guests || null, message || null, estimate.appliedCode, estimate.total]
    );

    // Create a matching payment record, marked Pending until the admin confirms it's been paid
    await conn.query(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_status)
       VALUES (?, ?, ?, 'Pending')`,
      [result.insertId, estimate.total, method]
    );

    // Count the promo code usage, if one was applied
    if (estimate.appliedCode) {
      await conn.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?', [estimate.appliedCode]);
    }

    await conn.commit();

    sendMail(
      req.user.email,
      'Booking request received — Amica House',
      `<p>Hi ${req.user.name},</p><p>We've received your booking request for <strong>${event_date}</strong>. We'll email you once it's approved. Estimated total: <strong>$${estimate.total.toFixed(2)}</strong>.</p>`
    );

    res.status(201).json({ id: result.insertId, message: 'Booking request submitted.', total: estimate.total });
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
      `SELECT b.*, c.cart_name, c.image, c.price, pk.name AS package_name,
              p.id AS payment_id, p.payment_method, p.payment_status, p.amount AS payment_amount
       FROM bookings b
       JOIN coffee_carts c ON b.cart_id = c.id
       LEFT JOIN packages pk ON b.package_id = pk.id
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

// PATCH /api/bookings/:id/reschedule - customer moves a Pending booking to a new date/time
router.patch('/:id/reschedule', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { event_date, event_time } = req.body;
    if (!event_date) return res.status(400).json({ error: 'A new event date is required.' });

    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [req.params.id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = rows[0];
    if (booking.user_id !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ error: 'You can only reschedule your own bookings.' });
    }
    if (booking.status !== 'Pending') {
      await conn.rollback();
      return res.status(400).json({ error: 'Only pending bookings can be rescheduled. Contact us for approved bookings.' });
    }

    const [clashes] = await conn.query(
      `SELECT id FROM bookings WHERE cart_id = ? AND event_date = ? AND status IN ('Pending','Approved') AND id != ? FOR UPDATE`,
      [booking.cart_id, event_date, req.params.id]
    );
    if (clashes.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'That cart is already booked on the new date. Try another date.' });
    }

    await conn.query('UPDATE bookings SET event_date = ?, event_time = ? WHERE id = ?', [event_date, event_time || null, req.params.id]);
    await conn.commit();
    res.json({ message: 'Booking rescheduled.' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Could not reschedule booking.' });
  } finally {
    conn.release();
  }
});

// GET /api/bookings/:id - a single booking (owner or admin only) - used by the receipt page
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, c.cart_name, c.image, c.price, pk.name AS package_name,
              u.name AS customer_name, u.email AS customer_email,
              p.payment_method, p.payment_status, p.amount AS payment_amount
       FROM bookings b
       JOIN coffee_carts c ON b.cart_id = c.id
       JOIN users u ON b.user_id = u.id
       LEFT JOIN packages pk ON b.package_id = pk.id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found.' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have access to this booking.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load this booking.' });
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

    const [rows] = await pool.query(
      `SELECT u.email, u.name, b.event_date FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.id = ?`,
      [req.params.id]
    );
    if (rows.length > 0) {
      sendMail(
        rows[0].email,
        `Your booking is now ${status} — Amica House`,
        `<p>Hi ${rows[0].name},</p><p>Your booking for <strong>${rows[0].event_date}</strong> has been marked as <strong>${status}</strong>.</p>`
      );
    }

    res.json({ message: `Booking marked as ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update booking status.' });
  }
});

module.exports = router;
