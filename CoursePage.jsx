import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CoursePage.css';

const API = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function extractStudentId(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const p = JSON.parse(s);
    if (p && typeof p === 'object') {
      const v = p.studentId || p.roll || p.id || p.regNo || p.registerNumber;
      if (v) return String(v).trim();
    }
  } catch (_) {}
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      const q = u.searchParams.get('studentId') || u.searchParams.get('roll') || u.searchParams.get('id');
      if (q) return q.trim();
      const seg = u.pathname.split('/').filter(Boolean).pop();
      if (seg) return seg.trim();
    }
  } catch (_) {}
  return s;
}

function generateCertificate(student, course) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');

  // background
  const bg = ctx.createLinearGradient(0, 0, 1000, 700);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#1e3a5f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1000, 700);

  // subtle grid pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1000; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 700); ctx.stroke(); }
  for (let y = 0; y < 700; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1000, y); ctx.stroke(); }

  // gold outer border
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, 952, 652);
  ctx.strokeStyle = 'rgba(245,158,11,0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, 928, 628);

  // corner ornaments
  [[60,60],[940,60],[60,640],[940,640]].forEach(([x,y]) => {
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI*2);
    ctx.fillStyle = '#f59e0b'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI*2);
    ctx.fillStyle = '#0f172a'; ctx.fill();
  });

  // institute name
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦  CAMPUS EDUCOINS INSTITUTE  ✦', 500, 88);

  // main title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic bold 50px Georgia, serif';
  ctx.fillText('Certificate of Completion', 500, 170);

  // divider
  const grad = ctx.createLinearGradient(100, 0, 900, 0);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.3, '#f59e0b');
  grad.addColorStop(0.7, '#f59e0b');
  grad.addColorStop(1, 'transparent');
  ctx.strokeStyle = grad; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(100, 195); ctx.lineTo(900, 195); ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '21px Georgia, serif';
  ctx.fillText('This is to certify that', 500, 258);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(student.name || 'Student', 500, 325);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '17px Georgia, serif';
  ctx.fillText(`Roll: ${student.roll}  ·  ${student.dept || student.department || ''}`, 500, 360);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '21px Georgia, serif';
  ctx.fillText('has successfully completed the course', 500, 413);

  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 32px Georgia, serif';
  ctx.fillText(course.title, 500, 468);

  ctx.fillStyle = '#64748b';
  ctx.font = '17px Georgia, serif';
  const completedDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillText(`Duration: ${course.duration}  ·  Issued: ${completedDate}`, 500, 508);

  // watermark
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 110px Georgia, serif';
  ctx.fillText('CERTIFIED', 500, 420);
  ctx.restore();

  // seal
  ctx.beginPath(); ctx.arc(500, 605, 46, 0, Math.PI*2);
  ctx.fillStyle = '#f59e0b'; ctx.fill();
  ctx.beginPath(); ctx.arc(500, 605, 40, 0, Math.PI*2);
  ctx.fillStyle = '#1e3a5f'; ctx.fill();
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillText('VERIFIED', 500, 601);
  ctx.font = '9px Arial, sans-serif';
  ctx.fillText('EduCoins', 500, 615);

  const link = document.createElement('a');
  link.download = `Certificate_${(course.title || 'course').replace(/\s+/g,'_')}_${student.roll || 'student'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ─── main component ──────────────────────────────────────────────────────── */
export default function CoursePage() {
  const navigate = useNavigate();
  const scannerInstanceRef = useRef(null);
  const scannerStartingRef = useRef(false);
  const courseGridRef = useRef(null);

  const [phase, setPhase] = useState('scan');       // 'scan' | 'courses'
  const [scanMsg, setScanMsg] = useState('');
  const [scannedStudent, setScannedStudent] = useState(null);    // { id, name, roll, dept, coins }
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState({ id: null, text: '', ok: true });
  const [processing, setProcessing] = useState(false);
  const [revealedCards, setRevealedCards] = useState({});

  const totalCourses = courses.length;
  const completedCourses = courses.filter(c => c.completed).length;
  const activeCourses = courses.filter(c => c.enrolled && !c.completed).length;
  const affordableCourses = courses.filter(c => (scannedStudent?.coins ?? 0) >= (c.cost || 10)).length;

  /* ── scanner lifecycle ────────────────────────────── */
  useEffect(() => {
    if (phase === 'scan') {
      setTimeout(() => startScanner(), 80);
    }
    return () => stopScanner();
  }, [phase]);

  function stopScanner() {
    if (scannerInstanceRef.current) {
      try { scannerInstanceRef.current.clear(); } catch (_) {}
      scannerInstanceRef.current = null;
    }
    const c = document.getElementById('course-scanner-box');
    if (c) {
      const vids = c.querySelectorAll('video');
      vids.forEach(v => { try { v.srcObject?.getTracks().forEach(t => t.stop()); } catch (_) {} });
      c.innerHTML = '';
    }
  }

  async function startScanner() {
    if (scannerStartingRef.current) return;
    scannerStartingRef.current = true;

    setScanMsg('');
    if (typeof window.Html5QrcodeScanner === 'undefined') {
      try {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = '/node_modules/html5-qrcode/html5-qrcode.min.js';
          s.async = true; s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      } catch (_) {
        setScanMsg('⚠ Scanner library failed to load');
        scannerStartingRef.current = false;
        return;
      }
    }

    const container = document.getElementById('course-scanner-box');
    if (container) container.innerHTML = '';

    const scanner = new window.Html5QrcodeScanner('course-scanner-box', { fps: 10, qrbox: { width: 280, height: 180 } }, false);
    scannerInstanceRef.current = scanner;

    scanner.render(async (decodedText) => {
      try { await scanner.clear(); } catch (_) {}
      scannerInstanceRef.current = null;
      scannerStartingRef.current = false;

      const studentId = extractStudentId(decodedText);
      setScanMsg('Looking up student…');
      try {
        const r = await fetch(`${API}/api/studentdetails/${encodeURIComponent(studentId)}`);
        if (!r.ok) { setScanMsg('❌ Student not found. Scan again.'); setTimeout(() => startScanner(), 2000); return; }
        const d = await r.json();
        const name  = d.name || d.studentName || studentId;
        const roll  = d.roll || d.rollNo || studentId;
        const dept  = d.dept || d.department || '';
        const coins = typeof d.coins === 'number' ? d.coins : Number(d.coins || 0);
        setScannedStudent({ id: studentId, name, roll, dept, coins });
        setPhase('courses');
      } catch (_) {
        setScanMsg('❌ Network error. Scan again.');
        setTimeout(() => startScanner(), 2500);
      }
    }, () => {});

    scannerStartingRef.current = false;
  }

  /* ── fetch courses once student is scanned ────────── */
  useEffect(() => {
    if (phase !== 'courses' || !scannedStudent) return;
    setCoursesLoading(true);
    fetch(`${API}/api/courses?studentId=${encodeURIComponent(scannedStudent.roll)}`)
      .then(r => r.json())
      .then(j => { if (j.success) setCourses(j.courses || []); })
      .catch(e => console.warn('fetchCourses', e))
      .finally(() => setCoursesLoading(false));
  }, [phase, scannedStudent]);

  /* ── card reveal animation on scroll ─────────────── */
  useEffect(() => {
    if (phase !== 'courses' || coursesLoading || courses.length === 0) return;

    const cards = courseGridRef.current?.querySelectorAll('.cp-card[data-course-id]');
    if (!cards || cards.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('data-course-id');
          if (id) {
            setRevealedCards(prev => (prev[id] ? prev : { ...prev, [id]: true }));
          }
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [phase, coursesLoading, courses]);

  /* ── enroll + complete ─────────────────────────────── */
  async function handleEnroll(course) {
    if (processing) return;
    setProcessing(true);
    setActionMsg({ id: course._id, text: 'Processing…', ok: true });
    try {
      const r = await fetch(`${API}/api/courses/${course._id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: scannedStudent.roll }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        setActionMsg({ id: course._id, text: j.message || 'Enrollment failed', ok: false });
      } else {
        setScannedStudent(prev => ({ ...prev, coins: j.coins }));
        setActionMsg({ id: course._id, text: '✅ Enrolled! −10 EduCoins', ok: true });
        setCourses(prev => prev.map(c => c._id === course._id ? { ...c, enrolled: true, completed: false } : c));
      }
    } catch (_) {
      setActionMsg({ id: course._id, text: 'Network error', ok: false });
    } finally { setProcessing(false); }
  }

  async function handleComplete(course) {
    if (processing) return;
    setProcessing(true);
    setActionMsg({ id: course._id, text: 'Marking complete…', ok: true });
    try {
      const r = await fetch(`${API}/api/courses/${course._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: scannedStudent.roll }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        setActionMsg({ id: course._id, text: j.message || 'Failed', ok: false });
      } else {
        setActionMsg({ id: course._id, text: '🎉 Completed!', ok: true });
        const completedAt = j.enrollment?.completedAt || new Date().toISOString();
        setCourses(prev => prev.map(c => c._id === course._id ? { ...c, completed: true, completedAt } : c));
      }
    } catch (_) {
      setActionMsg({ id: course._id, text: 'Network error', ok: false });
    } finally { setProcessing(false); }
  }

  function resetScan() {
    stopScanner();
    setScannedStudent(null);
    setCourses([]);
    setRevealedCards({});
    setActionMsg({ id: null, text: '', ok: true });
    setScanMsg('');
    setPhase('scan');
  }

  /* ─── render ────────────────────────────────────────────────────── */
  return (
    <div className="cp-page">
      {/* aura blobs */}
      <div className="cp-aura cp-aura-1" />
      <div className="cp-aura cp-aura-2" />

      <div className="cp-shell">
        {/* header */}
        <header className="cp-header">
          <div className="cp-header-left">
            <p className="cp-kicker">EduCoin Courses</p>
            <h1 className="cp-title">Course Enrollment Center</h1>
            <p className="cp-sub">Scan student ID to view available courses and download certificates.</p>
          </div>
          <div className="cp-header-right">
            <button className="cp-back-btn" onClick={() => navigate(-1)}>← Back</button>
          </div>
        </header>

        {/* ── SCAN phase ── */}
        {phase === 'scan' && (
          <div className="cp-scan-layout">
            <div className="cp-scanner-card">
              <div className="cp-scanner-head">
                <span className="cp-scanner-dot" />
                <span>Camera Live</span>
              </div>
              <div id="course-scanner-box" className="cp-scanner-viewport" />
              {scanMsg && <div className="cp-scan-msg">{scanMsg}</div>}
              <p className="cp-scan-hint">Align the student QR code inside the frame</p>
            </div>

            <div className="cp-scan-info-card">
              <div className="cp-info-icon">📚</div>
              <h2>How it works</h2>
              <ol className="cp-how-list">
                <li><span>1</span>Scan the student's QR code</li>
                <li><span>2</span>View their EduCoin balance</li>
                <li><span>3</span>Enroll in a course for <strong>10 coins</strong></li>
                <li><span>4</span>Complete the course</li>
                <li><span>5</span>Download a certificate</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── COURSES phase ── */}
        {phase === 'courses' && scannedStudent && (
          <div className="cp-courses-layout">
            {/* student identity strip */}
            <div className="cp-student-strip">
              <div className="cp-student-avatar">{scannedStudent.name?.[0]?.toUpperCase() || '?'}</div>
              <div className="cp-student-info">
                <div className="cp-student-name">{scannedStudent.name}</div>
                <div className="cp-student-meta">{scannedStudent.roll}  ·  {scannedStudent.dept}</div>
              </div>
              <div className="cp-coin-chip">
                <span className="cp-coin-icon">🪙</span>
                <span className="cp-coin-val">{scannedStudent.coins}</span>
                <span className="cp-coin-label">EduCoins</span>
              </div>
              <button className="cp-rescan-btn" onClick={resetScan}>⟳ Scan Another</button>
            </div>

            <div className="cp-stats-row">
              <div className="cp-stat-card">
                <span>Total Courses</span>
                <strong>{totalCourses}</strong>
              </div>
              <div className="cp-stat-card">
                <span>In Progress</span>
                <strong>{activeCourses}</strong>
              </div>
              <div className="cp-stat-card">
                <span>Completed</span>
                <strong>{completedCourses}</strong>
              </div>
              <div className="cp-stat-card">
                <span>Can Afford</span>
                <strong>{affordableCourses}</strong>
              </div>
            </div>

            {coursesLoading ? (
              <div className="cp-loading">Loading courses…</div>
            ) : courses.length === 0 ? (
              <div className="cp-empty-state">
                <h3>No courses are available yet</h3>
                <p>Ask admin to add courses, then rescan or refresh this page.</p>
              </div>
            ) : (
              <div className="cp-grid" ref={courseGridRef}>
                {courses.map((course, index) => {
                  const msg = actionMsg.id === course._id ? actionMsg : null;
                  const courseCost = course.cost || 10;
                  const canAfford = scannedStudent.coins >= courseCost;
                  const isRevealed = !!revealedCards[course._id];
                  return (
                    <div
                      key={course._id}
                      className={`cp-card${isRevealed ? ' cp-card--visible' : ''}${course.completed ? ' cp-card--done' : course.enrolled ? ' cp-card--enrolled' : ''}`}
                      data-course-id={course._id}
                      style={{ '--cp-delay': `${Math.min(index, 10) * 70}ms` }}
                    >
                      <div className="cp-card-top">
                        <span className="cp-cat-badge">{course.category}</span>
                        {course.completed  && <span className="cp-badge-done">✓ Completed</span>}
                        {course.enrolled && !course.completed && <span className="cp-badge-enrolled">Enrolled</span>}
                      </div>

                      <h3 className="cp-card-title">{course.title}</h3>
                      <p className="cp-card-desc">{course.description}</p>

                      <div className="cp-card-meta">
                        <span>⏱ {course.duration}</span>
                        <span>🪙 {courseCost} coins</span>
                      </div>

                      {msg && (
                        <div className={`cp-action-msg${msg.ok ? '' : ' cp-action-msg--err'}`}>{msg.text}</div>
                      )}

                      <div className="cp-card-actions">
                        {!course.enrolled && !course.completed && (
                          <button
                            className="cp-btn cp-btn-enroll"
                            disabled={!canAfford || processing}
                            onClick={() => handleEnroll(course)}
                          >
                            {canAfford ? `Enroll -${courseCost} coins` : 'Insufficient Coins'}
                          </button>
                        )}
                        {course.enrolled && !course.completed && (
                          <button
                            className="cp-btn cp-btn-complete"
                            disabled={processing}
                            onClick={() => handleComplete(course)}
                          >
                            Mark Completed
                          </button>
                        )}
                        {course.completed && (
                          <button
                            className="cp-btn cp-btn-cert"
                            onClick={() => generateCertificate(scannedStudent, course)}
                          >
                            ⬇ Download Certificate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
