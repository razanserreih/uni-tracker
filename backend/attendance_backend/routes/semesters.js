const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /semesters
router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT semester_id, semester_name, start_date, end_date
         FROM semesters
        ORDER BY start_date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /semesters error:", err);
    res.status(500).json({ message: "Failed to fetch semesters" });
  }
});

module.exports = router;
