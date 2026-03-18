import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ReturnedList.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export default function ReturnedList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dueToday, setDueToday] = useState([]);
  const [error, setError] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scannedStudent, setScannedStudent] = useState(null);
  const [scannedIssued, setScannedIssued] = useState(null);
  const scannerInstanceRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/library/issued?active=true`);
        if (!res.ok) throw new Error('Failed to fetch issued records');
        const json = await res.json();
        const issuedArr = Array.isArray(json) ? json : (json.issued || json.data || []);

        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const msPerDay = 1000*60*60*24;

        // compute daysOverdue = today - returnDate (0 if due today, >0 if overdue)
        const mapped = (issuedArr || []).map(item => {
          if (!item || !item.returnDate) return null;
          const rd = new Date(item.returnDate);
          const rdStart = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
          const daysOverdue = Math.floor((todayStart - rdStart) / msPerDay);
          return { ...item, daysOverdue };
        }).filter(Boolean);

        // select items where overdue is exactly 0 (due today)
        const due0 = mapped.filter(i => i.daysOverdue === 0);
        setDueToday(due0 || []);
      } catch (err) {
        console.error('ReturnedList load error', err);
        setError(err.message || String(err));
        setDueToday([]);
      } finally {
        setLoading(false);
      }
    }
    load();
    // if navigated with state.openScanner, open scanner after mount
    try{ if(location?.state && location.state.openScanner){ setTimeout(()=> setShowScanner(true), 120); } }catch(e){}
  }, []);

  // start scanner (html5-qrcode UMD) and handle scan success
  async function startScanner(){
    setScanMessage('');
    setScannedStudent(null);
    // load UMD bundle if needed
    if (typeof window.Html5QrcodeScanner === 'undefined') {
      try{
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/node_modules/html5-qrcode/html5-qrcode.min.js';
          s.async = true;
          s.onload = () => resolve();
          s.onerror = (e) => reject(e);
          document.head.appendChild(s);
        });
      }catch(e){ console.error('Failed to load scanner lib', e); setScanMessage('Scanner lib failed to load'); return; }
    }

    const Html5QrcodeScanner = window.Html5QrcodeScanner;
    const containerId = 'returned-list-scanner';
    const container = document.getElementById(containerId);
    if(container) container.innerHTML = '';

    const config = { fps: 10, qrbox: { width: 300, height: 200 } };
    const scanner = new Html5QrcodeScanner(containerId, config, false);
    scannerInstanceRef.current = scanner;

    const onScanSuccess = async (decodedText) => {
      try{
        try{ await scanner.clear(); }catch(e){}
        const studentId = String(decodedText || '').trim();
        setScanMessage('Fetching student details...');
        const res = await fetch(`${API_BASE}/api/studentdetails/${encodeURIComponent(studentId)}`);
        if(!res.ok){ setScanMessage('Student not found'); setTimeout(()=> setShowScanner(false),1500); return; }
        const j = await res.json();
        const name = j.name || j.studentName || '(no name)';
        setScannedStudent({ id: studentId, name, raw: j });
        setScanMessage('Student identified');

        // fetch active issued record for this student to show book/due/edcoins
        try{
          const issuedRes = await fetch(`${API_BASE}/api/library/issued?active=true&studentId=${encodeURIComponent(studentId)}`);
          if(issuedRes.ok){
            const issuedJson = await issuedRes.json();
            const issuedArr = Array.isArray(issuedJson) ? issuedJson : (issuedJson.issued || issuedJson.data || []);
            if(issuedArr && issuedArr.length > 0){
              const rec = issuedArr[0];
              // compute daysOverdue
              const todayStart = new Date(); todayStart.setHours(0,0,0,0);
              let daysOverdue = '';
              if(rec.returnDate){
                const rd = new Date(rec.returnDate);
                const rdStart = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
                const msPerDay = 1000*60*60*24;
                daysOverdue = Math.floor((todayStart - rdStart) / msPerDay);
              }
              setScannedIssued({ ...rec, daysOverdue });
            } else {
              setScannedIssued(null);
            }
          }
        }catch(e){ console.warn('Failed to fetch issued for scanned student', e); setScannedIssued(null); }
      }catch(err){ console.error(err); setScanMessage('Error processing scan'); setTimeout(()=> setShowScanner(false),1500); }
    };

    const onScanFailure = (err) => { /* ignore frame failures */ };
    try{ scanner.render(onScanSuccess, onScanFailure); }catch(e){ console.error('Scanner render failed', e); setScanMessage('Scanner failed to start'); }
  }

  // open scanner when showScanner becomes true
  useEffect(()=>{
    if(showScanner){ setTimeout(()=> startScanner(), 50); }
    return () => {
      if(scannerInstanceRef.current){ try{ scannerInstanceRef.current.clear(); }catch(e){} }
      const c = document.getElementById('returned-list-scanner'); if(c) c.innerHTML = '';
    };
  }, [showScanner]);

  async function confirmReturnForScanned(){
    if(!scannedStudent) return alert('No scanned student');
    // if navigation state provided an expectedIssuedId, call return on it
    const expectedIssuedId = location?.state?.expectedIssuedId;
    try{
      let issuedToReturnId = expectedIssuedId;
      if(!issuedToReturnId){
        // find active issued record for this student
        const res = await fetch(`${API_BASE}/api/library/issued?active=true&studentId=${encodeURIComponent(scannedStudent.id)}`);
        if(!res.ok) throw new Error('Failed to fetch issued records');
        const j = await res.json();
        const items = Array.isArray(j) ? j : (j.issued || j.data || []);
        if(!items || items.length === 0) return alert('No active issued record found for this student');
        issuedToReturnId = items[0]._id;
      }

      const r = await fetch(`${API_BASE}/api/library/return-with-educoin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuedId: issuedToReturnId }),
      });
      const jr = await r.json();
      if(!r.ok || !jr.success) return alert(jr?.message || 'Failed to return book');
      alert('Book returned & library wallet updated!');
      window.location.reload();
    }catch(e){ console.error('Confirm return failed', e); alert('Error during return'); }
  }

  return (
    <div className="returned-page">
      <div className="returned-aura returned-aura-left" />
      <div className="returned-aura returned-aura-right" />

      <div className="returned-card">
        <div className="returned-header">
          <p className="returned-kicker">Library Ops</p>
          <h1 className="returned-title">Returned / Due Today</h1>
          <p className="returned-sub">Scan the student code to quickly verify and process returns.</p>
        </div>

        {showScanner ? (
          <div className="scanner-shell">
            <div className="scanner-panel">
              <div className="scanner-panel-head">
                <h2>Live Scanner</h2>
                <span className="scanner-pill">Camera Active</span>
              </div>
              <div id="returned-list-scanner" className="scanner-viewport" />
              <div className={`scanner-message ${scanMessage ? 'scanner-message-alert' : ''}`}>
                {scanMessage || 'Align the student QR code inside the frame.'}
              </div>
            </div>

            {scannedStudent ? (
              <div className="scan-result-card">
                <h3>Scanned Student</h3>
                <div className="scan-meta-grid">
                  <div className="scan-meta-item">
                    <span>ID</span>
                    <strong>{scannedStudent.id}</strong>
                  </div>
                  <div className="scan-meta-item">
                    <span>Name</span>
                    <strong>{scannedStudent.name}</strong>
                  </div>
                  <div className="scan-meta-item">
                    <span>Department</span>
                    <strong>{scannedStudent.raw?.department || scannedStudent.raw?.dept || '-'}</strong>
                  </div>
                </div>

                {scannedIssued ? (
                  <div className="scan-issued-card">
                    <div className="scan-issued-title">Issued Book Details</div>
                    <div className="scan-issued-grid">
                      <div><span>Book</span><strong>{scannedIssued.bookTitle || scannedIssued.bookId}</strong></div>
                      <div><span>Return Date</span><strong>{scannedIssued.returnDate ? new Date(scannedIssued.returnDate).toLocaleDateString() : '-'}</strong></div>
                      <div><span>Days Overdue</span><strong>{typeof scannedIssued.daysOverdue !== 'undefined' ? String(scannedIssued.daysOverdue) : '-'}</strong></div>
                      <div><span>EduCoins</span><strong>{typeof scannedIssued.edcoins !== 'undefined' ? String(scannedIssued.edcoins) : '0'}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="scan-empty-note">No active issued record found for this student.</div>
                )}

                <div className="scan-actions">
                  <button onClick={confirmReturnForScanned} className="scan-btn scan-btn-success">Confirm Return</button>
                  <button onClick={() => { setShowScanner(false); try{ scannerInstanceRef.current && scannerInstanceRef.current.clear(); }catch(e){} }} className="scan-btn scan-btn-muted">Close Scanner</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : loading ? (
          <div className="returned-info">Loading...</div>
        ) : error ? (
          <div className="returned-error">Error: {error}</div>
        ) : (
          <div>
            {dueToday.length === 0 ? (
              <div className="returned-info">No students due today.</div>
            ) : (
              <div className="due-table-wrap">
                <table className="due-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll</th>
                      <th>Book</th>
                      <th>Issued</th>
                      <th>Return</th>
                      <th>Overdue (days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueToday.map(item => (
                      <tr key={item._id || `${item.studentId}-${item.bookId}`}>
                        <td>{item.studentName || item.studentId}</td>
                        <td>{item.studentId || item.studentRoll || item.roll}</td>
                        <td>{item.bookTitle || item.bookId}</td>
                        <td>{item.issueDate ? new Date(item.issueDate).toLocaleDateString() : ''}</td>
                        <td>{item.returnDate ? new Date(item.returnDate).toLocaleDateString() : ''}</td>
                        <td>{typeof item.daysOverdue !== 'undefined' ? String(item.daysOverdue) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="returned-actions">
          {!showScanner ? (
            <button onClick={() => setShowScanner(true)} className="returned-btn returned-btn-accent">Open Scanner</button>
          ) : null}
          <button onClick={() => navigate(-1)} className="returned-btn returned-btn-muted">Back</button>
          <button onClick={() => window.location.reload()} className="returned-btn returned-btn-primary">Refresh</button>
        </div>
      </div>
    </div>
  );
}
