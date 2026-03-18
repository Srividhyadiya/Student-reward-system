import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Simple Teacher Management using localStorage
// Features:
// - Add / Edit teacher
// - Teacher table one row per teacher
// - Timetable inline form per teacher
// - Data persisted in localStorage under key 'teachers'

const STORAGE_KEY = 'teachers';

const defaultTeachers = [];

function loadTeachers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTeachers;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load teachers from localStorage', e);
    return defaultTeachers;
  }
}

function saveTeachers(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save teachers to localStorage', e);
  }
}

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState(() => loadTeachers());

  // Form state
  const [mode, setMode] = useState('add'); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');

  // Navigation to separate timetable page
  const navigate = useNavigate();

  // Timetable add state (kept for potential local defaults)
  const [ttDay, setTtDay] = useState('Monday');
  const [ttStart, setTtStart] = useState('09:00');
  const [ttEnd, setTtEnd] = useState('10:00');

  useEffect(() => {
    saveTeachers(teachers);
  }, [teachers]);

  const resetForm = () => {
    setMode('add');
    setEditingId(null);
    setName('');
    setEmail('');
    setSubject('');
    setDesignation('');
    setDepartment('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (mode === 'add') {
      const newTeacher = {
        id: crypto?.randomUUID?.() || String(Date.now()),
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        designation: designation.trim(),
        department: department.trim(),
        timetable: []
      };
      const next = [newTeacher, ...teachers];
      setTeachers(next);
      resetForm();
    } else if (mode === 'edit' && editingId) {
      const next = teachers.map(t => t.id === editingId ? { ...t, name: name.trim(), email: email.trim(), subject: subject.trim(), designation: designation.trim(), department: department.trim() } : t);
      setTeachers(next);
      resetForm();
    }
  };

  const handleEdit = (teacher) => {
    setMode('edit');
    setEditingId(teacher.id);
    setName(teacher.name || '');
    setEmail(teacher.email || '');
    setSubject(teacher.subject || '');
    setDesignation(teacher.designation || '');
    setDepartment(teacher.department || '');
  // collapse timetable if open (no inline timetable now)
  // keep behavior same otherwise
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this teacher?')) return;
    const next = teachers.filter(t => t.id !== id);
    setTeachers(next);
  };

  const openTimetablePage = (teacherId) => {
    navigate(`/admin/teacher/${teacherId}/timetable`);
  };

  const dayOptions = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

  return (
    <div className="tm-root">
      <h2>Teacher Management</h2>

      <div className="tm-grid">
        <section className="tm-form">
          <h3>{mode === 'add' ? 'Add Teacher' : 'Edit Teacher'}</h3>
          <form onSubmit={handleSave}>
            <label>Name
              <input value={name} onChange={e=>setName(e.target.value)} required />
            </label>
            <label>Email
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            </label>
            <label>Subject
              <input value={subject} onChange={e=>setSubject(e.target.value)} />
            </label>
            <label>Designation
              <input value={designation} onChange={e=>setDesignation(e.target.value)} />
            </label>
            <label>Department
              <input value={department} onChange={e=>setDepartment(e.target.value)} />
            </label>
            <div className="tm-form-actions">
              <button type="submit" className="primary">{mode === 'add' ? 'Save' : 'Update'}</button>
              {mode === 'edit' && <button type="button" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="tm-table">
          <h3>Teachers</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Subject</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 && (
                <tr><td colSpan="6" style={{textAlign:'center',padding:'1rem'}}>No teachers yet</td></tr>
              )}
              {teachers.map(t => (
                <React.Fragment key={t.id}>
                  <tr>
                    <td>{t.name}</td>
                    <td>{t.email}</td>
                    <td>{t.subject}</td>
                    <td>{t.designation}</td>
                    <td>{t.department}</td>
                    <td className="actions">
                      <button onClick={()=>handleEdit(t)}>Edit</button>
                      <button onClick={()=>openTimetablePage(t.id)}>Timetable</button>
                      <button className="danger" onClick={()=>handleDelete(t.id)}>Delete</button>
                    </td>
                  </tr>
                
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <style>{`\
        .tm-root { padding: 20px; font-family: Arial, Helvetica, sans-serif; }\
        h2 { margin: 0 0 12px 0 }\
        .tm-grid { display: flex; gap: 20px; align-items: flex-start }\
        .tm-form { width: 320px; background: #fff; padding: 16px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.06) }\
        .tm-table { flex:1; background:#fff; padding:16px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.06) }\
        label { display:block; margin-bottom:10px; font-size:14px }\
        input[type="text"], input[type="email"], input[type="time"], select { width:100%; padding:8px; box-sizing:border-box; border:1px solid #ddd; border-radius:4px }\
        .tm-form-actions { display:flex; gap:8px; margin-top:8px }\
        button { padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#f3f3f3; cursor:pointer }\
        button.primary { background:#0366d6; color:#fff; border-color:#0366d6 }\
        button.danger { background:#d9534f; color:#fff; border-color:#d9534f }\
        button.small { padding:6px 8px; font-size:13px }\
        table { width:100%; border-collapse:collapse }\
        th, td { padding:10px; border-bottom:1px solid #eee; text-align:left }\
        tr.tt-row td { background:#fbfbfb }\
        .tt-container { display:flex; gap:20px; align-items:flex-start }\
        .tt-form { min-width:260px }\
        .tt-list ul { margin:0; padding-left:18px }\
        .muted { color:#777 }\
        .actions button { margin-right:6px }\
      `}</style>
    </div>
  );
}
