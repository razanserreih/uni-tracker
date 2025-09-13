import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ManageOfferings.css";

const api = axios.create({ baseURL: "http://127.0.0.1:4000" });

export default function ManageOfferings() {
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);

  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [section, setSection] = useState("A");
  const [capacity, setCapacity] = useState(50);

  const [loadingLists, setLoadingLists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // load pick lists (semesters, courses)
  useEffect(() => {
    let gone = false;
    async function load() {
      try {
        setLoadingLists(true);
        const [semRes, crsRes] = await Promise.all([
          api.get("/semesters"),
          api.get("/courses"),
        ]);
        if (gone) return;
        setSemesters(Array.isArray(semRes.data) ? semRes.data : []);
        setCourses(Array.isArray(crsRes.data) ? crsRes.data : []);
      } catch (e) {
        console.error("Picklist load failed:", e?.response?.data || e);
        alert("Failed to load semesters/courses");
      } finally {
        if (!gone) setLoadingLists(false);
      }
    }
    load();
    return () => { gone = true; };
  }, []);

  // load offerings for selected semester (optional filter by course)
  useEffect(() => {
    if (!semesterId) {
      setOfferings([]);
      return;
    }
    let gone = false;
    async function run() {
      try {
        setLoading(true);
        const { data } = await api.get("/offerings", {
          params: { semester_id: semesterId, course_id: courseId || undefined },
        });
        if (!gone) setOfferings(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("GET /offerings failed:", e?.response?.data || e);
        alert("Failed to load offerings");
      } finally {
        if (!gone) setLoading(false);
      }
    }
    run();
    return () => { gone = true; };
  }, [semesterId, courseId]);

  const canAdd = useMemo(
    () =>
      !!semesterId &&
      !!courseId &&
      section.trim().length > 0 &&
      Number(capacity) > 0 &&
      !saving,
    [semesterId, courseId, section, capacity, saving]
  );

  async function addOffering() {
    if (!canAdd) return;
    try {
      setSaving(true);
      await api.post("/offerings", {
        semester_id: Number(semesterId),
        course_id: Number(courseId),
        section: section.trim(),
        capacity: Number(capacity),
      });
      // refresh list
      const { data } = await api.get("/offerings", {
        params: { semester_id: semesterId, course_id: courseId || undefined },
      });
      setOfferings(Array.isArray(data) ? data : []);
      setSection("A");
      setCapacity(50);
    } catch (e) {
      console.error("POST /offerings failed:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Failed to add offering");
    } finally {
      setSaving(false);
    }
  }

  async function remove(offering_id) {
    if (!window.confirm("Delete this offering?")) return;
    try {
      await api.delete(`/offerings/${offering_id}`);
      setOfferings(prev => prev.filter(o => o.offering_id !== offering_id));
    } catch (e) {
      console.error("DELETE /offerings failed:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Failed to delete offering");
    }
  }

  return (
    <div className="manage-offerings">
      <h2>📦 Manage Course Offerings</h2>

      <div className="filters">
        <select
          value={semesterId}
          onChange={(e) => setSemesterId(e.target.value)}
          disabled={loadingLists}
        >
          <option value="">{loadingLists ? "Loading…" : "Select semester"}</option>
          {semesters.map(se => (
            <option key={se.semester_id} value={se.semester_id}>
              {se.semester_name}
            </option>
          ))}
        </select>

        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          disabled={loadingLists}
        >
          <option value="">{loadingLists ? "Loading…" : "All courses"}</option>
          {courses.map(c => (
            <option key={c.course_id} value={c.course_id}>
              {c.course_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          placeholder="Section"
        />
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Capacity"
        />
        <button disabled={!canAdd} onClick={addOffering}>
          {saving ? "Adding…" : "Add Offering"}
        </button>
      </div>

      <table className="off-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Section</th>
            <th>Capacity</th>
            <th>Enrolled</th>
            <th>Semester</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6" className="muted center">Loading…</td></tr>
          ) : offerings.length === 0 ? (
            <tr><td colSpan="6" className="muted">No offerings.</td></tr>
          ) : (
            offerings.map(o => (
              <tr key={o.offering_id}>
                <td>{o.course_name}</td>
                <td>{o.section}</td>
                <td>{o.capacity}</td>
                <td>{o.enrolled ?? 0}</td>
                <td>{o.semester_name}</td>
                <td>
                  <button className="btn danger" onClick={() => remove(o.offering_id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
