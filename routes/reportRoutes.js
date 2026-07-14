const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/reports/summary - admin dashboard statistics
router.get('/summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[{ totalCarts }]] = await pool.query('SELECT COUNT(*) AS totalCarts FROM coffee_carts');
    const [[{ availableCarts }]] = await pool.query(
      `SELECT COUNT(*) AS availableCarts FROM coffee_carts WHERE status = 'available'`
    );
    const [[{ upcomingBookings }]] = await pool.query(
      `SELECT COUNT(*) AS upcomingBookings FROM bookings
       WHERE event_date >= CURDATE() AND status IN ('Pending', 'Approved')`
    );
    const [[{ totalCustomers }]] = await pool.query(
      `SELECT COUNT(*) AS totalCustomers FROM users WHERE role = 'customer'`
    );
    const [[{ totalRevenue }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM payments WHERE payment_status = 'Paid'`
    );

    res.json({ totalCarts, availableCarts, upcomingBookings, totalCustomers, totalRevenue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard statistics.' });
  }
});

module.exports = router;
