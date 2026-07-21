const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { stripeEnabled, createStripeCheckoutSession } = require('../config/payments');

const router = express.Router();

// POST /api/payments/checkout/:bookingId - starts a Stripe Checkout session for online card payment
router.post('/checkout/:bookingId', requireAuth, async (req, res) => {
  try {
    if (!stripeEnabled) {
      return res.status(503).json({ error: 'Online card payments are not configured yet. Add STRIPE_SECRET_KEY to the server .env file.' });
    }
    const [rows] = await pool.query(
      `SELECT b.id, b.user_id, p.amount, c.cart_name FROM bookings b
       JOIN coffee_carts c ON b.cart_id = c.id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.id = ?`,
      [req.params.bookingId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'This is not your booking.' });

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const url = await createStripeCheckoutSession({
      bookingId: rows[0].id,
      amount: rows[0].amount,
      description: `Amica House — ${rows[0].cart_name}`,
      successUrl: `${origin}/dashboard-customer.html?payment=success&booking=${rows[0].id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/dashboard-customer.html?payment=cancelled`,
    });
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Could not start checkout.' });
  }
});

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

// GET /api/payments/confirm/:bookingId?session_id=... - verifies a completed Stripe session and marks payment Paid
// (Simpler than a webhook for a small project — no separate raw-body route needed.)
router.get('/confirm/:bookingId', requireAuth, async (req, res) => {
  try {
    if (!stripeEnabled) return res.status(503).json({ error: 'Stripe is not configured.' });
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id.' });

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid' && String(session.metadata.booking_id) === String(req.params.bookingId)) {
      await pool.query('UPDATE payments SET payment_status = "Paid" WHERE booking_id = ?', [req.params.bookingId]);
      return res.json({ confirmed: true });
    }
    res.json({ confirmed: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not confirm payment.' });
  }
});
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
