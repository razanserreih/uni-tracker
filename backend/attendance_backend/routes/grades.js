// attendance_backend/routes/grades.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise pool (project2 DB)

/**
 * GET /grades/lectures?date=YYYY-MM-DD
 * Returns all lectures that actually meet on that calendar date.
 * Fixes: robust day-name matching for lookup.code values like "Sunday, Tuesday".
 */
router.get('/lectures', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: 'date is required (YYYY-MM-DD)' });
  }

  try {
    const sql = `
      SELECT
          l.lecture_id,
          l.offering_id,
          c.course_name,
          co.section,
          TIME_FORMAT(l.start_time, '%H:%i') AS start_time,
          TIME_FORMAT(l.end_time,   '%H:%i') AS end_time,
          l.room
      FROM project2.lectures l
      JOIN project2.course_offerings co ON co.offering_id = l.offering_id
      JOIN project2.courses         c  ON c.course_id     = co.course_id
      JOIN project2.semesters       se ON se.semester_id  = co.semester_id
      JOIN project2.lookup          lu ON lu.lookup_id    = l.lecture_days_id
      WHERE ? BETWEEN se.start_date AND se.end_date
        AND (
              -- exact one-day code match, e.g. "Thursday"
              lu.code = DATE_FORMAT(?, '%W')
              -- or day is contained in multi-day CSV like "Sunday, Tuesday"
              OR FIND_IN_SET(
                    DATE_FORMAT(?, '%W'),
                    REPLACE(lu.code, ', ', ',')
                 ) > 0
        )
      ORDER BY c.course_name, co.section, l.start_time;
    `;

    const [rows] = await db.query(sql, [date, date, date]);
    return res.json(rows);
  } catch (err) {
    console.error('GET /grades/lectures error:', err.code, err.message);
    return res.status(500).json({ message: 'Failed to fetch lectures' });
  }
});

/**
 * GET /grades/roster?lecture_id=...&type=Quiz|Assignment|Midterm|Final&label=Quiz%201
 * Returns all students enrolled in the lecture's offering, plus any existing grade for the given type+label.
 * Fixes: do not over-filter enrollment status; allow common statuses.
 */
router.get('/roster', async (req, res) => {
  const { lecture_id, type = 'Quiz', label = null } = req.query;
  if (!lecture_id) {
    return res.status(400).json({ message: 'lecture_id is required' });
  }

  try {
    // Resolve lecture → offering, course, semester
    const [lecRows] = await db.query(
      `
        SELECT l.offering_id, c.course_id, se.semester_name
        FROM project2.lectures l
        JOIN project2.course_offerings co ON co.offering_id = l.offering_id
        JOIN project2.courses c           ON c.course_id     = co.course_id
        JOIN project2.semesters se        ON se.semester_id  = co.semester_id
        WHERE l.lecture_id = ?
        LIMIT 1
      `,
      [lecture_id]
    );
    if (lecRows.length === 0) {
      return res.status(404).json({ message: 'Lecture not found' });
    }
    const { offering_id, course_id, semester_name } = lecRows[0];

    // Grade type id (case-insensitive)
    const [gtRows] = await db.query(
      `
        SELECT lookup_id
        FROM project2.lookup
        WHERE domain='grade_type' AND LOWER(code)=LOWER(?)
        LIMIT 1
      `,
      [type]
    );
    const gradeTypeId = gtRows[0]?.lookup_id || null;

    // Allow common enrollment statuses so we don't filter everyone out
    const [statusRows] = await db.query(
      `
        SELECT lookup_id
        FROM project2.lookup
        WHERE domain='enrollment_status'
          AND code IN ('Enrolled','Completed','Failed')
      `
    );
    const allowedStatusIds = statusRows.map(r => r.lookup_id);
    // If lookup table is empty for some reason, don't block results
    const statusFilter =
      allowedStatusIds.length > 0
        ? `AND (e.status_id IN (${allowedStatusIds.join(',')}) OR e.status_id IS NULL)`
        : '';

    // Roster + last saved grade (for requested type+label)
    const [roster] = await db.query(
      `
        SELECT
          s.student_id,
          s.first_name,
          s.last_name,
          s.email,
          (
            SELECT g.grade_value
            FROM project2.grades g
            WHERE g.enrollment_id = e.enrollment_id
              ${gradeTypeId ? 'AND g.grade_type_id = ?' : ''}
              AND (
                    (? IS NULL AND g.grade_label IS NULL)
                 OR  g.grade_label = ?
              )
            ORDER BY g.graded_at DESC
            LIMIT 1
          ) AS grade_value
        FROM project2.enrollments e
        JOIN project2.students s ON s.student_id = e.student_id
        WHERE e.offering_id = ?
        ${statusFilter}
        ORDER BY s.last_name, s.first_name
      `,
      gradeTypeId
        ? [gradeTypeId, label, label, offering_id]
        : [label, label, offering_id]
    );

    return res.json({
      offering_id,
      course_id,
      semester_name,
      students: roster,
    });
  } catch (err) {
    console.error('GET /grades/roster error:', err.code, err.message);
    return res.status(500).json({ message: 'Failed to fetch roster/grades' });
  }
});

/**
 * POST /grades/save
 * body: {
 *   lecture_id: number,
 *   type: 'Quiz'|'Assignment'|'Midterm'|'Final',
 *   label: string | null,
 *   graded_at?: 'YYYY-MM-DD',
 *   items: [{ student_id: number, grade_value: number }, ...]
 * }
 *
 * Uses your stored procs (proc_update_grade, proc_add_grade).
 * We first try update; if it reports "Grade not found...", we add instead.
 */
router.post('/save', async (req, res) => {
  const { lecture_id, type = 'Quiz', label = null, graded_at = null, items } = req.body || {};
  if (!lecture_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'lecture_id and items[] are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Resolve lecture context (course + semester) for procs
    const [[ctx]] = await conn.query(
      `
        SELECT c.course_id, se.semester_name
        FROM project2.lectures l
        JOIN project2.course_offerings co ON co.offering_id = l.offering_id
        JOIN project2.courses c           ON c.course_id     = co.course_id
        JOIN project2.semesters se        ON se.semester_id  = co.semester_id
        WHERE l.lecture_id = ?
        LIMIT 1
      `,
      [lecture_id]
    );
    if (!ctx) throw new Error('Lecture context not found');
    const { course_id, semester_name } = ctx;

    for (const it of items) {
      if (!it || typeof it.student_id === 'undefined') continue;

      // Try update first
      const [upd] = await conn.query(
        `CALL proc_update_grade(?,?,?,?,?,?,?);`,
        [
          Number(it.student_id),
          Number(course_id),
          semester_name,
          String(type),
          Number(it.grade_value ?? 0),
          graded_at, // may be null
          label,     // may be null
        ]
      );

      // The proc returns a resultset with a single row containing a msg
      const msg = Array.isArray(upd) && upd[0]?.[0]?.msg ? upd[0][0].msg : '';
      if (typeof msg === 'string' && msg.includes('Grade not found')) {
        // Add instead
        await conn.query(
          `CALL proc_add_grade(?,?,?,?,?,?,?);`,
          [
            Number(it.student_id),
            Number(course_id),
            semester_name,
            String(type),
            Number(it.grade_value ?? 0),
            graded_at, // may be null
            label,     // may be null
          ]
        );
      }
    }

    await conn.commit();
    return res.json({ ok: true, count: items.length });
  } catch (err) {
    await conn.rollback();
    console.error('POST /grades/save error:', err.message);
    return res.status(400).json({ message: err.message || 'Failed to save grades' });
  } finally {
    conn.release();
  }
});

module.exports = router;
