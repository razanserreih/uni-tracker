// src/pages/ManageGrades.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ManageGrades.css";

const api = axios.create({ baseURL: "http://127.0.0.1:4000" });

const types = [
  { v: "Quiz", label: "Quiz" },
  { v: "Assignment", label: "Assignment" },
  { v: "Midterm Exam", label: "Midterm Exam" },
  { v: "Final Exam", label: "Final Exam" },
];

function ymd(date) {
  if (typeof date === "string") return date;
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ManageGrades() {
  const [date, setDate] = useState(() => ymd(new Date(2025, 1, 9)));
  const [lectures, setLectures] = useState([]);
  const [lectureId, setLectureId] = useState("");
  const [gradeType, setGradeType] = useState("Quiz");
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState([]); // [{student_id, first_name,last_name,email, grade_value, _orig}]
  const [loadingLectures, setLoadingLectures] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);

  // Human title under the filters
  const lectureTitle = useMemo(() => {
    const l = lectures.find((x) => String(x.lecture_id) === String(lectureId));
    if (!l) return "";
    const time = `${String(l.start_time).slice(0, 5)}–${String(l.end_time).slice(0, 5)}`;
    return `${l.course_name} • Sec ${l.section} • ${time} • ${l.room}`;
  }, [lectures, lectureId]);

  // Load lectures on date change
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoadingLectures(true);
        setLectures([]);
        setLectureId("");
        const { data } = await api.get("/grades/lectures", { params: { date } });
        if (cancelled) return;
        setLectures(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length) {
          setLectureId(String(data[0].lecture_id));
        }
      } catch (err) {
        alert("Failed to load lectures.");
        console.error(err);
      } finally {
        if (!cancelled) setLoadingLectures(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Load roster (with existing grades) whenever lecture/type/label changes
  useEffect(() => {
    if (!lectureId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    async function run() {
      try {
        setLoadingRoster(true);
        const { data } = await api.get("/grades/roster", {
          params: {
            lecture_id: lectureId,
            type: gradeType,
            label: label || undefined,
          },
        });

        if (cancelled) return;

        const roster = Array.isArray(data?.students) ? data.students : [];
        const normalized = roster.map((s) => ({
          student_id: s.student_id,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
          grade_value:
            s.grade_value === null || typeof s.grade_value === "undefined"
              ? ""
              : String(s.grade_value),
          _orig:
            s.grade_value === null || typeof s.grade_value === "undefined"
              ? ""
              : String(s.grade_value),
        }));
        setRows(normalized);
      } catch (err) {
        alert("Failed to load roster/grades.");
        console.error(err);
        setRows([]);
      } finally {
        if (!cancelled) setLoadingRoster(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [lectureId, gradeType, label]);

  const handleChangeGrade = (student_id, newVal) => {
    setRows((prev) =>
      prev.map((r) =>
        r.student_id === student_id ? { ...r, grade_value: newVal } : r
      )
    );
  };

  const changed = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.grade_value ?? "") !== (r._orig ?? "")
      ),
    [rows]
  );

  // ---------- FIXED: match backend payload ------------
  const handleSave = async () => {
    if (!lectureId) {
      alert("Please pick a lecture first.");
      return;
    }

    // Build items from changed rows that have a numeric value
    const items = changed
      .map((r) => {
        const n = Number(r.grade_value);
        if (!Number.isFinite(n)) return null;
        return {
          student_id: r.student_id,
          grade_value: n,
          grade_type: gradeType,
          grade_label: (label || "").trim() || null,
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      alert("No grade changes to save (or values are not numeric).");
      return;
    }

    try {
      setSaving(true);
      await api.post("/grades/save", {
        lecture_id: Number(lectureId),
        graded_at: date, // 'YYYY-MM-DD'
        items,           // <-- backend expects 'items'
      });

      // Reload to reflect saved (and clear dirty state)
      const { data } = await api.get("/grades/roster", {
        params: {
          lecture_id: lectureId,
          type: gradeType,
          label: label || undefined,
        },
      });
      const refreshed = (data?.students || []).map((s) => ({
        student_id: s.student_id,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        grade_value:
          s.grade_value === null || typeof s.grade_value === "undefined"
            ? ""
            : String(s.grade_value),
        _orig:
          s.grade_value === null || typeof s.grade_value === "undefined"
            ? ""
            : String(s.grade_value),
      }));
      setRows(refreshed);
      alert("Grades saved.");
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save grades."
      );
    } finally {
      setSaving(false);
    }
  };
  // ----------------------------------------------------

  return (
    <div className="manage-grades">
      <h2>📝 Manage Grades</h2>

      <div className="filters">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <select
          value={lectureId}
          onChange={(e) => setLectureId(e.target.value)}
          disabled={loadingLectures || !lectures.length}
        >
          {!lectures.length && <option value="">No lectures</option>}
          {lectures.map((l) => {
            const time = `${String(l.start_time).slice(0, 5)}–${String(
              l.end_time
            ).slice(0, 5)}`;
            return (
              <option key={l.lecture_id} value={l.lecture_id}>
                {`${l.course_name} • Sec ${l.section} • ${time} • ${l.room}`}
              </option>
            );
          })}
        </select>

        <select
          value={gradeType}
          onChange={(e) => setGradeType(e.target.value)}
        >
          {types.map((t) => (
            <option key={t.v} value={t.v}>
              {t.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Label (e.g., Quiz 1) — optional"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <button onClick={handleSave} disabled={saving || !lectureId}>
          {saving ? "Saving…" : "Save Grades"}
        </button>
      </div>

      {lectureTitle && <div className="muted subtitle">{lectureTitle}</div>}

      <table className="grade-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Student</th>
            <th>Email</th>
            <th style={{ width: 160 }}>Grade</th>
          </tr>
        </thead>
        <tbody>
          {loadingRoster ? (
            <tr>
              <td colSpan={4} className="muted center">
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted">
                No students.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const dirty = (r.grade_value ?? "") !== (r._orig ?? "");
              return (
                <tr key={r.student_id} className={dirty ? "row-dirty" : ""}>
                  <td>{r.student_id}</td>
                  <td>{`${r.last_name}, ${r.first_name}`}</td>
                  <td>{r.email}</td>
                  <td>
                    <input
                      className="grade-input"
                      type="number"
                      step="0.01"
                      value={r.grade_value}
                      onChange={(e) =>
                        handleChangeGrade(r.student_id, e.target.value)
                      }
                      placeholder="—"
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="muted small">
        {changed.length > 0
          ? `Unsaved changes: ${changed.length}`
          : "No changes"}
      </div>
    </div>
  );
}
