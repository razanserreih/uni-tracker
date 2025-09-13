// attendance_backend/routes/lookup.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ message: 'domain is required' });

  try {
    const [rows] = await db.query(
      `SELECT lookup_id AS id, code AS name
         FROM project2.lookup
        WHERE domain = ? AND is_active = 1
        ORDER BY sort_order, lookup_id`,
      [domain]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /lookup error:', e.code, e.message);
    res.status(500).json({ message: 'Failed to fetch lookup values' });
  }
});

module.exports = router;
