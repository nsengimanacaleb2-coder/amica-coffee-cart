const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

function formatCart(row) {
  return {
    ...row,
    equipment: row.equipment ? row.equipment.split(',').map((e) => e.trim()) : [],
  };
}

// GET /api/carts  - public list of all carts (with optional ?status=available filter)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status
      ? 'SELECT * FROM coffee_carts WHERE status = ? ORDER BY created_at DESC'
      : 'SELECT * FROM coffee_carts ORDER BY created_at DESC';
    const params = status ? [status] : [];
    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatCart));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load coffee carts.' });
  }
});

// GET /api/carts/:id - public single cart detail
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coffee_carts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cart not found.' });
    res.json(formatCart(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load this coffee cart.' });
  }
});

// GET /api/carts/:id/availability?date=YYYY-MM-DD - check if a cart is free on a date
router.get('/:id/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'A date query parameter is required.' });

    const [rows] = await pool.query(
      `SELECT id FROM bookings
       WHERE cart_id = ? AND event_date = ? AND status IN ('Pending', 'Approved')`,
      [req.params.id, date]
    );
    res.json({ available: rows.length === 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not check availability.' });
  }
});

// POST /api/carts - admin: add a new cart
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { cart_name, description, image, price, capacity, equipment, status } = req.body;
    if (!cart_name || !price) {
      return res.status(400).json({ error: 'Cart name and price are required.' });
    }
    const equipmentStr = Array.isArray(equipment) ? equipment.join(',') : equipment || '';

    const [result] = await pool.query(
      `INSERT INTO coffee_carts (cart_name, description, image, price, capacity, equipment, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cart_name, description || '', image || '', price, capacity || null, equipmentStr, status || 'available']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create coffee cart.' });
  }
});

// PUT /api/carts/:id - admin: edit a cart
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { cart_name, description, image, price, capacity, equipment, status } = req.body;
    const equipmentStr = Array.isArray(equipment) ? equipment.join(',') : equipment;

    await pool.query(
      `UPDATE coffee_carts SET
        cart_name = COALESCE(?, cart_name),
        description = COALESCE(?, description),
        image = COALESCE(?, image),
        price = COALESCE(?, price),
        capacity = COALESCE(?, capacity),
        equipment = COALESCE(?, equipment),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [cart_name, description, image, price, capacity, equipmentStr, status, req.params.id]
    );
    res.json({ message: 'Cart updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update coffee cart.' });
  }
});

// DELETE /api/carts/:id - admin: remove a cart
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM coffee_carts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cart removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete coffee cart.' });
  }
});

// GET /api/carts/:id/booked-dates?month=YYYY-MM - dates already reserved, for calendar display
router.get('/:id/booked-dates', async (req, res) => {
  try {
    const { month } = req.query; // e.g. "2026-08"
    let query = `SELECT event_date FROM bookings WHERE cart_id = ? AND status IN ('Pending', 'Approved')`;
    const params = [req.params.id];
    if (month) {
      query += ' AND DATE_FORMAT(event_date, "%Y-%m") = ?';
      params.push(month);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows.map((r) => r.event_date));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load booked dates.' });
  }
});

module.exports = router;
