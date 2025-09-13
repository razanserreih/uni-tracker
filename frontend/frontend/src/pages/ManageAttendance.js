// src/pages/ManageAttendance.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ManageCourses.css"; // reuse the table/form styles

const api = axios.create({ baseURL: "http://127.0.0.1:4000" });

export default function ManageAttendance() {
  // default to today (YYYY-MM-DD)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [lectures, setLectures] = useState([]);
  const [lectureId, setLectureId] = useState("");

  const [roster, setRoster] = useState([]);
  const [loadingLectures, setLoadingLectures] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (date) fetchLectures(date);
  }, [date]);
  
  useEffect(() => {
    if (lectureId) fetchRoster(lectureId, date);
    else setRoster([]);
  }, [lectureId, date]);

  const fetchLectures = async (d) => {
    try {
      setLoadingLectures(true);
      // server: GET /attendance/lectures?date=YYYY-MM-DD
      const { data } = await api.get("/attendance/lectures", { params: { date: d } });
      setLectures(Array.isArray(data) ? data : []);
      // reset selected lecture when date changes
      setLectureId("");
    } catch (e) {
      console.error("lectures fetch failed:", e?.response?.data || e.message);
      setLectures([]);
    } finally {
      setLoadingLectures(false);
    }
  };

  const fetchRoster = async (lid, d) => {
    try {
      setLoadingRoster(true);
      // server: GET /attendance/roster?lecture_id=..&date=YYYY-MM-DD
      const { data } = await api.get("/attendance/roster", {
        params: { lecture_id: lid, date: d }
      });

      // normalize: if no mark yet, is_present is undefined (so radios start empty)
      const rows = (data?.students || []).map((s) => ({
        ...s,
        // DB returns 1/0 or null; keep as 1/0/undefined
        is_present:
          s.is_present === 1 ? 1 : s.is_present === 0 ? 0 : undefined,
        note: s.note || ""
      }));
      setRoster(rows);
    } catch (e) {
      console.error("roster fetch failed:", e?.response?.data || e.message);
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  const setMark = (student_id, value) => {
    setRoster((prev) =>
      prev.map((r) =>
        r.student_id === student_id ? { ...r, is_present: value } : r
      )
    );
  };

  const setNote = (student_id, note) => {
    setRoster((prev) =>
      prev.map((r) =>
        r.student_id === student_id ? { ...r, note } : r
      )
    );
  };

  const handleSave = async () => {
    if (!lectureId) return alert("Pick a lecture first.");
    if (!date) return alert("Pick a date.");

    try {
      setSaving(true);

      // only send rows that have a decision
      const marks = roster
        .filter((r) => r.is_present === 1 || r.is_present === 0)
        .map((r) => ({
          student_id: r.student_id,
          is_present: r.is_present === 1,
          note: r.note?.trim() ? r.note.trim() : null
        }));

      if (marks.length === 0) {
        alert("Nothing to save.");
        return;
      }

      // server: POST /attendance/mark  -> calls your proc_add_attendance
      const res = await api.post("/attendance/mark", {
        lecture_id: Number(lectureId),
        lecture_date: date,
        marks,
        actor: "Admin1"
      });

      alert(`Saved ${res.data?.count ?? marks.length} mark(s).`);
      // refetch to reflect DB state
      fetchRoster(lectureId, date);
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="manage-courses">
      <h2>🗓️ Manage Attendance</h2>

      <div className="course-form" style={{ gap: 12, flexWrap: "wrap" }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ minWidth: 180 }}
        />

        <select
          value={lectureId}
          onChange={(e) => setLectureId(e.target.value)}
          style={{ minWidth: 380 }}
        >
          <option value="">
            {loadingLectures ? "Loading lectures…" : "Select lecture"}
          </option>
          {lectures.map((l) => (
            <option key={l.lecture_id} value={l.lecture_id}>
              {l.course_name} • Sec {l.section} • {String(l.start_time).slice(0,5)}
              –{String(l.end_time).slice(0,5)} • {l.room}
            </option>
          ))}
        </select>

        <button type="button" onClick={handleSave} disabled={saving || !lectureId}>
          {saving ? "Saving…" : "Save Attendance"}
        </button>
      </div>

      {loadingRoster ? (
        <p className="muted">Loading roster…</p>
      ) : (
        <table className="course-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>ID</th>
              <th>Student</th>
              <th>Email</th>
              <th style={{ width: 140, textAlign: "center" }}>Present</th>
              <th style={{ width: 140, textAlign: "center" }}>Absent</th>
              <th style={{ width: 220 }}>Note (optional)</th>
            </tr>
          </thead>
          <tbody>
            {!lectureId ? (
              <tr>
                <td colSpan="6" className="muted center">
                  Pick a lecture to see students.
                </td>
              </tr>
            ) : roster.length === 0 ? (
              <tr>
                <td colSpan="6" className="muted center">
                  No enrolled students.
                </td>
              </tr>
            ) : (
              roster.map((r) => (
                <tr key={r.student_id}>
                  <td>{r.student_id}</td>
                  <td>{r.first_name} {r.last_name}</td>
                  <td>{r.email}</td>
                  <td className="center">
                    <input
                      type="radio"
                      name={`mark-${r.student_id}`}
                      checked={r.is_present === 1}
                      onChange={() => setMark(r.student_id, 1)}
                    />
                  </td>
                  <td className="center">
                    <input
                      type="radio"
                      name={`mark-${r.student_id}`}
                      checked={r.is_present === 0}
                      onChange={() => setMark(r.student_id, 0)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Late, excused, etc."
                      value={r.note || ""}
                      onChange={(e) => setNote(r.student_id, e.target.value)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
