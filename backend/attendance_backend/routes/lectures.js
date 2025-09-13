// src/pages/ManageLectures.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ManageLectures.css";

const api = axios.create({ baseURL: "http://127.0.0.1:4000" });

function cleanTime(val) {
  // "09 : 10" -> "09:10"
  if (!val) return "";
  return String(val).replace(/\s/g, "").replace(/^(\d{1}):/, "0$1:"); // pad hour if needed
}
function hhmm(val) {
  const v = cleanTime(val);
  if (/^\d{1,2}:\d{2}$/.test(v)) return v;
  return v; // let backend fallback/validation if needed
}

export default function ManageLectures() {
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [daysOptions, setDaysOptions] = useState([]);

  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [offeringId, setOfferingId] = useState("");

  // form fields
  const [dayText, setDayText] = useState(""); // free text like "Monday, Wednesday"
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState("");

  const [lectures, setLectures] = useState([]);
  const [loadingPick, setLoadingPick] = useState(false);
  const [adding, setAdding] = useState(false);

  // pretty label for the selected offering chip
  const offeringChip = useMemo(() => {
    const it = offerings.find((o) => String(o.id) === String(offeringId));
    return it ? `${it.course_name} • Sec ${it.section} • ${it.semester_name}` : "";
  }, [offerings, offeringId]);

  // Load picklists initially and when filters change
  useEffect(() => {
    let cancel = false;
    async function loadPicklists() {
      try {
        setLoadingPick(true);
        const { data } = await api.get("/lectures/picklists", {
          params: {
            semester_id: semesterId || undefined,
            course_id: courseId || undefined,
          },
        });
        if (cancel) return;

        setSemesters(data.semesters || []);
        setCourses(data.courses || []);
        setOfferings(data.offerings || []);
        setDaysOptions(data.days || []);

        // Autoselect first values if nothing chosen
        if (!semesterId && data.semesters?.length) {
          setSemesterId(String(data.semesters[0].id));
        }
        if (!courseId && data.courses?.length) {
          setCourseId(String(data.courses[0].id));
        }
        if (!offeringId && data.offerings?.length) {
          setOfferingId(String(data.offerings[0].id));
        }
      } catch (e) {
        console.error(e);
        alert("Failed to load pick lists");
      } finally {
        if (!cancel) setLoadingPick(false);
      }
    }
    loadPicklists();
    return () => { cancel = true; };
  }, [semesterId, courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load lectures when offering changes
  useEffect(() => {
    let cancel = false;
    async function loadLectures() {
      if (!offeringId) {
        setLectures([]);
        return;
      }
      try {
        const { data } = await api.get("/lectures", { params: { offering_id: offeringId } });
        if (cancel) return;
        setLectures(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        alert("Failed to load lectures");
        setLectures([]);
      }
    }
    loadLectures();
    return () => { cancel = true; };
  }, [offeringId]);

  // Convert the free-text "Day(s)" to lookup id
  function resolveLectureDaysId() {
    if (!dayText) return null;
    const wanted = dayText.trim().toLowerCase();
    // daysOptions: [{id, name}] where name is the 'code' in lookup
    const hit = daysOptions.find(d => (d.name || "").trim().toLowerCase() === wanted);
    return hit ? Number(hit.id) : null;
  }

  async function handleAdd() {
    if (!offeringId) return alert("Please choose an offering.");
    const lecture_days_id = resolveLectureDaysId();
    if (!lecture_days_id) {
      return alert("Day(s) must match one of the valid options (e.g., \"Monday\", \"Sunday, Tuesday\").");
    }
    const start_time = hhmm(start);
    const end_time = hhmm(end);
    if (!start_time || !end_time) return alert("Start and end time are required.");

    try {
      setAdding(true);
      await api.post("/lectures", {
        offering_id: Number(offeringId),
        lecture_days_id,               // <- exact field API expects
        start_time,                    // <- exact field API expects
        end_time,                      // <- exact field API expects
        room: room || null,
      });

      // refresh list
      const { data } = await api.get("/lectures", { params: { offering_id: offeringId } });
      setLectures(Array.isArray(data) ? data : []);
      // Clear inputs but keep day and room for convenience
      setStart("");
      setEnd("");
      alert("Lecture added.");
    } catch (e) {
      console.error(e);
      alert(
        e?.response?.data?.message ||
        "Failed to add lecture"
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this lecture?")) return;
    try {
      await api.delete(`/lectures/${id}`);
      setLectures(prev => prev.filter(x => x.lecture_id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete lecture");
    }
  }

  return (
    <div className="lectures-page">
      <div className="card">
        <div className="header">
          <span className="icon">🏠</span>
          <h2>Manage Lectures</h2>
          <p>Create and organize lecture time slots for each course offering.</p>
        </div>

        <div className="filters">
          <div className="row">
            <div className="field">
              <label>Semester</label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                disabled={loadingPick}
              >
                {semesters.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={loadingPick}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Offering</label>
              <select
                value={offeringId}
                onChange={(e) => setOfferingId(e.target.value)}
                disabled={loadingPick || !offerings.length}
              >
                {offerings.length === 0 && <option value="">No offerings</option>}
                {offerings.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label>Day(s)</label>
              <input
                type="text"
                placeholder='e.g., "Monday" or "Monday, Wednesday"'
                value={dayText}
                onChange={(e) => setDayText(e.target.value)}
                list="days-list"
              />
              <datalist id="days-list">
                {daysOptions.map(d => (
                  <option key={d.id} value={d.name} />
                ))}
              </datalist>
            </div>

            <div className="field small">
              <label>Start</label>
              <input
                type="text"
                placeholder="HH:MM"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>

            <div className="field small">
              <label>End</label>
              <input
                type="text"
                placeholder="HH:MM"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Room</label>
              <input
                type="text"
                placeholder="Room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <div className="actions">
              <button
                className="primary"
                onClick={handleAdd}
                disabled={adding || !offeringId}
              >
                {adding ? "Adding…" : "Add Lecture"}
              </button>
            </div>
          </div>

          {offeringChip && (
            <div className="chip">{offeringChip}</div>
          )}
        </div>

        <div className="table-wrap">
          <table className="lectures-table">
            <thead>
              <tr>
                <th>Day(s)</th>
                <th>Start</th>
                <th>End</th>
                <th>Room</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lectures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted center">
                    No lectures for this offering.
                  </td>
                </tr>
              ) : (
                lectures.map(l => (
                  <tr key={l.lecture_id}>
                    <td>{l.lecture_days || l.days_text || ""}</td>
                    <td>{String(l.start_time).slice(0,5)}</td>
                    <td>{String(l.end_time).slice(0,5)}</td>
                    <td>{l.room || ""}</td>
                    <td className="center">
                      <button className="danger" onClick={() => handleDelete(l.lecture_id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
