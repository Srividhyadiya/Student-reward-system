import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DueList.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export default function DueList() {
  const navigate = useNavigate();
  const [issuedList, setIssuedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [libraryWallet, setLibraryWallet] = useState(0);
  const [returningId, setReturningId] = useState('');
  const [flash, setFlash] = useState('');

  async function fetchLibraryWallet() {
    try {
      const res = await fetch(`${API_BASE}/api/library/credit`);
      if (!res.ok) return;
      const j = await res.json();
      const raw = typeof j?.amount_credited !== 'undefined' ? j.amount_credited : j?.library?.amount_credited;
      const amount = typeof raw === 'number' ? raw : Number(raw || 0);
      setLibraryWallet(Number.isFinite(amount) ? amount : 0);
    } catch (e) {
      console.warn('Failed to fetch library wallet', e);
    }
  }

  async function fetchIssued(){
    setLoading(true);
    setError(null);
    try{
      const res = await fetch(`${API_BASE}/api/library/issued?active=true`);
      if(!res.ok) throw new Error('Failed to fetch issued records: ' + res.status);
      const j = await res.json();
      const arr = Array.isArray(j) ? j : (j.issued || j.data || []);
      setIssuedList(arr || []);

      // For any overdue record (returnDate before today) compute days overdue and
      // update the edcoins field in the issued_books collection to that days value (overwrite existing).
      try{
        const todayStart = new Date((new Date()).getFullYear(), (new Date()).getMonth(), (new Date()).getDate());
        const toUpdate = (arr || []).filter(it => {
          if(!it || !it.returnDate) return false;
          if(it.returned) return false;
          const rd = new Date(it.returnDate);
          const days = Math.floor((todayStart - new Date(rd.getFullYear(), rd.getMonth(), rd.getDate())) / (1000*60*60*24));
          return days > 0 && Number(it.edcoins || 0) !== days;
        });

        if(toUpdate.length > 0){
          await Promise.all(toUpdate.map(async it => {
            try{
              const rd = new Date(it.returnDate);
              const days = Math.floor((todayStart - new Date(rd.getFullYear(), rd.getMonth(), rd.getDate())) / (1000*60*60*24));
              const r = await fetch(`${API_BASE}/api/library/issued/${it._id}`, {
                method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ edcoins: days })
              });
              if(r.ok){
                const jj = await r.json();
                const updated = jj.issued;
                if(updated){
                  setIssuedList(prev => (prev || []).map(p => (String(p._id) === String(updated._id) ? updated : p)));
                }
              }
            }catch(e){ console.warn('Failed to update edcoins for issued', it._id, e); }
          }));
        }
      }catch(e){ console.warn('Auto-update edcoins error', e); }
      await fetchLibraryWallet();
    }catch(err){
      console.error('DueList fetch error', err);
      setError(err.message || String(err));
      setIssuedList([]);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchIssued(); }, []);

  const todayStart = useMemo(()=>{
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const overdue = useMemo(()=>{
    return (issuedList || []).filter(it => {
      if(!it || !it.returnDate) return false;
      // ignore already returned
      if(it.returned) return false;
      const rd = new Date(it.returnDate);
      return rd < todayStart;
    });
  }, [issuedList, todayStart]);

  const upcoming = useMemo(()=>{
    return (issuedList || []).filter(it => {
      if(!it || !it.returnDate) return false;
      if(it.returned) return false;
      const rd = new Date(it.returnDate);
      // include today and future dates
      return rd >= todayStart;
    });
  }, [issuedList, todayStart]);

  const overdueTotal = useMemo(() => {
    return overdue.reduce((sum, item) => {
      const val = typeof item?.edcoins === 'number' ? item.edcoins : Number(item?.edcoins || 0);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [overdue]);

  async function markReturned(item) {
    if (!item?._id) return;
    const ok = window.confirm('Mark this book as returned and update library wallet?');
    if (!ok) return;

    setReturningId(String(item._id));
    try {
      const res = await fetch(`${API_BASE}/api/library/return-with-educoin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuedId: item._id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        throw new Error(j?.message || 'Failed to update return');
      }

      setIssuedList(prev => (prev || []).filter(row => String(row._id) !== String(item._id)));
      await fetchLibraryWallet();
      setFlash(`Updated return for ${item.studentName || item.studentId}.`);
      setTimeout(() => setFlash(''), 2200);
    } catch (e) {
      console.error('markReturned error', e);
      alert(e?.message || 'Failed to update return');
    } finally {
      setReturningId('');
    }
  }

  function daysOverdue(returnDate){
    try{
      const rd = new Date(returnDate);
      const diff = Math.floor((todayStart - new Date(rd.getFullYear(), rd.getMonth(), rd.getDate())) / (1000*60*60*24));
      return diff > 0 ? diff : 0;
    }catch(e){ return '' }
  }

  function daysRemaining(returnDate){
    try{
      const rd = new Date(returnDate);
      const diff = Math.ceil((new Date(rd.getFullYear(), rd.getMonth(), rd.getDate()) - todayStart) / (1000*60*60*24));
      return diff >= 0 ? diff : 0;
    }catch(e){ return '' }
  }

  return (
    <div className="due-page">
      <div className="due-aura due-aura-left" />
      <div className="due-aura due-aura-right" />

      <div className="due-shell">
        <div className="due-head">
          <div>
            <p className="due-kicker">Library Operations</p>
            <h1 className="due-title">Due List And Return Desk</h1>
            <p className="due-sub">Track overdue books, process returns, and keep the library wallet in sync.</p>
          </div>

          <div className="due-wallet">
            <span>Library Wallet</span>
            <strong>{libraryWallet} ED</strong>
          </div>
        </div>

        <div className="due-stats">
          <div className="due-stat-card">
            <span>Overdue Students</span>
            <strong>{overdue.length}</strong>
          </div>
          <div className="due-stat-card">
            <span>Upcoming Returns</span>
            <strong>{upcoming.length}</strong>
          </div>
          <div className="due-stat-card">
            <span>Pending EduCoins</span>
            <strong>{overdueTotal}</strong>
          </div>
        </div>

        <div className="due-toolbar">
          <button onClick={()=>navigate(-1)} className="due-btn due-btn-muted">Back</button>
          <button onClick={fetchIssued} className="due-btn due-btn-primary">Refresh</button>
          <button onClick={async ()=>{
            try{
              const r = await fetch(`${API_BASE}/api/library/update-edcoins`, { method: 'POST' });
              if(!r.ok) throw new Error('Sync failed: ' + r.status);
              const j = await r.json();
              await fetchIssued();
              setFlash(`EduCoin sync completed. Updated ${j.updated || 0} records.`);
              setTimeout(() => setFlash(''), 2200);
            }catch(e){
              console.error('Sync error', e);
              alert('Failed to sync edcoins');
            }
          }} className="due-btn due-btn-accent">Sync EduCoins</button>
        </div>

        {flash ? <div className="due-flash">{flash}</div> : null}

        {loading ? (
          <div className="due-empty">Loading issued records...</div>
        ) : error ? (
          <div className="due-error">Error: {error}</div>
        ) : (
          <div className="due-body">
            <section className="due-section">
              <h2>Overdue Students</h2>
              <div className="due-table-wrap">
                <table className="due-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>ID</th>
                      <th>Department</th>
                      <th>Book</th>
                      <th>Issued</th>
                      <th>Return Date</th>
                      <th>EduCoins</th>
                      <th>Days Overdue</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.length === 0 ? (
                      <tr><td colSpan={9} className="due-row-empty">No overdue records.</td></tr>
                    ) : (
                      overdue.map(it => (
                        <tr key={it._id || `${it.studentId}-${it.bookId}`}>
                          <td>{it.studentName || it.studentId}</td>
                          <td>{it.studentId}</td>
                          <td>{it.department || it.dept || 'General'}</td>
                          <td>{it.bookTitle || it.bookId}</td>
                          <td>{it.issueDate ? new Date(it.issueDate).toLocaleDateString() : ''}</td>
                          <td>{it.returnDate ? new Date(it.returnDate).toLocaleDateString() : ''}</td>
                          <td>{it.edcoins || 0}</td>
                          <td className="due-over-cell">{daysOverdue(it.returnDate)}</td>
                          <td>
                            <button
                              onClick={() => markReturned(it)}
                              className="due-row-btn"
                              disabled={returningId === String(it._id)}
                            >
                              {returningId === String(it._id) ? 'Updating...' : 'Mark Returned'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="due-section">
              <h2>Upcoming Returns</h2>
              <div className="due-table-wrap">
                <table className="due-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>ID</th>
                      <th>Department</th>
                      <th>Book</th>
                      <th>Issued</th>
                      <th>Return Date</th>
                      <th>EduCoins</th>
                      <th>Days Remaining</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.length === 0 ? (
                      <tr><td colSpan={9} className="due-row-empty">No upcoming returns.</td></tr>
                    ) : (
                      upcoming.map(it => (
                        <tr key={it._id || `${it.studentId}-${it.bookId}`}>
                          <td>{it.studentName || it.studentId}</td>
                          <td>{it.studentId}</td>
                          <td>{it.department || it.dept || 'General'}</td>
                          <td>{it.bookTitle || it.bookId}</td>
                          <td>{it.issueDate ? new Date(it.issueDate).toLocaleDateString() : ''}</td>
                          <td>{it.returnDate ? new Date(it.returnDate).toLocaleDateString() : ''}</td>
                          <td>{it.edcoins || 0}</td>
                          <td className="due-safe-cell">{daysRemaining(it.returnDate)}</td>
                          <td>
                            <button
                              onClick={() => markReturned(it)}
                              className="due-row-btn"
                              disabled={returningId === String(it._id)}
                            >
                              {returningId === String(it._id) ? 'Updating...' : 'Mark Returned'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
