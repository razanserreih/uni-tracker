import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ManageLectures.css";

const api = axios.create({ baseURL: "http://127.0.0.1:4000" });

// ---------- small helpers ----------
const cleanTime = (val) =>
  String(val || "")
    .replace(/\s/g, "")
    .replace(/^(\d):/, "0$1:");

const normDays = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s*,\s*/g, ",");

export default function ManageLectures() {
  // pick lists
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [daysLookup, setDaysLookup] = useState([]); // [{id, name}] for lecture_days

  // selections
  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [offeringId, setOfferingId] = useState("");

  // lectures in table
  const [lectures, setLectures] = useState([]);

  // inputs for add
  const [day, setDay] = useState(""); // user types "Monday, Wednesday"
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState("");

  const [loadingPickLists, setLoadingPickLists] = useState(false);
  const [loadingLectures, setLoadingLectures] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedOffering = useMemo(
    () => offerings.find((o) => String(o.offering_id) === String(offeringId)),
    [offerings, offeringId]
  );

  // --------- load pick lists (semesters/courses + lecture_days lookup) ---------
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingPickLists(true);
        const [semsRes, crsRes, daysRes] = await Promise.all([
          api.get("/semesters"),
          api.get("/courses"),
          api.get("/lookup", { params: { domain: "lecture_days" } }),
        ]);

        if (cancel) return;
        setSemesters(Array.isArray(semsRes.data) ? semsRes.data : []);
        setCourses(Array.isArray(crsRes.data) ? crsRes.data : []);
        setDaysLookup(Array.isArray(daysRes.data) ? daysRes.data : []);
      } catch (e) {
        console.error(e);
        alert("Failed to load pick lists");
      } finally {
        if (!cancel) setLoadingPickLists(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // --------- load offerings when semester/course changes ---------
  useEffect(() => {
    if (!semesterId) {
      setOfferings([]);
      setOfferingId("");
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get("/offerings", {
          params: { semester_id: semesterId, course_id: courseId || undefined },
        });
        if (cancel) return;
        setOfferings(Array.isArray(data) ? data : []);
        setOfferingId("");
      } catch (e) {
        console.error(e);
        setOfferings([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [semesterId, courseId]);

  // --------- load lectures for offering ---------
  useEffect(() => {
    if (!offeringId) {
      setLectures([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        setLoadingLectures(true);
        const { data } = await api.get("/lectures", {
          params: { offering_id: offeringId },
        });
        if (cancel) return;
        setLectures(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setLectures([]);
      } finally {
        if (!cancel) setLoadingLectures(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [offeringId]);

  // --------- map "Monday, Wednesday" -> lecture_days_id ----------
  const resolveLectureDaysId = (text) => {
    if (!text) return null;
    const wanted = normDays(text);
    const hit = daysLookup.find((d) => normDays(d.name) === wanted);
    return hit ? Number(hit.id) : null;
  };

  // --------- actions ---------
  const canAdd =
    offeringId && day.trim() && start.trim() && end.trim() && room.trim();

  const handleAdd = async () => {
    if (!canAdd || saving) return;

    const lecture_days_id = resolveLectureDaysId(day);
    if (!lecture_days_id) {
      return alert(
        'Day(s) must match an existing option (lookup), e.g. "Monday" or "Monday, Wednesday".'
      );
    }

    const start_time = cleanTime(start);
    const end_time = cleanTime(end);
    if (!start_time || !end_time) {
      return alert("Start and end time are required.");
    }

    try {
      setSaving(true);
      await api.post("/lectures", {
        offering_id: Number(offeringId),
        lecture_days_id,
        start_time,
        end_time,
        room: room.trim(),
      });

      setDay("");
      setStart("");
      setEnd("");
      setRoom("");

      // refresh
      const { data } = await api.get("/lectures", {
        params: { offering_id: offeringId },
      });
      setLectures(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to add lecture");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lecture_id) => {
    if (!window.confirm("Delete this lecture?")) return;
    try {
      await api.delete(`/lectures/${lecture_id}`);
      setLectures((prev) => prev.filter((l) => l.lecture_id !== lecture_id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete lecture");
    }
  };

  // --------- human heading for selected offering ---------
  const offeringTitle = useMemo(() => {
    if (!selectedOffering) return "";
    const o = selectedOffering;
    return `${o.course_name} • Sec ${o.section} • ${o.semester_name}`;
  }, [selectedOffering]);

  // Map table row to nice days label regardless of what API returns
  const dayLabelForRow = (row) => {
    // preferred: API already gives day text
    if (row.day_text) return row.day_text;
    if (row.lecture_days) return row.lecture_days;
    if (row.code) return row.code;

    // if only id came back
    const id =
      row.lecture_days_id ??
      row.days_id ??
      row.day_id ??
      row.lecture_daysId ??
      null;
    if (!id) return "";

    const hit = daysLookup.find((d) => Number(d.id) === Number(id));
    return hit?.name || `#${id}`;
  };

  return (
    <div className="ml-page">
      <div className="ml-card">
        <div className="ml-header">
          <div className="ml-title">
            <span className="ml-emoji">🏫</span> Manage Lectures
          </div>
          <div className="ml-subtitle">
            Create and organize lecture time slots for each course offering.
          </div>
        </div>

        <div className="ml-toolbar">
          <div className="ml-row">
            <div className="ml-field">
              <label>Semester</label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                disabled={loadingPickLists}
              >
                <option value="">Select semester</option>
                {semesters.map((s) => (
                  <option key={s.semester_id} value={s.semester_id}>
                    {s.semester_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-field">
              <label>Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={!semesterId || loadingPickLists}
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-field">
              <label>Offering</label>
              <select
                value={offeringId}
                onChange={(e) => setOfferingId(e.target.value)}
                disabled={!semesterId || !offerings.length}
              >
                <option value="">No offerings</option>
                {offerings.map((o) => (
                  <option key={o.offering_id} value={o.offering_id}>
                    {o.course_name} • Sec {o.section} • {o.capacity} cap
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ml-row ml-add">
            <div className="ml-field">
              <label>Day(s)</label>
              <input
                type="text"
                placeholder="e.g., Monday, Wednesday"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                disabled={!offeringId}
              />
            </div>

            <div className="ml-field">
              <label>Start</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                disabled={!offeringId}
              />
            </div>

            <div className="ml-field">
              <label>End</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={!offeringId}
              />
            </div>

            <div className="ml-field grow">
              <label>Room</label>
              <input
                type="text"
                placeholder="Room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                disabled={!offeringId}
              />
            </div>

            <div className="ml-actions">
              <button
                className="btn primary"
                onClick={handleAdd}
                disabled={!canAdd || saving}
              >
                {saving ? "Adding…" : "Add Lecture"}
              </button>
            </div>
          </div>

          {offeringTitle && (
            <div className="ml-offering-chip">{offeringTitle}</div>
          )}
        </div>

        <div className="ml-table-wrap">
          <table className="ml-table">
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
              {loadingLectures ? (
                <tr>
                  <td colSpan={5} className="muted center">
                    Loading lectures…
                  </td>
                </tr>
              ) : lectures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No lectures for this offering.
                  </td>
                </tr>
              ) : (
                lectures.map((l) => (
                  <tr key={l.lecture_id}>
                    <td>{dayLabelForRow(l)}</td>
                    <td>{String(l.start_time).slice(0, 5)}</td>
                    <td>{String(l.end_time).slice(0, 5)}</td>
                    <td>{l.room}</td>
                    <td className="center">
                      <button
                        className="btn danger outline"
                        onClick={() => handleDelete(l.lecture_id)}
                      >
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
