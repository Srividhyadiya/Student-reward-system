import React, { useEffect, useState } from 'react';
import './Attendance.css';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

export default function Attendance() {
  const { id: teacherId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const qs = new URLSearchParams(location.search);
  const slot = {
    day: qs.get('day') || '',
    start: qs.get('start') || '',
    end: qs.get('end') || '',
    subject: qs.get('subject') || '',
    department: qs.get('department') || '',
    semester: qs.get('semester') || '',
    section: qs.get('section') || ''
  };

  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (slot.department) params.set('dept', slot.department);
        // include section only when provided (empty section should match empty)
        if (slot.section !== null) params.set('section', slot.section);
        if (slot.semester) params.set('sem', slot.semester);
        const res = await fetch(`/api/admin/students/search?${params.toString()}`);
        const json = await res.json();
        if (json && json.success) {
          setStudents(json.students || []);
          const sel = {};
          // default to present for all loaded students (matches previous behavior)
          (json.students || []).forEach(s => { sel[s._id] = 'present'; });
          setSelected(sel);
        } else {
          // fallback: if endpoint doesn't return success, try GET /api/admin/student
          const allRes = await fetch('/api/admin/student');
          const all = await allRes.json();
          const filtered = (Array.isArray(all) ? all : []).filter(s => {
            if (slot.department && String(s.dept || '').trim() !== String(slot.department).trim()) return false;
            if (slot.semester && String(s.sem || '').trim() !== String(slot.semester).trim()) return false;
            if (slot.section && String(s.section || '').trim() !== String(slot.section).trim()) return false;
            return true;
          });
          setStudents(filtered);
          const sel = {}; filtered.forEach(s=> sel[s._id] = 'present'); setSelected(sel);
        }
      } catch (err) {
        console.error('Error loading students for attendance', err);
      } finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalStudents = students.length;
  const presentCount = students.reduce((count, student) => (
    selected[student._id] === 'present' ? count + 1 : count
  ), 0);
  const absentCount = Math.max(totalStudents - presentCount, 0);

  const getInitials = (name = '') => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const save = async () => {
    // build attendanceList in requested shape
    const attendanceList = students.map(s => ({
      roll: s.roll,
      name: s.name,
      email: s.email,
      status: (selected[s._id] === 'present') ? 'Present' : 'Absent'
    }));

    // build date as YYYY-MM-DD
    const dateStr = new Date().toISOString().split('T')[0];

    const payload = {
      date: dateStr,
      department: slot.department || '',
      semester: slot.semester || '',
      section: slot.section || '',
      subject: slot.subject || '',
      startTime: slot.start || '',
      endTime: slot.end || '',
      markedBy: teacherId || '',
      attendanceList
    };

    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json && json.success) {
        alert('Attendance submitted.');
        navigate(-1);
      } else {
        console.error('Attendance save failed', json);
        alert('Failed to save attendance.');
      }
    } catch (err) {
      console.error('Error saving attendance', err);
      alert('Server error while saving attendance');
    }
  };

  return (
    <div className="ta-page">
      <div className="ta-page-orb ta-page-orb-left" aria-hidden="true" />
      <div className="ta-page-orb ta-page-orb-right" aria-hidden="true" />

      <div className="ta-container">
        <section className="ta-hero-card">
          <p className="ta-kicker">Classroom Register</p>
          <h1 className="ta-title">Mark Attendance</h1>
          <p className="ta-subtitle">
            {slot.subject || slot.department || 'Scheduled Class'}
            <span className="ta-dot">•</span>
            {slot.day || 'Day not set'}
            <span className="ta-dot">•</span>
            {slot.start || '--:--'} - {slot.end || '--:--'}
          </p>

          <div className="ta-meta-grid">
            <div className="ta-meta-item"><span>Department</span><strong>{slot.department || '—'}</strong></div>
            <div className="ta-meta-item"><span>Semester</span><strong>{slot.semester || '—'}</strong></div>
            <div className="ta-meta-item"><span>Section</span><strong>{slot.section || '—'}</strong></div>
            <div className="ta-meta-item"><span>Subject</span><strong>{slot.subject || '—'}</strong></div>
          </div>
        </section>

        <section className="ta-stats-grid">
          <article className="ta-stat-card">
            <p>Total Students</p>
            <h3>{totalStudents}</h3>
          </article>
          <article className="ta-stat-card ta-stat-card-present">
            <p>Marked Present</p>
            <h3>{presentCount}</h3>
          </article>
          <article className="ta-stat-card ta-stat-card-absent">
            <p>Marked Absent</p>
            <h3>{absentCount}</h3>
          </article>
        </section>

        <section className="ta-table-card">
          {loading ? (
            <div className="ta-state">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="ta-state">No students found for this class selection.</div>
          ) : (
            <div className="ta-table-wrap">
              <table className="ta-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll</th>
                    <th>Email</th>
                    <th className="ta-align-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td>
                        <div className="ta-student-cell">
                          {student.imageUrl ? (
                            <img src={student.imageUrl} alt={student.name} className="ta-student-photo" />
                          ) : (
                            <div className="ta-student-photo ta-student-photo-placeholder">{getInitials(student.name)}</div>
                          )}
                          <div>
                            <p className="ta-student-name">{student.name || 'Unknown Student'}</p>
                            <p className="ta-student-extra">{student.dept || slot.department || 'Department N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td>{student.roll || '-'}</td>
                      <td className="ta-email">{student.email || '-'}</td>
                      <td>
                        <div className="ta-status-actions">
                          <button
                            type="button"
                            className={`ta-status-btn ta-status-btn-present ${selected[student._id] === 'present' ? 'is-active' : ''}`}
                            onClick={() => setSelected((prev) => ({ ...prev, [student._id]: 'present' }))}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`ta-status-btn ta-status-btn-absent ${selected[student._id] === 'absent' ? 'is-active' : ''}`}
                            onClick={() => setSelected((prev) => ({ ...prev, [student._id]: 'absent' }))}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="ta-footer-actions">
            <button type="button" className="ta-btn ta-btn-primary" onClick={save}>Save Attendance</button>
            <button type="button" className="ta-btn ta-btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </section>
      </div>
    </div>
  );
}
