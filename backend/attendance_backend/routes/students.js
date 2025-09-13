// attendance_backend/routes/students.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ---------- helpers ----------
function asNullishNumber(v) {
  if (v === "" || v === null || typeof v === "undefined") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asTrimOrNull(v) {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

// ---------- GET /students ----------
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT student_id, major_id, first_name, last_name, email,
              enrollment_date, status_id
         FROM students
        ORDER BY student_id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

// ---------- POST /students ----------
router.post("/", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      major_id,
      enrollment_date,
      status_id,
    } = req.body || {};

    if (!first_name?.trim() || !last_name?.trim()) {
      return res
        .status(400)
        .json({ message: "first_name and last_name are required" });
    }

    if (!enrollment_date) {
      return res.status(400).json({ message: "enrollment_date is required" });
    }

    if (status_id === undefined || status_id === null || status_id === "") {
      return res.status(400).json({ message: "status_id is required" });
    }

    const [result] = await db.query(
      `INSERT INTO students
        (first_name, last_name, email, major_id, enrollment_date,
         created_by, status_id)
       VALUES (?, ?, ?, ?, ?, 'Admin1', ?)`,
      [
        first_name.trim(),
        last_name.trim(),
        asTrimOrNull(email),
        asNullishNumber(major_id),
        enrollment_date,
        Number(status_id),
      ]
    );

    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error("POST /students error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Failed to add student" });
  }
});

// ---------- PUT /students/:id ----------
// NOTE: This ONLY updates the students table.
// Your AFTER UPDATE trigger is responsible for writing to students_log.
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const {
    first_name,
    last_name,
    email,
    major_id,
    enrollment_date,
    status_id,
  } = req.body || {};

  if (!first_name?.trim() || !last_name?.trim()) {
    return res
      .status(400)
      .json({ message: "first_name and last_name are required" });
  }

  if (!enrollment_date) {
    return res.status(400).json({ message: "enrollment_date is required" });
  }

  if (status_id === undefined || status_id === null || status_id === "") {
    return res.status(400).json({ message: "status_id is required" });
  }

  try {
    const [r] = await db.query(
      `UPDATE students
          SET first_name      = ?,
              last_name       = ?,
              email           = ?,
              major_id        = ?,
              enrollment_date = ?,
              status_id       = ?,
              modified_at     = NOW(),
              modified_by     = 'Admin1'
        WHERE student_id = ?`,
      [
        first_name.trim(),
        last_name.trim(),
        asTrimOrNull(email),
        asNullishNumber(major_id),
        enrollment_date,
        Number(status_id),
        id,
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    // Trigger will insert into students_log automatically.
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /students/:id error:", err);
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Failed to update student" });
  }
});

module.exports = router;
