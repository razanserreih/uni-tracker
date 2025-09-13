// src/pages/ManageCourses.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ManageCourses.css";

const api = axios.create({ baseURL: "http://127.0.0.1:4000" });

export default function ManageCourses() {
  const [courses, setCourses] = useState([]);

  // add form
  const [newCourse, setNewCourse] = useState({
    course_name: "",
    department: "",
    max_absence_allowed: "",
    absence_warning_threshold: "",
    course_status_id: ""
  });

  // lookups
  const [statusOptions, setStatusOptions] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // edit state
  const [editId, setEditId] = useState(null);
  const [editCourse, setEditCourse] = useState({
    course_name: "",
    department: "",
    max_absence_allowed: "",
    absence_warning_threshold: "",
    course_status_id: ""
  });

  useEffect(() => {
    fetchLookups();
    fetchCourses();
  }, []);

  const fetchLookups = async () => {
    try {
      setLookupLoading(true);
      const { data } = await api.get("/lookup", {
        params: { domain: "course_status" },
      });
      setStatusOptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching status options:", err);
      setStatusOptions([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/courses");
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusName = (id) => {
    const it = statusOptions.find((s) => String(s.id) === String(id));
    return it?.name || (id ? `#${id}` : "");
  };

  // ---------- add ----------
  const validatePayload = ({ course_name, max_absence_allowed, absence_warning_threshold, course_status_id }) => {
    if (!course_name?.trim()) return "Course name is required.";
    if (!course_status_id) return "Please choose a course status.";

    const maxAbs = Number(max_absence_allowed);
    const warnAt = Number(absence_warning_threshold);

    if (!Number.isInteger(maxAbs) || maxAbs < 0 || maxAbs > 30) {
      return "Max absences should be 0–30.";
    }
    if (!Number.isInteger(warnAt) || warnAt < 0 || warnAt > maxAbs) {
      return "Warning threshold should be 0..max.";
    }
    return null;
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();

    const err = validatePayload(newCourse);
    if (err) return alert(err);

    try {
      await api.post("/courses", {
        course_name: newCourse.course_name.trim(),
        department: newCourse.department.trim(),
        max_absence_allowed: Number(newCourse.max_absence_allowed),
        absence_warning_threshold: Number(newCourse.absence_warning_threshold),
        course_status_id: Number(newCourse.course_status_id),
      });

      setNewCourse({
        course_name: "",
        department: "",
        max_absence_allowed: "",
        absence_warning_threshold: "",
        course_status_id: "",
      });

      fetchCourses();
    } catch (err) {
      alert("Error adding course: " + (err?.response?.data?.message || err.message));
    }
  };

  // ---------- edit ----------
  const startEdit = (c) => {
    setEditId(c.course_id);
    setEditCourse({
      course_name: c.course_name || "",
      department: c.department || "",
      max_absence_allowed: String(c.max_absence_allowed ?? ""),
      absence_warning_threshold: String(c.absence_warning_threshold ?? ""),
      course_status_id: String(c.course_status_id ?? ""),
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditCourse({
      course_name: "",
      department: "",
      max_absence_allowed: "",
      absence_warning_threshold: "",
      course_status_id: "",
    });
  };

  const saveEdit = async (id) => {
    const payload = { ...editCourse };
    const err = validatePayload(payload);
    if (err) return alert(err);

    try {
      await api.put(`/courses/${id}`, {
        course_name: payload.course_name.trim(),
        department: payload.department.trim(),
        max_absence_allowed: Number(payload.max_absence_allowed),
        absence_warning_threshold: Number(payload.absence_warning_threshold),
        course_status_id: Number(payload.course_status_id),
      });
      cancelEdit();
      fetchCourses();
    } catch (e) {
      alert("Failed to update course: " + (e?.response?.data?.message || e.message));
    }
  };

  // ---------- delete ----------
  const deleteCourse = async (id) => {
    if (!window.confirm("Delete this course? This cannot be undone.")) return;
    try {
      await api.delete(`/courses/${id}`);
      fetchCourses();
    } catch (e) {
      alert("Failed to delete: " + (e?.response?.data?.message || e.message));
    }
  };

  return (
    <div className="manage-courses">
      <h2>📚 Manage Courses</h2>

      {/* ADD */}
      <form className="course-form" onSubmit={handleAddCourse}>
        <input
          type="text"
          placeholder="Course name"
          value={newCourse.course_name}
          onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Department (e.g., Computer Science)"
          value={newCourse.department}
          onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max absences"
          value={newCourse.max_absence_allowed}
          onChange={(e) => setNewCourse({ ...newCourse, max_absence_allowed: e.target.value })}
          min="0"
          max="30"
          className="small"
        />
        <input
          type="number"
          placeholder="Warn at"
          value={newCourse.absence_warning_threshold}
          onChange={(e) => setNewCourse({ ...newCourse, absence_warning_threshold: e.target.value })}
          min="0"
          max="30"
          className="small"
        />
        <select
          value={newCourse.course_status_id}
          onChange={(e) => setNewCourse({ ...newCourse, course_status_id: e.target.value })}
          disabled={lookupLoading}
          className="status-select"
        >
          <option value="" disabled>
            {lookupLoading ? "Loading status…" : "Select status"}
          </option>
          {statusOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || `#${s.id}`}
            </option>
          ))}
        </select>
        <button type="submit">Add Course</button>
      </form>

      {/* TABLE */}
      {loading ? (
        <p className="muted">Loading courses…</p>
      ) : (
        <table className="course-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Course name</th>
              <th>Department</th>
              <th>Max absences</th>
              <th>Warn at</th>
              <th>Status</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 && (
              <tr>
                <td colSpan="7" className="muted center">No courses yet.</td>
              </tr>
            )}

            {courses.map((c) =>
              editId === c.course_id ? (
                <tr key={c.course_id} className="editing">
                  <td>{c.course_id}</td>
                  <td>
                    <input
                      type="text"
                      value={editCourse.course_name}
                      onChange={(e) =>
                        setEditCourse({ ...editCourse, course_name: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editCourse.department}
                      onChange={(e) =>
                        setEditCourse({ ...editCourse, department: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="small"
                      value={editCourse.max_absence_allowed}
                      onChange={(e) =>
                        setEditCourse({ ...editCourse, max_absence_allowed: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="small"
                      value={editCourse.absence_warning_threshold}
                      onChange={(e) =>
                        setEditCourse({
                          ...editCourse,
                          absence_warning_threshold: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={editCourse.course_status_id}
                      onChange={(e) =>
                        setEditCourse({ ...editCourse, course_status_id: e.target.value })
                      }
                      className="status-select"
                    >
                      {statusOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || `#${s.id}`}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="actions">
                    <button className="btn save" onClick={() => saveEdit(c.course_id)}>
                      Save
                    </button>
                    <button className="btn cancel" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={c.course_id}>
                  <td>{c.course_id}</td>
                  <td>{c.course_name}</td>
                  <td>{c.department}</td>
                  <td>{c.max_absence_allowed}</td>
                  <td>{c.absence_warning_threshold}</td>
                  <td>{statusName(c.course_status_id)}</td>
                  <td className="actions">
                    <button className="btn" onClick={() => startEdit(c)}>Edit</button>
                    <button className="btn danger" onClick={() => deleteCourse(c.course_id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
