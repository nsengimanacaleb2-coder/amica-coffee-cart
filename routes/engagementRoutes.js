const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ---------- Favorites ----------
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.* FROM favorites f JOIN coffee_carts c ON f.cart_id = c.id WHERE f.user_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load favorites.' });
  }
});

// POST /api/favorites/:cartId - toggle a favorite on/off, returns the new state
router.post('/favorites/:cartId', requireAuth, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM favorites WHERE user_id = ? AND cart_id = ?', [req.user.id, req.params.cartId]);
    if (existing.length > 0) {
      await pool.query('DELETE FROM favorites WHERE id = ?', [existing[0].id]);
      return res.json({ favorited: false });
    }
    await pool.query('INSERT INTO favorites (user_id, cart_id) VALUES (?, ?)', [req.user.id, req.params.cartId]);
    res.json({ favorited: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update favorite.' });
  }
});

// ---------- Promo codes ----------
// POST /api/promo/validate - check a code and return the discount details
router.post('/promo/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Enter a promo code.' });

    const [rows] = await pool.query(
      `SELECT * FROM promo_codes WHERE code = ? AND active = 1
       AND (expires_at IS NULL OR expires_at >= CURDATE())
       AND (max_uses IS NULL OR used_count < max_uses)`,
      [code.toUpperCase()]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'This promo code is invalid or has expired.' });

    const promo = rows[0];
    res.json({ code: promo.code, discount_type: promo.discount_type, discount_value: Number(promo.discount_value) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not validate promo code.' });
  }
});

// Admin: list / create promo codes
router.get('/promo', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load promo codes.' });
  }
});

router.post('/promo', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { code, discount_type, discount_value, max_uses, expires_at } = req.body;
    if (!code || !discount_value) return res.status(400).json({ error: 'Code and discount value are required.' });
    await pool.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [code.toUpperCase(), discount_type || 'percent', discount_value, max_uses || null, expires_at || null]
    );
    res.status(201).json({ message: 'Promo code created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create promo code (it may already exist).' });
  }
});

router.delete('/promo/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE promo_codes SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Promo code deactivated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not deactivate promo code.' });
  }
});

// ---------- Newsletter ----------
router.post('/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    await pool.query('INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)', [email]);
    res.status(201).json({ message: 'Subscribed! Thanks for joining.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not subscribe right now.' });
  }
});

router.get('/newsletter', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load subscribers.' });
  }
});

module.exports = router;
