// routes/course_offerings.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET offerings by course_id
router.get('/', async (req, res) => {
  try {
    const { course_id } = req.query;
    if (!course_id) return res.status(400).json({ message: 'course_id is required' });

    const [rows] = await db.query(
      `SELECT offering_id, course_id, semester_id, section, capacity
       FROM course_offerings
       WHERE course_id = ?
       ORDER BY offering_id`,
      [Number(course_id)]
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /course-offerings error', e);
    res.status(500).json({ message: 'Failed to fetch offerings' });
  }
});

module.exports = router;
