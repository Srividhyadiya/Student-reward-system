import React, { useState, useEffect } from 'react';
import './TeacherManager.css';

const STORAGE_KEY = 'teachers';

function loadTeachers(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ return []; }
}
function saveTeachers(list){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }catch(e){ console.error(e); } }

// generate times like '07:00','07:30' at given step
function generateTimes(start='07:00', end='18:00', step=30){
  const toMinutes = (s)=>{ const [hh,mm]=s.split(':').map(Number); return hh*60+mm };
  const pad = (n)=> String(n).padStart(2,'0');
  const out=[]; let cur=toMinutes(start); const last=toMinutes(end);
  while(cur<=last){ const hh=Math.floor(cur/60); const mm=cur%60; out.push(`${pad(hh)}:${pad(mm)}`); cur+=step; }
  return out;
}

export default function TeacherManager(){
  const [teachers, setTeachers] = useState(()=>loadTeachers());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTtOpen, setIsTtOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTeacher, setActiveTeacher] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsTeacher, setDetailsTeacher] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('All');

  // form
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [uploading, setUploading] = useState(false);

  // timetable form
  const [ttDay, setTtDay] = useState('Monday');
  const [ttStart, setTtStart] = useState('09:00');
  const [ttEnd, setTtEnd] = useState('10:00');
  // per-slot fields: department and semester (replacing old className)
  const [ttDepartment, setTtDepartment] = useState('');
  const [ttSemester, setTtSemester] = useState('');
  const [ttSubject, setTtSubject] = useState('');
  // clear form fields when modal opens
  const [ttSection, setTtSection] = useState('');

  useEffect(()=>{ saveTeachers(teachers); },[teachers]);

  // try to load from server on first render; fallback to localStorage if server unavailable
  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try{
        const res = await fetch('/api/admin/teacher');
        if(!res.ok) throw new Error('server fetch failed');
        const data = await res.json();
        if(mounted && Array.isArray(data) && data.length>0){
          setTeachers(data);
        }
      }catch(err){
        // keep local cache
        console.warn('Could not fetch teachers from server, using local cache.', err);
      }
    })();
    return ()=>{ mounted=false };
  },[]);

  const openAdd = ()=> openAddWithFields();
  const openEdit = (t)=> openEditWithFields(t);
  // ensure designation/department are prefixed when opening modals
  const openEditWithFields = (t)=>{ setEditing(t); setTeacherId(t.id||''); setName(t.name||''); setSubject(t.subject||''); setDesignation(t.designation||''); setDepartment(t.department||''); setEmail(t.email||''); setPhone(t.phone||''); setImageUrl(t.imageUrl||''); setIsAddOpen(true); }
  const openAddWithFields = ()=>{ setEditing(null); setTeacherId(''); setName(''); setSubject(''); setDesignation(''); setDepartment(''); setEmail(''); setPhone(''); setImageUrl(''); setIsAddOpen(true); }

  const handleImageFileChange = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      let res = await fetch('/api/admin/teacher/upload', { method: 'POST', body: fd });
      // If proxy isn't active in dev, fall back to direct backend URL
      if (res.status === 404) {
        console.warn('/api upload returned 404, retrying direct backend URL');
        res = await fetch('http://localhost:5000/api/admin/teacher/upload', { method: 'POST', body: fd });
      }
      if (!res.ok) {
        const text = await res.text().catch(()=>null);
        console.error('upload response not ok', res.status, text);
        throw new Error('Upload failed');
      }
      const json = await res.json();
      if (json && json.url) {
        setImageUrl(json.url);
      } else {
        console.warn('Upload returned no url', json);
      }
    } catch (err) {
      console.error('Image upload error', err);
      alert('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const saveTeacher = (e)=>{ e.preventDefault(); if(!name.trim()) return;
    const newIdRaw = (teacherId||'').trim();
    const newId = newIdRaw || (crypto?.randomUUID?.() || String(Date.now()));
    // ensure id uniqueness (unless editing same record)
    const conflict = teachers.some(x=> x.id===newId && (!editing || x.id !== editing.id));
    if(conflict){ alert('ID already in use by another teacher. Choose a unique ID.'); return; }

    if(editing){
      const next = teachers.map(x=> x.id===editing.id ? { ...x, id:newId, name:name.trim(), subject:subject.trim(), designation:designation.trim(), department:department.trim(), email:email.trim(), phone:phone.trim(), imageUrl:imageUrl.trim() } : x);
      setTeachers(next);
      // sync to server (upsert)
      try{ fetch('/api/admin/teacher', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(next.find(x=>x.id===newId)) }).catch(e=>console.error('sync teacher',e)); }catch(e){console.error(e)}
    } else {
      const newTeacher = { id:newId, name:name.trim(), subject:subject.trim(), designation:designation.trim(), department:department.trim(), email:email.trim(), phone:phone.trim(), imageUrl:imageUrl.trim(), timetable:[] };
      setTeachers([ newTeacher, ...teachers]);
      // sync to server (upsert)
      try{ fetch('/api/admin/teacher', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newTeacher) }).catch(e=>console.error('sync teacher',e)); }catch(e){console.error(e)}
    }
    setIsAddOpen(false);
  };

  const removeTeacher = (id)=>{ if(!confirm('Delete this teacher?')) return; setTeachers(teachers.filter(t=>t.id!==id));
    // delete on server
    (async ()=>{
      try{ await fetch(`/api/admin/teacher/${encodeURIComponent(id)}`, { method:'DELETE' }); }catch(e){ console.error('delete teacher', e); }
    })();
  }

  const openTimetable = (t)=>{ setActiveTeacher(t); setTtDay('Monday'); setTtStart('09:00'); setTtEnd('10:00'); setTtDepartment(''); setTtSemester(''); setTtSubject(''); setTtSection(''); setIsTtOpen(true); }
  const openDetails = (t)=>{ setDetailsTeacher(t); setIsDetailsOpen(true); }
  const closeDetails = ()=>{ setDetailsTeacher(null); setIsDetailsOpen(false); }
  const addSlot = (e)=>{ e.preventDefault(); if(!activeTeacher) return; const entry = { day:ttDay, start:ttStart, end:ttEnd, subject: ttSubject, department: ttDepartment, semester: ttSemester, section: ttSection }; const next = teachers.map(t=> t.id===activeTeacher.id ? { ...t, timetable: Array.isArray(t.timetable)? [...t.timetable, entry] : [entry] } : t); setTeachers(next); const updated = next.find(x=>x.id===activeTeacher.id); setActiveTeacher(updated); setTtDepartment(''); setTtSemester(''); setTtSubject(''); setTtSection('');
    // sync updated teacher to server
    try{ fetch('/api/admin/teacher', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updated) }).catch(e=>console.error('sync slot',e)); }catch(e){console.error(e)}
  }

  const removeSlot = (index)=>{ if(!activeTeacher) return; if(!confirm('Delete this slot?')) return; const next = teachers.map(t=>{ if(t.id!==activeTeacher.id) return t; const tt = (t.timetable||[]).filter((_,i)=>i!==index); return { ...t, timetable: tt }; }); setTeachers(next); const updated = next.find(x=>x.id===activeTeacher.id); setActiveTeacher(updated);
    try{ fetch('/api/admin/teacher', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(updated) }).catch(e=>console.error('sync slot remove',e)); }catch(e){console.error(e)}
  }

  return (
    <div className="tm-root">
      <div className="tm-header">
        <div>
          <h1 className="tm-title">Academic Staff Management</h1>
          <div className="tm-subtitle">Manage teachers and their weekly timetables in real-time</div>
        </div>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          {/* department filter */}
          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
            <label style={{fontSize:12, color:'#6b7280'}}>Filter by Dept</label>
            <select value={departmentFilter} onChange={e=>setDepartmentFilter(e.target.value)} style={{minWidth:160}}>
              <option value="All">All Departments</option>
              {
                Array.from(new Set(teachers.map(t=> (t.department||'').trim()).filter(Boolean))).map(d=> (
                  <option key={d} value={d}>{d}</option>
                ))
              }
            </select>
          </div>
          <button className="tm-add-btn" onClick={openAdd}>Add New Teacher</button>
        </div>
      </div>

      <div className="tm-grid">
        {(departmentFilter === 'All' ? teachers : teachers.filter(t=> (t.department||'').trim() === departmentFilter)).map(t=> (
          <div className="teacher-card" key={t.id}>
            <div style={{display:'flex', gap:12, alignItems:'center'}}>
              {t.imageUrl ? <img src={t.imageUrl} alt={t.name} style={{width:64,height:64,objectFit:'cover',borderRadius:6}} /> : null}
              <div>
                <h4 className="teacher-name">{t.name}</h4>
                <p className="teacher-sub">{t.subject}</p>
              </div>
            </div>
            <div>
              <div className="teacher-meta">
                <div className="tt-label">Timetable Slots: {Array.isArray(t.timetable)? t.timetable.length : 0}</div>
                <div className="muted small">{t.designation ? t.designation : ''}{t.department ? ` · ${t.department}` : ''}</div>
                <div className="muted small" style={{marginTop:6}}>ID: {t.id}</div>
                {t.email && <div className="muted small">{t.email}</div>}
                {t.phone && <div className="muted small">{t.phone}</div>}
              </div>
            </div>
            <div className="card-actions">
              <button className="icon-btn" title="Details" onClick={()=>openDetails(t)} aria-label={`Details for ${t.name}`}>
                {/* simple info SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <circle cx="12" cy="12" r="10" stroke="#0f172a" strokeWidth="1.2" />
                  <rect x="11" y="10" width="2" height="6" rx="1" fill="#0f172a" />
                  <rect x="11" y="6" width="2" height="2" rx="1" fill="#0f172a" />
                </svg>
              </button>
              <button className="btn edit" onClick={()=>openEdit(t)}>Edit</button>
              <button className="btn timetable" onClick={()=>openTimetable(t)}>Timetable ({(t.timetable||[]).length})</button>
              <button className="btn delete" onClick={()=>removeTeacher(t.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isAddOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{editing? 'Edit Teacher' : 'Add Teacher'}</h3>
            <form onSubmit={saveTeacher}>
              <div className="form-row"><input placeholder="ID (optional - leave blank to auto-generate)" value={teacherId} onChange={e=>setTeacherId(e.target.value)} readOnly={!!editing} title={editing? 'ID cannot be changed while editing' : 'Optional - leave blank to auto-generate'} /></div>
              <div className="form-row"><input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required /></div>
              <div className="form-row"><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
              <div className="form-row"><input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
              <div className="form-row">
                <label style={{display:'block',marginBottom:6}}>Upload image</label>
                <input type="file" accept="image/*" onChange={handleImageFileChange} />
                <div style={{marginTop:8}}>
                  <input placeholder="Or paste image URL" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} style={{width:'100%'}} />
                </div>
                {uploading && <div className="muted small">Uploading...</div>}
                {imageUrl && <div style={{marginTop:8}}><img src={imageUrl} alt="preview" style={{width:120,height:80,objectFit:'cover',borderRadius:6}}/></div>}
              </div>
              <div className="form-row"><input placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} /></div>
              <div className="form-row"><input placeholder="Designation (e.g. Lecturer)" value={designation} onChange={e=>setDesignation(e.target.value)} /></div>
              {/* datalist provides suggestion from known departments */}
              <datalist id="dept-list">
                {Array.from(new Set(teachers.map(tt=> (tt.department||'').trim()).filter(Boolean))).map(d=> <option key={d} value={d} />)}
              </datalist>
              <div className="form-row">
                <input list="dept-list" placeholder="Department (e.g. Mathematics)" value={department} onChange={e=>setDepartment(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={()=>setIsAddOpen(false)}>Cancel</button>
                <button type="submit" className="tm-add-btn">Save Teacher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timetable Modal */}
      {isTtOpen && activeTeacher && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Manage Timetable for: {activeTeacher.name}</h3>
            <div className="slot-list">
              {(activeTeacher.timetable||[]).length===0 ? <div className="muted">No slots yet</div> : (
                (activeTeacher.timetable||[]).map((s,idx)=> (
                  <div className="slot-item" key={idx}>
                    <div className="meta">
                      <strong>{s.day}</strong> — <span className="small">{s.start}–{s.end}</span>
                {s.department ? <> — <em>{s.department}</em></> : null}
                {s.semester ? <> — <span className="small">Sem: {s.semester}</span></> : null}
                {s.section ? <> — <span className="small">Section: {s.section}</span></> : null}
                    </div>
                    <div><button className="btn delete" onClick={()=>removeSlot(idx)}>Delete</button></div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={addSlot} style={{marginTop:12}}>
              <div className="form-row">
                <select value={ttDay} onChange={e=>setTtDay(e.target.value)}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d=> <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={ttStart} onChange={e=>setTtStart(e.target.value)}>
                  {generateTimes().map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={ttEnd} onChange={e=>setTtEnd(e.target.value)}>
                  {generateTimes().map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <input value={ttDepartment} onChange={e=>setTtDepartment(e.target.value)} placeholder="Department (e.g. Mathematics)" />
              </div>
              <div className="form-row">
                <input value={ttSubject} onChange={e=>setTtSubject(e.target.value)} placeholder="Subject (e.g. Algebra)" />
              </div>
              <div className="form-row">
                <input value={ttSemester} onChange={e=>setTtSemester(e.target.value)} placeholder="Semester (e.g. 2)" />
              </div>
              <div className="form-row">
                <input value={ttSection} onChange={e=>setTtSection(e.target.value)} placeholder="Section (optional)" />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={()=>setIsTtOpen(false)}>Close</button>
                <button type="submit" className="tm-add-btn">Add Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsOpen && detailsTeacher && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Details — {detailsTeacher.name}</h3>
            <div style={{marginTop:8}}>
              <p><strong>ID:</strong> {detailsTeacher.id}</p>
              {detailsTeacher.email && <p><strong>Email:</strong> {detailsTeacher.email}</p>}
              {detailsTeacher.phone && <p><strong>Phone:</strong> {detailsTeacher.phone}</p>}
              {detailsTeacher.imageUrl && <p><strong>Image:</strong><br/><img src={detailsTeacher.imageUrl} alt={detailsTeacher.name} style={{width:120,height:120,objectFit:'cover',borderRadius:6}}/></p>}
              <p><strong>Subject:</strong> {detailsTeacher.subject}</p>
              <p><strong>Designation:</strong> {detailsTeacher.designation}</p>
              <p><strong>Department:</strong> {detailsTeacher.department}</p>
              <p><strong>Slots:</strong> {(detailsTeacher.timetable||[]).length}</p>
            </div>

            <div style={{marginTop:10}}>
              <h4 style={{margin:'8px 0'}}>Timetable summary</h4>
              {(detailsTeacher.timetable||[]).length===0 ? (
                <div className="muted">No slots</div>
              ) : (
                (detailsTeacher.timetable||[]).slice(0,5).map((s,idx)=> (
                  <div className="slot-item" key={idx}>
                    <div className="meta">
                      <strong>{s.day}</strong> — <span className="small">{s.start}–{s.end}</span>
                      {s.subject ? <> — <strong>{s.subject}</strong></> : null}
                      {s.department ? <> — <em>{s.department}</em></> : null}
                      {s.semester ? <> — <span className="small">Sem: {s.semester}</span></> : null}
                      {s.section ? <> — <span className="small">Section: {s.section}</span></> : null}
                    </div>
                  </div>
                ))
              )}
              {(detailsTeacher.timetable||[]).length > 5 && (
                <div className="muted small">and {(detailsTeacher.timetable||[]).length - 5} more...</div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" onClick={()=>{ closeDetails(); }}>Close</button>
              <button type="button" className="tm-add-btn" onClick={()=>{ closeDetails(); openTimetable(detailsTeacher); }}>View Timetable</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

