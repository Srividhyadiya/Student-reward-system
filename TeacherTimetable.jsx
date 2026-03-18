import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'teachers';

function loadTeachers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; }
}

function saveTeachers(list){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch(e){ console.error(e); }
}

export default function TeacherTimetable(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [day, setDay] = useState('Monday');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [dept, setDept] = useState('');
  const [sem, setSem] = useState('');
  const [slotSubject, setSlotSubject] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    // load teacher from backend (fallback to localStorage-based data if backend not available)
    (async ()=>{
      setLoading(true);
      try{
        let res;
        try{
          res = await fetch(`http://localhost:5000/api/admin/teacher`);
        }catch(e){
          res = await fetch(`/api/admin/teacher`);
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          // fallback to local storage approach
          const all = loadTeachers();
          const t = all.find(x=>x.id===id);
          setTeacher(t||null);
          return;
        }
        const list = await res.json();
        let t = Array.isArray(list) ? list.find(x=>String(x.id)===String(id)) : null;
        // normalize older slot entries that may have used `className` instead of `department`
        if (t && Array.isArray(t.timetable)) {
          t = { ...t, timetable: t.timetable.map(slot => ({
            day: slot.day,
            start: slot.start,
            end: slot.end,
            department: slot.department || slot.className || '',
            semester: slot.semester || slot.sem || '',
            subject: slot.subject || '',
            section: slot.section || ''
          })) };
        }
        setTeacher(t||null);
        if (t) {
          setDept(t.department || '');
          setSem('');
        }
      }catch(err){
        console.error('Error loading teachers from backend', err);
        // fallback
        const all = loadTeachers();
        const t = all.find(x=>x.id===id);
        setTeacher(t||null);
      } finally { setLoading(false); }
    })();
  },[id]);

  const handleAdd = async (e)=>{
    e.preventDefault();
    if(!teacher) return;
  // use full names to match server model: department, semester and subject
  const entry = { day, start, end, department: dept, semester: sem, subject: slotSubject };
    // update teacher.timetable locally
    const updated = { ...teacher, timetable: Array.isArray(teacher.timetable) ? [...teacher.timetable, entry] : [entry] };
    setTeacher(updated);
    // persist to backend (upsert)
    try{
      let res;
      try{
        res = await fetch('http://localhost:5000/api/admin/teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      }catch(e){
        res = await fetch('/api/admin/teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      }
      if (res.ok) {
        // reflect server response if needed
        const json = await res.json();
        if (json && json.teacher) setTeacher(json.teacher);
      } else {
        console.error('Failed saving timetable', await res.text());
      }
      // clear the add-form fields
      setDept('');
      setSem('');
      setSlotSubject('');
    }catch(err){ console.error('Error saving timetable', err); }
  };

  const handleDelete = async (idx)=>{
    if(!teacher) return;
    if(!confirm('Delete this timetable entry?')) return;
    const tt = (teacher.timetable||[]).filter((_,i)=> i!==idx);
    const updated = { ...teacher, timetable: tt };
    setTeacher(updated);
    try{
      let res;
      try{
        res = await fetch('http://localhost:5000/api/admin/teacher', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
        });
      }catch(e){
        res = await fetch('/api/admin/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      }
      if (res.ok) {
        const json = await res.json(); if (json && json.teacher) setTeacher(json.teacher);
      } else {
        console.error('Failed deleting timetable entry', await res.text());
      }
    }catch(err){ console.error('Error deleting timetable entry', err); }
  };

  if(loading) return <div style={{padding:20}}>Loading…</div>;
  if(!teacher) return (
    <div style={{padding:20}}>
      <p>Teacher not found.</p>
      <button onClick={()=>navigate('/admin/teacher-management')}>Back</button>
    </div>
  );

  return (
    <div style={{padding:20,fontFamily:'Arial,Helvetica,sans-serif'}}>
      <h2>Timetable for {teacher.name}</h2>
      <p><strong>Subject:</strong> {teacher.subject} &nbsp; <strong>Designation:</strong> {teacher.designation} &nbsp; <strong>Department:</strong> {teacher.department}</p>

      <div style={{marginTop:12,marginBottom:12}}>
        <form onSubmit={handleAdd} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <label>Day <select value={day} onChange={e=>setDay(e.target.value)}>
            {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d=> <option key={d} value={d}>{d}</option>)}
          </select></label>
          <label>Start <input type="time" value={start} onChange={e=>setStart(e.target.value)} required /></label>
          <label>End <input type="time" value={end} onChange={e=>setEnd(e.target.value)} required /></label>
          {/* Removed class option per request. Add dept and sem instead */}
          <label>Dept <input type="text" value={dept} onChange={e=>setDept(e.target.value)} placeholder={teacher.department || 'Dept'} required /></label>
          <label>Sem <input type="text" value={sem} onChange={e=>setSem(e.target.value)} placeholder="e.g. 2" required /></label>
          <label>Subject <input type="text" value={slotSubject} onChange={e=>setSlotSubject(e.target.value)} placeholder="e.g. Mathematics" required /></label>
          <button type="submit" style={{padding:'6px 10px'}}>Add Slot</button>
          <button type="button" onClick={()=>navigate('/admin/teacher-management')} style={{marginLeft:8}}>Back</button>
        </form>
      </div>

      <div style={{marginTop:16}}>
        <h3>Slots</h3>
        {(teacher.timetable||[]).length===0 ? <p className='muted'>No slots</p> : (
          <table style={{borderCollapse:'collapse',width:'100%'}}>
                  <thead><tr><th style={{borderBottom:'1px solid #ddd',textAlign:'left',padding:8}}>Day</th><th style={{borderBottom:'1px solid #ddd',padding:8}}>Start</th><th style={{borderBottom:'1px solid #ddd',padding:8}}>End</th><th style={{borderBottom:'1px solid #ddd',padding:8}}>Subject</th><th style={{borderBottom:'1px solid #ddd',padding:8}}>Department</th><th style={{borderBottom:'1px solid #ddd',padding:8}}>Semester</th><th style={{borderBottom:'1px solid #ddd',padding:8}}>Action</th></tr></thead>
            <tbody>
              {teacher.timetable.map((entry,idx)=> (
                <tr key={idx}>
                  <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>{entry.day}</td>
                  <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>{entry.start}</td>
                  <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>{entry.end}</td>
                  <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>{entry.subject || '-'}</td>
                  <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>{entry.department || '-'}</td>
                  <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>{entry.semester || '-'}</td>
                  <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}><button onClick={()=>handleDelete(idx)} style={{background:'#d9534f',color:'#fff',border:'none',padding:'6px 8px',borderRadius:4}}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
