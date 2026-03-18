import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './TeacherProfile.css';

const TeacherProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSlot, setEditingSlot] = useState(null);
  const [editingSection, setEditingSection] = useState('');

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const res = await fetch('/api/admin/teacher');
        if (!res.ok) throw new Error('Network response was not ok');
        const list = await res.json();
        const found = list.find((t) => String(t.id) === String(id));
        if (found) setTeacher(found);
        else setError('Teacher not found');
      } catch (err) {
        console.error('Error fetching teacher:', err);
        setError('Error fetching teacher data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();
  }, [id]);

  const handleAttendance = (slot) => {
    // navigate to an attendance page with query params (department & semester now included)
    const q = new URLSearchParams({ day: slot.day, start: slot.start, end: slot.end, subject: slot.subject || '', department: slot.department || '', semester: slot.semester || '', section: slot.section || '' });
    navigate(`/teacher/${id}/attendance?${q.toString()}`);
  };

  const handleAddMarks = (slot) => {
    const q = new URLSearchParams({ day: slot.day, start: slot.start, end: slot.end, subject: slot.subject || '', department: slot.department || '', semester: slot.semester || '', section: slot.section || '' });
    navigate(`/teacher/${id}/marks?${q.toString()}`);
  };

  const startEditSection = (idx, section) => {
    setEditingSlot(idx);
    setEditingSection(section || '');
  };

  const cancelEditSection = () => {
    setEditingSlot(null);
    setEditingSection('');
  };

  const saveSection = async (idx) => {
    if (!teacher) return;
    const nextTt = (teacher.timetable || []).map((s, i) => i === idx ? { ...s, section: editingSection.trim() } : s);
    const updated = { ...teacher, timetable: nextTt };
    setTeacher(updated);
    setEditingSlot(null);
    setEditingSection('');

    // try to persist to server (upsert teacher)
    try {
      await fetch('/api/admin/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn('Failed to persist section change', err);
    }
  };

  if (loading) return <div className="tp-page"><div className="tp-state">Loading...</div></div>;

  if (error) return (
    <div className="tp-page">
      <div className="tp-state tp-error">
        <p>{error}</p>
        <Link to="/teacher/login" className="tp-back">Back to login</Link>
      </div>
    </div>
  );

  return (
    <div className="tp-page">
      <div className="tp-page-orb tp-page-orb-left" aria-hidden="true" />
      <div className="tp-page-orb tp-page-orb-right" aria-hidden="true" />

      <div className="tp-container">
      <section className="tp-hero">
        <div className="tp-avatar-wrap">
          {teacher.imageUrl ? (
            <img src={teacher.imageUrl} alt={teacher.name} className="tp-avatar" />
          ) : (
            <div className="tp-avatar tp-avatar--placeholder">{(teacher.name || '').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}</div>
          )}
        </div>

        <div className="tp-hero-card">
          <p className="tp-kicker">Faculty Dashboard</p>
          <h1 className="tp-greeting">Hello {teacher.name}!</h1>
          <p className="tp-sub">Welcome back. Manage your classes and attendance quickly.</p>

          <div className="tp-details-grid">
            <div className="tp-row"><span className="tp-label">ID</span><span className="tp-value">{teacher.id}</span></div>
            <div className="tp-row"><span className="tp-label">Subject</span><span className="tp-value">{teacher.subject || '—'}</span></div>
            <div className="tp-row"><span className="tp-label">Designation</span><span className="tp-value">{teacher.designation || '—'}</span></div>
            <div className="tp-row"><span className="tp-label">Department</span><span className="tp-value">{teacher.department || '—'}</span></div>
            {teacher.email && <div className="tp-row"><span className="tp-label">Email</span><span className="tp-value">{teacher.email}</span></div>}
            {teacher.phone && <div className="tp-row"><span className="tp-label">Phone</span><span className="tp-value">{teacher.phone}</span></div>}
          </div>
        </div>
      </section>

      <section className="tp-timetable">
        <h2>Timetable</h2>
        {teacher.timetable && teacher.timetable.length > 0 ? (
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teacher.timetable.map((slot, idx) => (
                  <tr key={idx}>
                    <td>{slot.day}</td>
                    <td>{slot.start}</td>
                    <td>{slot.end}</td>
                    <td>{slot.subject || '-'}</td>
                    <td>
                      {editingSlot === idx ? (
                        <div className="tp-edit-inline">
                          <input
                            value={editingSection}
                            onChange={(e) => setEditingSection(e.target.value)}
                            placeholder="Section"
                            className="tp-section-input"
                          />
                          <button onClick={() => saveSection(idx)} className="tp-small-btn">Save</button>
                          <button onClick={cancelEditSection} className="tp-small-btn tp-cancel">Cancel</button>
                        </div>
                      ) : (
                        <span onClick={() => startEditSection(idx, slot.section)} className="tp-section-view">
                          {slot.section || '-'}
                        </span>
                      )}
                    </td>
                    <td>{slot.department || '-'}</td>
                    <td>{slot.semester || '-'}</td>
                    <td>
                      <div className="tp-row-actions">
                        <button
                          className="tp-attend"
                          onClick={() => handleAttendance(slot)}
                          aria-label={`Take attendance for ${slot.department || '-'} on ${slot.day}`}
                        >
                          Take Attendance
                        </button>
                        <button
                          className="tp-marks"
                          onClick={() => handleAddMarks(slot)}
                          aria-label={`Add marks for ${slot.subject || 'selected subject'}`}
                        >
                          Add Marks
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="tp-empty">No timetable available.</p>
        )}
      </section>

      <div className="tp-actions">
        <Link to="/teacher/login" className="tp-logout">Logout</Link>
      </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
