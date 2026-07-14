const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/reviews - public: latest testimonials for the home page
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS customer_name
       FROM reviews r JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load reviews.' });
  }
});

// POST /api/reviews - customer leaves a review
router.post('/', requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    const [result] = await pool.query(
      'INSERT INTO reviews (user_id, rating, comment) VALUES (?, ?, ?)',
      [req.user.id, rating, comment || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not submit review.' });
  }
});

module.exports = router;
