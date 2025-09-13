// routes/lecture_days.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT lecture_days_id AS id, label FROM lecture_days ORDER BY lecture_days_id'
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /lecture-days error', e);
    res.status(500).json({ message: 'Failed to fetch lecture days' });
  }
});

module.exports = router;
