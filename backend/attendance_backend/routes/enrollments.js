const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const sql = `
    SELECT e.enrollment_id, s.first_name, s.last_name, c.course_name, se.semester_name
    FROM enrollments e
    JOIN students s ON s.student_id = e.student_id
    JOIN course_offerings co ON co.offering_id = e.offering_id
    JOIN courses c ON c.course_id = co.course_id
    JOIN semesters se ON se.semester_id = co.semester_id
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

module.exports = router;
