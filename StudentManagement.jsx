import React, { useState, useEffect } from "react";
import { UserPlus, Users, X, Trash2 } from "lucide-react";
import "./StudentManagement.css";

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    roll: "",
    dept: "",
    section: "",
    sem: "",
    imageUrl: "",
    email: "",
    coins: 50, // Default 50 coins
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm('Delete this student? This action cannot be undone.');
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/student/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json && json.success) {
        // refresh list
        fetchStudents();
      } else {
        alert('Failed to delete student.');
      }
    } catch (err) {
      console.error('Delete error', err);
      alert('Server error while deleting student.');
    }
  };

  // For option A: selecting images that already exist inside `src/assets`.
  // The select input in the form sets `formData.imageUrl` directly via handleChange.

  // Upload a new image to the server (saves into server/uploads) and set imageUrl
  const handleStudentUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    try {
      const fd = new FormData();
      fd.append('image', file);
      let res = await fetch('/api/admin/student/upload', { method: 'POST', body: fd });
      // fallback if dev proxy not configured
      if (res.status === 404) {
        res = await fetch('http://localhost:5000/api/admin/student/upload', { method: 'POST', body: fd });
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Upload failed');
      }
      const json = await res.json();
      if (json && json.url) {
        setFormData(prev => ({ ...prev, imageUrl: json.url }));
      } else {
        alert(json.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Image upload error', err);
      // Surface server/response message to user to aid debugging
      alert(err && err.message ? String(err.message) : 'Failed to upload image');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.roll || !formData.dept || !formData.email || !formData.sem) {
      alert("Please fill in all required fields!");
      return;
    }

    const newStudent = {
      ...formData,
      coins: formData.coins ? parseInt(formData.coins) : 50,
    };

    // If admin didn't set a password, default it to the student's name so roll + name login works.
    // This is a convenience for development; consider hashing passwords in production.
    if (!newStudent.password) newStudent.password = newStudent.name;

    try {
  const response = await fetch("/api/admin/student", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(newStudent),
      });
      const result = await response.json();
      if (result.success) {
        // Fetch updated students list after adding
        fetchStudents();
        setFormData({ name: "", roll: "", dept: "", section: "", sem: "", imageUrl: "", email: "", coins: 50 });
        setShowForm(false);
      } else {
        // show server-provided message/details when available
        console.error('Add student failed:', result);
        const msg = result.message || 'Failed to add student to database.';
        if (result.details) {
          // if details is an object of field errors, join into a readable string
          try {
            const detailsText = typeof result.details === 'object'
              ? Object.entries(result.details).map(([k,v]) => `${k}: ${v}`).join('\n')
              : String(result.details);
            alert(`${msg}\n${detailsText}`);
          } catch (e) {
            alert(msg);
          }
        } else {
          alert(msg);
        }
      }
    } catch (err) {
      alert("Server error. Please try again later.");
    }
  };

  // Fetch all students from backend
  const fetchStudents = () => {
    fetch("/api/admin/student", { method: "GET" })
      .then((res) => res.json())
      .then((data) => {
        // handle older records that may still have `year` instead of `sem`
        const normalized = Array.isArray(data)
          ? data.map((s) => ({ ...s, sem: s.sem || s.year || "" }))
          : data;
        setStudents(normalized);
      })
      .catch(() => console.error("Error fetching students"));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div className="student-dashboard">
      <h1 className="page-title">Admin Dashboard</h1>

      <div className="card">
        <div className="card-header">
          <div className="header-left">
            <Users size={28} color="#4f46e5" />
            <h2>Student Roster Management</h2>
          </div>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            <UserPlus size={18} />
            <span>Add New Student</span>
          </button>
        </div>

        <div className="table-container">
          <h3 className="table-title">
            Current Student Roster ({students.length})
          </h3>

          <table className="student-table">
            <thead>
              <tr>
                <th>PHOTO</th>
                <th>NAME</th>
                <th>ROLL NO</th>
                <th>CLASS/DEPT</th>
                <th>SECTION</th>
                <th>SEM</th>
                <th>EMAIL</th>
                <th>EDUCOINS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-msg">
                    No student records found.
                  </td>
                </tr>
              ) : (
                students.map((s, i) => (
                  <tr key={s._id || i}>
                    <td>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>-</div>
                      )}
                    </td>
                    <td>{s.name}</td>
                    <td>{s.roll}</td>
                    <td>{s.dept}</td>
                    <td>{s.section || '-'}</td>
                    <td>{s.sem}</td>
                    <td>{s.email}</td>
                    <td className="coins">{s.coins}</td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(s._id)}
                        title="Delete student"
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Student</h3>
              <button
                className="close-btn"
                onClick={() => setShowForm(false)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="student-form" autoComplete="on">
              <label htmlFor="name">Name<span>*</span></label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />

              <label htmlFor="roll">Roll No<span>*</span></label>
              <input
                id="roll"
                name="roll"
                type="text"
                autoComplete="off"
                value={formData.roll}
                onChange={handleChange}
                placeholder="Enter roll number"
                required
              />

              <label htmlFor="dept">Class/Dept<span>*</span></label>
              <input
                id="dept"
                name="dept"
                type="text"
                autoComplete="off"
                value={formData.dept}
                onChange={handleChange}
                placeholder="Enter class or department"
                required
              />

              <label htmlFor="section">Section</label>
              <input
                id="section"
                name="section"
                type="text"
                autoComplete="off"
                value={formData.section}
                onChange={handleChange}
                placeholder="Enter section (optional)"
              />

              <label htmlFor="sem">Sem<span>*</span></label>
              <input
                id="sem"
                name="sem"
                type="text"
                autoComplete="off"
                value={formData.sem}
                onChange={handleChange}
                placeholder="Enter semester (e.g. 2nd Sem)"
                required
              />

              <label htmlFor="upload">Upload Photo (or choose existing asset)</label>
              <input id="upload" name="upload" type="file" accept="image/*" onChange={handleStudentUpload} />

              {/* Removed asset-picker per request; admins can upload images only */}

              {formData.imageUrl && (
                <div style={{ gridColumn: 'span 2', marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <img src={formData.imageUrl} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ fontSize: 0.95 + 'rem', color: '#374151' }}>Preview</div>
                </div>
              )}


              <label htmlFor="email">Email<span>*</span></label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                required
              />

              <label htmlFor="coins">EduCoins (default: 50)</label>
              <input
                id="coins"
                name="coins"
                type="number"
                autoComplete="off"
                value={formData.coins}
                onChange={handleChange}
                placeholder="Enter coins"
              />

              <button type="submit" className="submit-btn" title="Save Student" aria-label="Save Student">
                Save Student
              </button>
            </form>
          </div>
        </div>
      )}
    <style>{`
      /* compact modal & form styles to reduce size and spacing and prevent overflow */
      .modal-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        background: rgba(0,0,0,0.35);
        z-index: 80;
      }

      .modal {
        max-width: 520px; /* slightly narrower */
        width: 100%;
        padding: 14px;
        box-sizing: border-box;
        border-radius: 10px;
        background: #fff;
        /* prevent modal from exceeding viewport height */
        max-height: 80vh;
        overflow: auto;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1rem;
      }

      .student-form {
        -webkit-user-select: auto;
        user-select: auto;
        display: grid;
        grid-template-columns: 1fr 1fr; /* two-column compact layout on wide screens */
        gap: 8px 10px;
        align-items: start;
      }

      /* make each label span both columns for clarity where needed */
      .student-form label {
        grid-column: span 2;
        font-size: 0.87rem;
        margin-bottom: 4px;
      }

      .student-form input,
      .student-form select,
      .student-form textarea {
        width: 100%;
        padding: 6px 8px;
        font-size: 0.92rem;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        box-sizing: border-box;
      }

      /* make the submit button span both columns and be compact */
      .student-form .submit-btn {
        grid-column: span 2;
        padding: 8px 10px;
        font-size: 0.95rem;
        border-radius: 8px;
      }

      /* responsive: stack inputs on small screens */
      @media (max-width: 720px) {
        .student-form {
          grid-template-columns: 1fr;
        }
        .student-form label { grid-column: span 1; }
        .student-form .submit-btn { grid-column: span 1; }
        .modal { padding: 12px; }
      }
    `}</style>
    <style>{`
      /* delete button styling */
      .delete-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px;
        border-radius: 6px;
        border: 1px solid transparent;
        background: transparent;
        color: #ef4444; /* red */
        cursor: pointer;
      }
      .delete-btn:hover { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.12); }
    `}</style>
    </div>
  );
}
