import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './IssuedStudents.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export default function IssuedStudents(){
  const navigate = useNavigate();
  const [issued, setIssued] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState('');
  const [sem, setSem] = useState('');
  const [section, setSection] = useState('');
  const [query, setQuery] = useState('');

  useEffect(()=>{ fetchIssued(); }, []);

  async function fetchIssued(){
    setLoading(true);
    try{
      const res = await fetch(`${API_BASE}/api/library/issued?active=true`);
      if(!res.ok) throw new Error('Failed fetching');
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (json.issued || json.data || []);
      setIssued(arr || []);
    }catch(err){ console.error('fetchIssued', err); setIssued([]); }
    finally{ setLoading(false); }
  }

  const filtered = useMemo(()=>{
    return issued.filter(it => {
      if(dept && String(it.department).toLowerCase() !== String(dept).toLowerCase()) return false;
      if(sem && String(it.semester) !== String(sem)) return false;
      if(section && String(it.section).toLowerCase() !== String(section).toLowerCase()) return false;
      if(query){ const q = String(query).toLowerCase(); if(!((it.studentName||'').toLowerCase().includes(q) || (it.studentId||'').toLowerCase().includes(q))) return false; }
      return true;
    });
  }, [issued, dept, sem, section, query]);

  function reset(){ setDept(''); setSem(''); setSection(''); setQuery(''); }

  async function handleReturn(id){
    if(!confirm('Mark this book as returned?')) return;
    try{
      const res = await fetch(`${API_BASE}/api/library/return-with-educoin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuedId: id }),
      });
      const json = await res.json();
      if(!res.ok || !json.success) { alert(json?.message || 'Return failed'); return; }
      fetchIssued();
      alert('Book returned successfully');
    }catch(err){ console.error(err); alert('Server error'); }
  }

  function exportCSV(){
    const rows = [['Student Name','Student ID','Dept','Semester','Section','Book Title','Issue Date','Return Date','EduCoins']];
    filtered.forEach(it => rows.push([it.studentName||'', it.studentId||'', it.department||'', it.semester||'', it.section||'', it.bookTitle||'', it.issueDate?new Date(it.issueDate).toLocaleDateString():'' , it.returnDate?new Date(it.returnDate).toLocaleDateString():'' , it.edcoins||'' ]));
    const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'issued_students.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="issued-page">
      <div className="issued-container">
        <div className="issued-header">
          <div className="issued-title">Issued Students</div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-muted" onClick={()=>navigate('/library')}>Back to Dashboard</button>
            <button className="btn btn-secondary export-btn" onClick={exportCSV}>Export</button>
          </div>
        </div>

        <div className="filter-bar">
          <select className="filter-select" value={dept} onChange={e=>setDept(e.target.value)}>
            <option value="">All Departments</option>
            <option>MCA</option>
            <option>MBA</option>
            <option>BCA</option>
            <option>BCOM</option>
          </select>
          <select className="filter-select" value={sem} onChange={e=>setSem(e.target.value)}>
            <option value="">All Semesters</option>
            <option value="1">Sem 1</option>
            <option value="2">Sem 2</option>
            <option value="3">Sem 3</option>
            <option value="4">Sem 4</option>
            <option value="5">Sem 5</option>
            <option value="6">Sem 6</option>
          </select>
          <select className="filter-select" value={section} onChange={e=>setSection(e.target.value)}>
            <option value="">All Sections</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </select>
          <input className="filter-input" placeholder="Search by name or ID" value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="btn btn-muted" onClick={reset}>Reset Filters</button>
        </div>

        {loading ? <div>Loading…</div> : (
          filtered.length === 0 ? <div style={{marginTop:20}}>No issued students found.</div> : (
            <div style={{marginTop:12}}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>ID</th>
                    <th>Dept / Sem / Sec</th>
                    <th>Book</th>
                    <th>Issued</th>
                    <th>Return</th>
                    <th>EduCoins</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(it => (
                    <tr key={it._id}>
                      <td><strong>{it.studentName}</strong></td>
                      <td className="muted">{it.studentId}</td>
                      <td className="small">{it.department} / {it.semester} / {it.section}</td>
                      <td className="small">{it.bookTitle}</td>
                      <td className="muted">{it.issueDate ? new Date(it.issueDate).toLocaleDateString() : ''}</td>
                      <td className="muted">{it.returnDate ? new Date(it.returnDate).toLocaleDateString() : ''}</td>
                      <td className="muted">{it.edcoins || 1}</td>
                      <td className="row-action">
                        <button className="btn btn-primary" onClick={()=>handleReturn(it._id)}>Return Book</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
