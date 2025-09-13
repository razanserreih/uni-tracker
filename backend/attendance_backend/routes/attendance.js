// attendance_backend/routes/attendance.js
'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise POOL

/* -----------------------------------------
   GET /attendance/lectures?date=YYYY-MM-DD
------------------------------------------ */
router.get('/lectures', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'date is required (YYYY-MM-DD)' });

  try {
    const sql = `
      SELECT
        l.lecture_id,
        l.offering_id,
        c.course_name,
        co.section,
        l.start_time,
        l.end_time,
        l.room
      FROM project2.lectures l
      JOIN project2.course_offerings co ON co.offering_id = l.offering_id
      JOIN project2.courses c          ON c.course_id     = co.course_id
      JOIN project2.semesters se       ON se.semester_id  = co.semester_id
      JOIN project2.lookup lu          ON lu.lookup_id    = l.lecture_days_id
      WHERE ? BETWEEN se.start_date AND se.end_date
        AND (
             lu.code = DATE_FORMAT(?, '%W')
          OR CONCAT(',', REPLACE(lu.code, ' ', ''), ',')
             LIKE CONCAT('%,', REPLACE(DATE_FORMAT(?, '%W'), ' ', ''), ',%')
        )
      ORDER BY c.course_name, co.section, l.start_time
    `;
    const [rows] = await db.query(sql, [date, date, date]);
    res.json(rows);
  } catch (e) {
    console.error('GET /attendance/lectures error:', e.code, e.message);
    res.status(500).json({ message: 'Failed to fetch lectures' });
  }
});

/* ------------------------------------------------------------
   GET /attendance/roster?lecture_id=123&date=YYYY-MM-DD
   Shows students enrolled in that lecture’s offering.
   Attendance for that date (if any) is left-joined.
------------------------------------------------------------- */
router.get('/roster', async (req, res) => {
  const lectureId = parseInt(req.query.lecture_id, 10);
  const date = req.query.date || null;

  if (!lectureId) {
    return res.status(400).json({ message: 'lecture_id is required' });
  }

  try {
    const sql = `
      SELECT
        s.student_id,
        s.first_name,
        s.last_name,
        s.email,
        a.is_present,
        NULL AS note   -- your attendance table has no 'note' column; keep API shape stable
      FROM project2.lectures l
      JOIN project2.enrollments e
        ON e.offering_id = l.offering_id
      JOIN project2.students s
        ON s.student_id = e.student_id
      LEFT JOIN project2.attendance a
        ON a.enrollment_id = e.enrollment_id
       AND a.lecture_id    = l.lecture_id
       AND ( ? IS NULL OR a.lecture_date = ? )
      WHERE l.lecture_id = ?
      ORDER BY s.last_name, s.first_name
    `;
    const params = [date, date, lectureId];
    const [rows] = await db.query(sql, params);
    res.json({ offering_id: null, students: rows });
  } catch (e) {
    console.error('GET /attendance/roster error:', e.code, e.message);
    res.status(500).json({ message: 'Failed to fetch roster' });
  }
});

/* ---------------------------------------------------------
   POST /attendance/mark
   body: {
     lecture_id,
     lecture_date,            // 'YYYY-MM-DD'
     marks: [{ student_id, is_present: boolean, note? }],
     actor?                   // default 'Admin1'
   }
   Your proc doesn’t accept a note, so we ignore it.
---------------------------------------------------------- */
router.post('/mark', async (req, res) => {
  const { lecture_id, lecture_date, marks, actor } = req.body || {};
  if (!lecture_id || !lecture_date || !Array.isArray(marks)) {
    return res
      .status(400)
      .json({ message: 'lecture_id, lecture_date and marks[] are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (const m of marks) {
      if (!m?.student_id || typeof m?.is_present === 'undefined') continue;

      try {
        await conn.query('CALL proc_add_attendance(?,?,?,?,?)', [
          Number(m.student_id),
          Number(lecture_id),
          lecture_date,
          m.is_present ? 1 : 0,
          actor || 'Admin1'
        ]);
      } catch (err) {
        if (err && (err.errno === 1644 || err.sqlState === '45000')) {
          throw new Error(`Student ${m.student_id}: ${err.sqlMessage || err.message}`);
        }
        throw err;
      }
    }

    await conn.commit();
    res.json({ ok: true, count: marks.length });
  } catch (e) {
    await conn.rollback();
    console.error('POST /attendance/mark error:', e.message);
    res.status(400).json({ message: e.message || 'Failed to save attendance' });
  } finally {
    conn.release();
  }
});

module.exports = router;
