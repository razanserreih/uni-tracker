// attendance_backend/routes/courses.js
const express = require("express");
const router = express.Router();
const db = require("../db"); // mysql2/promise connection or pool

// GET /courses
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        course_id,
        course_name,
        department,
        max_absence_allowed,
        absence_warning_threshold,
        course_status_id
      FROM project2.courses
      ORDER BY course_id DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

// POST /courses  (create)
router.post("/", async (req, res) => {
  const {
    course_name,
    department,
    max_absence_allowed,
    absence_warning_threshold,
    course_status_id
  } = req.body || {};

  // basic validation (the UI also validates)
  if (!course_name || course_status_id == null) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await db.query(
      `
      INSERT INTO project2.courses
        (course_name, department, max_absence_allowed, absence_warning_threshold, course_status_id)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        course_name.trim(),
        (department || "").trim(),
        Number(max_absence_allowed),
        Number(absence_warning_threshold),
        Number(course_status_id),
      ]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to add course" });
  }
});

// PUT /courses/:id  (update)
// PUT /courses/:id  (update)
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {
    course_name,
    department,
    max_absence_allowed,
    absence_warning_threshold,
    course_status_id,
  } = req.body || {};

  if (!id || !course_name || course_status_id == null) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // 1) Does the course exist?
    const [[exists]] = await db.query(
      `SELECT 1 AS ok FROM project2.courses WHERE course_id = ? LIMIT 1`,
      [id]
    );
    if (!exists?.ok) return res.status(404).json({ message: "Course not found" });

    // 2) Perform the update
    const [r] = await db.query(
      `
      UPDATE project2.courses
         SET course_name = ?,
             department = ?,
             max_absence_allowed = ?,
             absence_warning_threshold = ?,
             course_status_id = ?
       WHERE course_id = ?
      `,
      [
        course_name.trim(),
        (department || "").trim(),
        Number(max_absence_allowed),
        Number(absence_warning_threshold),
        Number(course_status_id),
        id,
      ]
    );

    // If values are identical, MySQL reports affectedRows=0, changedRows=0.
    // That’s still a valid request—return OK.
    return res.json({
      ok: true,
      changedRows: r.changedRows ?? 0,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to update course" });
  }
});


// DELETE /courses/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  try {
    const [r] = await db.query(`DELETE FROM project2.courses WHERE course_id = ?`, [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Course not found" });
    res.json({ ok: true });
  } catch (e) {
    // most common failure: FK constraints if offerings/enrollments reference the course
    console.error(e);
    res.status(409).json({
      message:
        "Unable to delete this course because it is referenced by other records (offerings, enrollments, etc.).",
    });
  }
});

module.exports = router;
