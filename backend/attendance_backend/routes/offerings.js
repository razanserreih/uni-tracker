// attendance_backend/routes/offerings.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ---------- GET /offerings/pick
// Semesters + Courses for dropdowns
router.get("/pick", async (_req, res) => {
  try {
    const [semesters] = await db.query(
      `SELECT semester_id, semester_name AS name, start_date, end_date
         FROM semesters
        ORDER BY start_date DESC, semester_id DESC`
    );
    const [courses] = await db.query(
      `SELECT course_id, course_name AS name
         FROM courses
        ORDER BY course_name`
    );
    res.json({ semesters, courses });
  } catch (err) {
    console.error("GET /offerings/pick error:", err);
    res.status(500).json({ message: "Failed to load pick lists" });
  }
});

// ---------- GET /offerings
// List offerings with optional filters: semester_id, course_id
router.get("/", async (req, res) => {
  const { semester_id, course_id } = req.query;

  const where = [];
  const params = [];
  if (semester_id) { where.push("co.semester_id = ?"); params.push(Number(semester_id)); }
  if (course_id)   { where.push("co.course_id = ?");   params.push(Number(course_id));   }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const [rows] = await db.query(
      `
      SELECT
        co.offering_id,
        c.course_id, c.course_name,
        co.section,
        co.capacity,
        se.semester_id, se.semester_name,
        IFNULL(enr.cnt, 0) AS enrolled
      FROM course_offerings co
      JOIN courses   c  ON c.course_id = co.course_id
      JOIN semesters se ON se.semester_id = co.semester_id
      LEFT JOIN (
        SELECT offering_id, COUNT(*) AS cnt
          FROM enrollments
         GROUP BY offering_id
      ) enr ON enr.offering_id = co.offering_id
      ${whereSql}
      ORDER BY se.start_date DESC, c.course_name, co.section
      `,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /offerings error:", err);
    res.status(500).json({ message: "Failed to load offerings" });
  }
});

// ---------- POST /offerings
// body: { course_id, semester_id, section, capacity }
router.post("/", async (req, res) => {
  const { course_id, semester_id, section, capacity } = req.body || {};
  if (!course_id || !semester_id || !section)
    return res.status(400).json({ message: "course_id, semester_id and section are required" });

  try {
    const [r] = await db.query(
      `INSERT INTO course_offerings (course_id, semester_id, section, capacity)
       VALUES (?, ?, ?, ?)`,
      [Number(course_id), Number(semester_id), String(section).trim(), capacity ? Number(capacity) : 50]
    );
    res.json({ ok: true, offering_id: r.insertId });
  } catch (err) {
    console.error("POST /offerings error:", err);
    res.status(500).json({ message: "Failed to add offering" });
  }
});

// ---------- PUT /offerings/:id
// body: { section?, capacity? }
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

  const { section, capacity } = req.body || {};
  try {
    const [r] = await db.query(
      `UPDATE course_offerings
          SET section = COALESCE(?, section),
              capacity = COALESCE(?, capacity)
        WHERE offering_id = ?`,
      [section ? String(section).trim() : null, capacity != null ? Number(capacity) : null, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /offerings/:id error:", err);
    res.status(500).json({ message: "Failed to update offering" });
  }
});

// ---------- DELETE /offerings/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

  try {
    const [r] = await db.query(`DELETE FROM course_offerings WHERE offering_id = ?`, [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /offerings/:id error:", err);
    // foreign key protections may block delete if there are enrollments/lectures – bubble a clean msg
    res.status(400).json({ message: "Cannot delete (has related rows)" });
  }
});

module.exports = router;
