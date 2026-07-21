const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/reports/public-stats - safe-to-show numbers for the homepage stats section
router.get('/public-stats', async (req, res) => {
  try {
    const [[{ eventsServed }]] = await pool.query(
      `SELECT COUNT(*) AS eventsServed FROM bookings WHERE status = 'Completed'`
    );
    const [[{ totalCarts }]] = await pool.query('SELECT COUNT(*) AS totalCarts FROM coffee_carts');
    const [[{ happyCustomers }]] = await pool.query(`SELECT COUNT(*) AS happyCustomers FROM users WHERE role = 'customer'`);
    const [[{ avgRating }]] = await pool.query(`SELECT COALESCE(AVG(rating), 5) AS avgRating FROM reviews`);
    res.json({
      eventsServed,
      totalCarts,
      happyCustomers,
      avgRating: Number(avgRating).toFixed(1),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load statistics.' });
  }
});

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

// ---- Deeper analytics for the admin charts (registered on the same router) ----

// GET /api/reports/revenue-by-month - last 6 months of paid revenue
router.get('/revenue-by-month', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(date, '%Y-%m') AS month, SUM(amount) AS revenue
       FROM payments WHERE payment_status = 'Paid'
       AND date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load revenue data.' });
  }
});

// GET /api/reports/popular-event-types - booking counts grouped by event type
router.get('/popular-event-types', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COALESCE(event_type, 'Unspecified') AS event_type, COUNT(*) AS total
       FROM bookings GROUP BY event_type ORDER BY total DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load event type breakdown.' });
  }
});

module.exports = router;
