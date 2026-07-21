const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

function formatPackage(row) {
  return { ...row, included_services: row.included_services ? row.included_services.split(',').map((s) => s.trim()) : [] };
}

// ---------- Packages ----------
router.get('/packages', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM packages ORDER BY price ASC');
    res.json(rows.map(formatPackage));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load packages.' });
  }
});

router.post('/packages', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, event_type, price, description, included_services, image } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required.' });
    const servicesStr = Array.isArray(included_services) ? included_services.join(',') : included_services || '';
    const [result] = await pool.query(
      `INSERT INTO packages (name, event_type, price, description, included_services, image) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, event_type || null, price, description || '', servicesStr, image || '']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create package.' });
  }
});

router.put('/packages/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, event_type, price, description, included_services, image } = req.body;
    const servicesStr = Array.isArray(included_services) ? included_services.join(',') : included_services;
    await pool.query(
      `UPDATE packages SET name=COALESCE(?,name), event_type=COALESCE(?,event_type), price=COALESCE(?,price),
       description=COALESCE(?,description), included_services=COALESCE(?,included_services), image=COALESCE(?,image)
       WHERE id = ?`,
      [name, event_type, price, description, servicesStr, image, req.params.id]
    );
    res.json({ message: 'Package updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update package.' });
  }
});

router.delete('/packages/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM packages WHERE id = ?', [req.params.id]);
    res.json({ message: 'Package removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete package.' });
  }
});

// ---------- Coffee menu ----------
router.get('/menu', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY category, price ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load the menu.' });
  }
});

router.post('/menu', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, category, description, price, image } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const [result] = await pool.query(
      `INSERT INTO menu_items (name, category, description, price, image) VALUES (?, ?, ?, ?, ?)`,
      [name, category || 'Drinks', description || '', price || null, image || '']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add menu item.' });
  }
});

router.delete('/menu/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Menu item removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not remove menu item.' });
  }
});

module.exports = router;
