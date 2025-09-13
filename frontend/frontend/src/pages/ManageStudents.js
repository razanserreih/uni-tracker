// src/pages/ManageStudents.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ManageStudents.css";

const api = axios.create({ baseURL: "http://127.0.0.1:4000" });

function ymd(d) {
  if (typeof d === "string") return d;
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}

export default function ManageStudents() {
  // list + status lookup
  const [students, setStudents] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add form
  const [newStudent, setNewStudent] = useState({
    first_name: "",
    last_name: "",
    email: "",
    major_id: "",
    enrollment_date: "",
    status_id: "",
  });

  // Inline editing state
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState(null);

  // fast status name lookup
  const statusMap = useMemo(() => {
    const m = new Map();
    statusOptions.forEach((s) => m.set(String(s.id), s.name));
    return m;
  }, [statusOptions]);

  useEffect(() => {
    loadLookups();
    loadStudents();
  }, []);

  async function loadLookups() {
    try {
      setLookupLoading(true);
      const { data } = await api.get("/lookup", {
        params: { domain: "student_status" },
      });
      setStatusOptions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("lookup student_status error:", e);
      setStatusOptions([]);
    } finally {
      setLookupLoading(false);
    }
  }

  async function loadStudents() {
    try {
      setLoading(true);
      const { data } = await api.get("/students");
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetch students error:", e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  const statusName = (id) =>
    statusMap.get(String(id)) || (id ? `#${id}` : "");

  const statusPillClass = (name) => {
    const k = String(name || "").toLowerCase();
    if (k.includes("inactive")) return "badge inactive";
    if (k.includes("gradu")) return "badge graduated";
    if (k.includes("suspend")) return "badge suspended";
    return "badge active";
  };

  // ===== Add Student =====
  async function handleAdd(e) {
    e.preventDefault();
    if (!newStudent.first_name.trim() || !newStudent.last_name.trim()) {
      alert("First and last name are required.");
      return;
    }
    if (!newStudent.enrollment_date) {
      alert("Enrollment date is required.");
      return;
    }
    if (!newStudent.status_id) {
      alert("Please choose a status.");
      return;
    }

    try {
      await api.post("/students", {
        first_name: newStudent.first_name.trim(),
        last_name: newStudent.last_name.trim(),
        email: (newStudent.email || "").trim(),
        major_id: newStudent.major_id ? Number(newStudent.major_id) : null,
        enrollment_date: newStudent.enrollment_date,
        status_id: Number(newStudent.status_id),
      });

      setNewStudent({
        first_name: "",
        last_name: "",
        email: "",
        major_id: "",
        enrollment_date: "",
        status_id: "",
      });

      loadStudents();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to add student");
    }
  }

  // ===== Inline Edit =====
  function startEdit(row) {
    setEditId(row.student_id);
    setEditRow({
      student_id: row.student_id,
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      email: row.email || "",
      major_id: row.major_id || "",
      enrollment_date: row.enrollment_date ? ymd(row.enrollment_date) : "",
      status_id: row.status_id || "",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditRow(null);
  }

  async function saveEdit() {
    if (!editRow) return;
    const {
      student_id,
      first_name,
      last_name,
      email,
      major_id,
      enrollment_date,
      status_id,
    } = editRow;

    if (!first_name.trim() || !last_name.trim()) {
      alert("First and last name are required.");
      return;
    }
    if (!enrollment_date) {
      alert("Enrollment date is required.");
      return;
    }
    if (!status_id) {
      alert("Please choose a status.");
      return;
    }

    try {
      await api.put(`/students/${student_id}`, {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: (email || "").trim(),
        major_id: major_id ? Number(major_id) : null,
        enrollment_date,
        status_id: Number(status_id),
      });
      await loadStudents();
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update student");
    }
  }

  return (
    <div className="manage-students">
      <h2>Manage Students</h2>

      {/* Toolbar (add form) */}
      <form className="ms-toolbar" onSubmit={handleAdd}>
        <input
          className="smart-input"
          type="text"
          placeholder="First name"
          value={newStudent.first_name}
          onChange={(e) =>
            setNewStudent({ ...newStudent, first_name: e.target.value })
          }
        />
        <input
          className="smart-input"
          type="text"
          placeholder="Last name"
          value={newStudent.last_name}
          onChange={(e) =>
            setNewStudent({ ...newStudent, last_name: e.target.value })
          }
        />
        <input
          className="smart-input"
          type="email"
          placeholder="Email"
          value={newStudent.email}
          onChange={(e) =>
            setNewStudent({ ...newStudent, email: e.target.value })
          }
        />
        <input
          className="smart-input"
          type="number"
          placeholder="Major ID"
          value={newStudent.major_id}
          onChange={(e) =>
            setNewStudent({ ...newStudent, major_id: e.target.value })
          }
        />
        <input
          className="smart-input"
          type="date"
          value={newStudent.enrollment_date}
          onChange={(e) =>
            setNewStudent({
              ...newStudent,
              enrollment_date: e.target.value,
            })
          }
        />
        <select
          className="smart-input"
          value={newStudent.status_id}
          onChange={(e) =>
            setNewStudent({ ...newStudent, status_id: e.target.value })
          }
          disabled={lookupLoading}
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

        <button className="btn btn-primary" type="submit">
          Add Student
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <p className="muted">Loading students…</p>
      ) : (
        <div className="table-wrap">
          <table className="smart-table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>ID</th>
                <th>First name</th>
                <th>Last name</th>
                <th>Email</th>
                <th style={{ width: 88 }}>Major ID</th>
                <th style={{ width: 170 }}>Enrollment date</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted center">
                    No students yet.
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const isEditing = s.student_id === editId;
                  const name = statusName(s.status_id);

                  return (
                    <tr key={s.student_id}>
                      <td>{s.student_id}</td>

                      <td>
                        {isEditing ? (
                          <input
                            className="smart-input"
                            value={editRow.first_name}
                            onChange={(e) =>
                              setEditRow({
                                ...editRow,
                                first_name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          s.first_name
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="smart-input"
                            value={editRow.last_name}
                            onChange={(e) =>
                              setEditRow({
                                ...editRow,
                                last_name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          s.last_name
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="smart-input"
                            type="email"
                            value={editRow.email}
                            onChange={(e) =>
                              setEditRow({
                                ...editRow,
                                email: e.target.value,
                              })
                            }
                          />
                        ) : (
                          s.email
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {isEditing ? (
                          <input
                            className="smart-input"
                            type="number"
                            value={editRow.major_id ?? ""}
                            onChange={(e) =>
                              setEditRow({
                                ...editRow,
                                major_id: e.target.value,
                              })
                            }
                          />
                        ) : (
                          s.major_id ?? ""
                        )}
                      </td>

                      <td className="muted">
                        {isEditing ? (
                          <input
                            className="smart-input"
                            type="date"
                            value={editRow.enrollment_date}
                            onChange={(e) =>
                              setEditRow({
                                ...editRow,
                                enrollment_date: e.target.value,
                              })
                            }
                          />
                        ) : (
                          s.enrollment_date ? ymd(s.enrollment_date) : ""
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            className="smart-input"
                            value={editRow.status_id}
                            onChange={(e) =>
                              setEditRow({
                                ...editRow,
                                status_id: e.target.value,
                              })
                            }
                            disabled={lookupLoading}
                          >
                            {statusOptions.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name || `#${o.id}`}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={statusPillClass(name)}>{name}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit}
                              className="btn btn-primary"
                            >
                              Save
                            </button>
                            <button onClick={cancelEdit} className="btn">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(s)}
                            className="btn"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
