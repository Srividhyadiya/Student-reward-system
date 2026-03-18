import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './IssueBook.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export default function IssueBook(){
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [selectedClassKey, setSelectedClassKey] = useState(null);
  const [issuedSet, setIssuedSet] = useState(new Set());
  const [issuedList, setIssuedList] = useState([]);
  const [issuedDept, setIssuedDept] = useState('all');

  useEffect(()=>{
    async function load(){
      try{
        const [sRes, bRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/student`),
          fetch(`${API_BASE}/api/library/books`)
        ]);
        if(!sRes.ok) throw new Error('Failed to fetch students: ' + sRes.status);
        if(!bRes.ok) throw new Error('Failed to fetch books: ' + bRes.status);
  const sJson = await sRes.json();
  const bJson = await bRes.json();
  // server responses may be wrapped: { success: true, students: [...] } or raw array
  const studentsData = Array.isArray(sJson) ? sJson : (sJson.students || sJson.data || sJson || []);
  const booksData = Array.isArray(bJson) ? bJson : (bJson.books || bJson.data || bJson || []);
  setStudents(studentsData || []);
  setBooks(booksData || []);
        // fetch active issued books to mark students who currently have issued copies
        try{
          const issuedRes = await fetch(`${API_BASE}/api/library/issued?active=true`);
          if (issuedRes.ok) {
            const issuedJson = await issuedRes.json();
            const issuedArr = Array.isArray(issuedJson) ? issuedJson : (issuedJson.issued || issuedJson.data || []);
            // include studentId, roll and any studentRoll fields so matching works regardless of which one is stored
            const s = new Set();
            (issuedArr || []).forEach(x => {
              if (x && x.studentId) s.add(String(x.studentId));
              if (x && x.studentRollNo) s.add(String(x.studentRollNo));
              if (x && x.studentRoll) s.add(String(x.studentRoll));
              if (x && x.roll) s.add(String(x.roll));
            });
            setIssuedSet(s);
            setIssuedList(issuedArr || []);
          }
        }catch(e){ console.warn('Could not fetch issued books', e); }
      }catch(err){
        console.error('IssueBook load error', err);
        setStudents([]);
        setBooks([]);
      }finally{ setLoading(false); }
    }
    load();
  },[]);

  // helper: start of today for date comparisons
  const todayStart = useMemo(()=>{
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }, []);

  const groups = useMemo(()=>{
    const map = new Map();
    students.forEach(s=>{
      const dept = s.department || s.dept || 'General';
      const sem = s.semester || s.sem || s.sem_no || 'NA';
      const section = s.section || s.sectionName || '';
      const key = `${dept}||${sem}||${section}`;
      if(!map.has(key)) map.set(key, { dept, sem, section, students: [] });
      map.get(key).students.push(s);
    });
    return Array.from(map.values());
  },[students]);

  function openModalFor(student){
    setSelectedStudent(student);
    setSelectedBookId('');
    // set today's date as issueDate and clear return/due
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    setIssueDate(`${yyyy}-${mm}-${dd}`);
    // default return date = today + 5 days
    const due = new Date(today);
    due.setDate(due.getDate() + 5);
    const dyyyy = due.getFullYear();
    const dmm = String(due.getMonth()+1).padStart(2,'0');
    const ddd = String(due.getDate()).padStart(2,'0');
    setDueDate(`${dyyyy}-${dmm}-${ddd}`);
    setShowModal(true);
  }

  function closeModal(){ setShowModal(false); setSelectedStudent(null); }

  async function handleIssue(){
    if(!selectedBookId){ alert('Please select a book to issue'); return; }
    if(!dueDate){ alert('Please set a return date'); return; }
    if(!selectedStudent) return;
    setIssuing(true);
    try{
      const payload = {
        // send the student's roll as studentId (preferred) so issued records are keyed by roll
        studentId: selectedStudent.roll || selectedStudent.rollNo || selectedStudent.roll_no || selectedStudent.registerNumber || selectedStudent.reg_no || selectedStudent._id || selectedStudent.studentId || selectedStudent.barcode || '',
        // also include an explicit studentRoll for clarity
        studentRoll: selectedStudent.roll || selectedStudent.rollNo || selectedStudent.roll_no || selectedStudent.registerNumber || selectedStudent.reg_no || '',
        studentName: selectedStudent.name || selectedStudent.studentName || selectedStudent.firstName || '',
        department: selectedStudent.department || selectedStudent.dept || '',
        semester: selectedStudent.semester || selectedStudent.sem || selectedStudent.sem_no || '',
        section: selectedStudent.section || selectedStudent.sectionName || '',
        bookId: selectedBookId,
        issueDate: issueDate || new Date().toISOString(),
        returnDate: dueDate,
        edcoins: 0,
        issuedBy: 'librarian'
      };

      const res = await fetch(`${API_BASE}/api/library/issue`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if(!res.ok || !json.success){
        alert(json?.message || 'Failed to issue book');
        return;
      }

      // update local books list: decrement the count for the issued book
      const updatedBook = json.book;
      setBooks(prev => prev.map(b => {
        if(String(b._id) === String(updatedBook._id) || String(b.id) === String(updatedBook.id)){
          return { ...b, count: updatedBook.count };
        }
        return b;
      }));

      // if server returned the issued record, prepend it so the issued-books table updates immediately
      if(json.issued){
        try{
          setIssuedList(prev => [json.issued, ...(prev || [])]);
        }catch(e){ /* ignore */ }
      }

      // update issuedSet to mark student as having an issued book
      setIssuedSet(prev => {
        const next = new Set(prev);
        if(payload.studentId) next.add(String(payload.studentId));
        if(payload.studentRoll) next.add(String(payload.studentRoll));
        return next;
      });

      alert(`✅ Book issued successfully to ${payload.studentName}`);
      closeModal();
    }catch(err){
      console.error('Issue error', err);
      alert('Server error while issuing book');
    }finally{ setIssuing(false); }
  }

  async function handleReturn(issuedRecord, student, rollVal){
    if(!issuedRecord || !issuedRecord._id) return;
    if(!confirm(`Mark the book "${issuedRecord.bookTitle || issuedRecord.bookId}" as returned for ${student.name || student.studentName || student.firstName || rollVal}?`)) return;
    try{
      const res = await fetch(`${API_BASE}/api/library/return/${issuedRecord._id}`, { method: 'POST' });
      const json = await res.json();
      if(!res.ok || !json.success){
        alert(json?.message || 'Failed to return book');
        return;
      }

      // Remove the issued record from local issuedList (so it no longer appears as active)
      setIssuedList(prev => (prev || []).filter(i => String(i._id) !== String(issuedRecord._id)));

      // Remove student identifiers from issuedSet so badge disappears
      setIssuedSet(prev => {
        const next = new Set(prev);
        try{ next.delete(String(rollVal)); }catch(e){}
        try{ next.delete(String(student._id)); }catch(e){}
        try{ next.delete(String(student.studentId)); }catch(e){}
        return next;
      });

      // Increment local book count (best-effort: server incremented it)
      setBooks(prev => (prev || []).map(b => {
        if(String(b._id) === String(issuedRecord.bookId) || String(b.id) === String(issuedRecord.bookId)){
          return { ...b, count: (Number(b.count) || 0) + 1 };
        }
        return b;
      }));

      alert('Book returned and inventory updated');
    }catch(err){
      console.error('Return error', err);
      alert('Server error while returning book');
    }
  }

  const filteredIssuedList = useMemo(() => {
    return (issuedList || []).filter(item => {
      const dept = item.department || item.dept || 'General';
      return issuedDept === 'all' ? true : dept === issuedDept;
    });
  }, [issuedList, issuedDept]);

  return (
    <div className="issue-page">
      <div className="issue-container">
        <div className="issue-hero">
          <div>
            <p className="issue-kicker">Library Operations</p>
            <h2 className="issue-title">Issue Book</h2>
            <p className="issue-subtitle">Select a class, choose a student, and issue a book with proper return scheduling.</p>
          </div>
          <div className="issue-header-right">
            <span className="issue-hint">Click a class to view students</span>
            <button className="btn-secondary" onClick={()=>navigate('/library')}>Back to Dashboard</button>
          </div>
        </div>

        {loading ? <div className="issue-empty">Loading students and books...</div> : (
          groups.length === 0 ? <div className="issue-empty">No students found.</div> : (
            <div className="class-grid">
              {groups.map((g, idx)=> {
                const key = `${g.dept}||${g.sem}||${g.section}`;
                const expanded = selectedClassKey === key;
                return (
                  <div
                    className={`class-card ${expanded ? 'expanded' : ''}`}
                    key={`${g.dept}-${g.sem}-${g.section}-${idx}`}
                    onClick={()=> setSelectedClassKey(expanded ? null : key)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="class-title">{g.dept} — Sem {g.sem}{g.section ? ` — ${g.section}` : ''}</div>
                    <div className="students-list">
                      {g.students.map(st => {
                        // prefer canonical `roll` field, then common aliases and nested locations
                        const rollVal = st.roll || st.rollNo || st.roll_no || st.registerNumber || st.reg_no || st.details?.roll || st.details?.rollNo || st.details?.roll_no || st.studentDetails?.roll || st.studentDetails?.rollNo || st.studentDetails?.roll_no || st.studentId || st.barcode || st._id || '';

                        // find an active issued record for this student (returned !== true)
                        const activeIssue = (issuedList || []).find(it => {
                          if(!it) return false;
                          if(it.returned) return false; // ignore returned
                          const candidates = [it.studentId, it.studentRoll, it.studentRollNo, it.roll, it.studentId];
                          // match by rollVal or fallback to student _id/studentId
                          if(candidates.some(c => c && String(c) === String(rollVal))) return true;
                          if(it.studentId && (String(it.studentId) === String(st._id) || String(it.studentId) === String(st.studentId))) return true;
                          return false;
                        }) || null;

                        const hasIssued = Boolean(activeIssue) || (issuedSet && (issuedSet.has(String(rollVal)) || issuedSet.has(String(st._id)) || issuedSet.has(String(st.studentId))));

                        // overdue if there's an active issue and returnDate is before today
                        const isOverdue = Boolean(activeIssue && activeIssue.returnDate && (new Date(activeIssue.returnDate) < todayStart));

                        return (
                          <div className="student-row" key={st._id || st.id || st.registerNumber || st.rollNo || st.reg_no}>
                            <div className="student-meta">
                              <div className="student-id">Roll No: {rollVal}</div>
                              <div className="student-name-row">
                                <div className="student-name">{st.name || st.studentName || st.firstName || 'Unnamed'}</div>
                                {isOverdue ? (
                                  <span className="status-chip status-overdue">Overdue</span>
                                ) : hasIssued ? (
                                  <span className="status-chip status-issued">Issued</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="student-actions">
                              <button
                                className="issue-small"
                                onClick={(e)=>{ e.stopPropagation(); if(!hasIssued) openModalFor(st); }}
                                disabled={!!hasIssued}
                                title={hasIssued ? (isOverdue ? 'Student has an overdue issued book' : 'Student already has an issued book') : 'Issue book to student'}
                              >
                                📚 Issue Book
                              </button>

                              {hasIssued && activeIssue ? (
                                <button
                                  className="return-small"
                                  onClick={(e)=>{ e.stopPropagation(); navigate('/library/returned-list', { state: { openScanner: true, expectedRoll: String(rollVal), expectedIssuedId: activeIssue._id } }); }}
                                  title={`Return book: ${activeIssue.bookTitle || activeIssue.bookId}`}
                                >
                                  ↩️ Return Book
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {showModal && selectedStudent && (
          <div className="modal-backdrop" onMouseDown={closeModal}>
            <div className="modal-card" onMouseDown={e=>e.stopPropagation()}>
              <div className="modal-title">Issue Book to {selectedStudent.name || selectedStudent.studentName || selectedStudent.firstName}</div>

              <div className="modal-row">
                <label className="modal-label">Roll No</label>
                <input className="modal-input" readOnly value={selectedStudent.roll || selectedStudent.rollNo || selectedStudent.roll_no || selectedStudent.registerNumber || selectedStudent.reg_no || selectedStudent._id || selectedStudent.barcode || selectedStudent.studentId || ''} />
              </div>
              <div className="modal-row">
                <label className="modal-label">Name</label>
                <input className="modal-input" readOnly value={selectedStudent.name || selectedStudent.studentName || selectedStudent.firstName || ''} />
              </div>
              <div className="modal-row">
                <label className="modal-label">Department</label>
                <input className="modal-input" readOnly value={selectedStudent.department || selectedStudent.dept || ''} />
              </div>
              <div className="modal-row">
                <label className="modal-label">Semester</label>
                <input className="modal-input" readOnly value={selectedStudent.semester || selectedStudent.sem || selectedStudent.sem_no || ''} />
              </div>
              <div className="modal-row">
                <label className="modal-label">Section</label>
                <input className="modal-input" readOnly value={selectedStudent.section || selectedStudent.sectionName || ''} />
              </div>

              <div className="modal-row">
                <label className="modal-label">EduCoins</label>
                <input className="modal-input" readOnly value={0} />
              </div>

              <div className="modal-row">
                <label className="modal-label">Book</label>
                <select className="modal-select" value={selectedBookId} onChange={e=>setSelectedBookId(e.target.value)}>
                  <option value="">— select a book —</option>
                  {books.filter(b => (typeof b.count === 'undefined' ? true : b.count > 0)).map(b=> (
                    <option key={b._id || b.id} value={b._id || b.id}>{b.title || b.name} {b.author ? ` — ${b.author}` : ''} {b.count ? `(${b.count})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="modal-row">
                <label className="modal-label">Issue Date</label>
                <div className="modal-date-row">
                  <input className="modal-input" type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} />
                  <div className="modal-day">{(function(d){ try{ const dt = new Date(d); if (isNaN(dt)) return ''; return dt.toLocaleDateString(undefined,{ weekday: 'long' }); }catch(e){return '';} })(issueDate)}</div>
                </div>
              </div>
              <div className="modal-row">
                <label className="modal-label">Return Date</label>
                <div className="modal-date-row">
                  <input className="modal-input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
                  <div className="modal-day">{(function(d){ try{ const dt = new Date(d); if (isNaN(dt)) return ''; return dt.toLocaleDateString(undefined,{ weekday: 'long' }); }catch(e){return '';} })(dueDate)}</div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={closeModal} disabled={issuing}>Cancel</button>
                <button className="btn-primary" onClick={handleIssue} disabled={issuing}>{issuing ? 'Issuing…' : 'Confirm Issue'}</button>
              </div>
            </div>
          </div>
        )}
        {/* Permanently visible issued-books table (filterable by department) */}
        <div className="issued-section">
          <div className="issued-topbar">
            <div className="issued-title">Issued Books</div>
            <div className="issued-filter-wrap">
              <label className="issued-filter-label">Filter by Department</label>
              <select value={issuedDept} onChange={e=>setIssuedDept(e.target.value)} className="issued-filter-select">
                <option value="all">All</option>
                {Array.from(new Set((issuedList || []).map(i => (i.department || i.dept || 'General')))).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="issued-table-wrap">
            <table className="issued-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Book</th>
                  <th>Issued</th>
                  <th>Return</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssuedList.length === 0 ? (
                  <tr><td colSpan={6} className="issued-empty">No records found.</td></tr>
                ) : (
                  filteredIssuedList.map(item => (
                    <tr key={item._id || `${item.studentId}-${item.bookId}`}>
                      <td>{item.studentName || item.studentId}</td>
                      <td>{item.roll || item.studentRoll || item.studentRollNo || item.studentId}</td>
                      <td>{item.department || item.dept || 'General'}</td>
                      <td>{item.bookTitle || item.bookId}</td>
                      <td>{item.issueDate ? new Date(item.issueDate).toLocaleDateString() : ''}</td>
                      <td>{item.returnDate ? new Date(item.returnDate).toLocaleDateString() : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

