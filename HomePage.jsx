import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import './HomePage.css';

const HomePage = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubject, setModalSubject] = useState('');
  const [modalSessions, setModalSessions] = useState([]);
  const [walletOpen, setWalletOpen] = useState(false);
  const [coinHistory, setCoinHistory] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [cgpa, setCgpa] = useState(0);
  const [eduCoins, setEduCoins] = useState(0);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [subjectStats, setSubjectStats] = useState({});
  const [attendanceQuery, setAttendanceQuery] = useState('');
  const [showPerformanceChart, setShowPerformanceChart] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const historyStorageKey = (roll) => `coinHistory:${roll}`;

  // ── Courses ──
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseMsg, setCourseMsg] = useState({ id: null, text: '', ok: true });
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'courses'
  const [courseFilter, setCourseFilter] = useState('All');

  const CATEGORY_ICONS = { Programming:'💻', Web:'🌐', 'Soft Skills':'🎯', 'AI/ML':'🤖', Database:'🗄️', Business:'📊', Security:'🔐' };
  const CATEGORY_COLORS = { Programming:'#6366f1', Web:'#0ea5e9', 'Soft Skills':'#f59e0b', 'AI/ML':'#8b5cf6', Database:'#10b981', Business:'#f97316', Security:'#ef4444' };

  const API_BASE_COURSES = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : 'http://localhost:5000');

  const fetchCourses = useCallback(async (studentRoll) => {
    if (!studentRoll) return;
    setCoursesLoading(true);
    try {
      const r = await fetch(`${API_BASE_COURSES}/api/courses?studentId=${encodeURIComponent(studentRoll)}`);
      const json = await r.json();
      if (json && json.success) setCourses(json.courses || []);
    } catch (e) { console.warn('fetchCourses failed', e); }
    finally { setCoursesLoading(false); }
  }, [API_BASE_COURSES]);

  useEffect(() => {
    if (student?.roll && activeTab === 'courses') fetchCourses(student.roll);
  }, [student?.roll, activeTab, fetchCourses]);

  const handleEnroll = async (courseId) => {
    if (!student) return;
    setCourseMsg({ id: courseId, text: 'Enrolling...', ok: true });
    try {
      const r = await fetch(`${API_BASE_COURSES}/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.roll }),
      });
      const json = await r.json();
      if (!r.ok || !json.success) {
        setCourseMsg({ id: courseId, text: json.message || 'Enrollment failed', ok: false });
        return;
      }
      setStudent(prev => ({ ...prev, coins: json.coins }));
      setCourseMsg({ id: courseId, text: 'Enrolled! -10 EduCoins', ok: true });
      setCourses(prev => prev.map(c => c._id === courseId ? { ...c, enrolled: true, completed: false, enrolledAt: new Date().toISOString() } : c));
    } catch (e) {
      setCourseMsg({ id: courseId, text: 'Network error', ok: false });
    }
  };

  const handleComplete = async (courseId) => {
    if (!student) return;
    setCourseMsg({ id: courseId, text: 'Marking complete...', ok: true });
    try {
      const r = await fetch(`${API_BASE_COURSES}/api/courses/${courseId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.roll }),
      });
      const json = await r.json();
      if (!r.ok || !json.success) {
        setCourseMsg({ id: courseId, text: json.message || 'Failed', ok: false });
        return;
      }
      const completedAt = json.enrollment?.completedAt || new Date().toISOString();
      setCourseMsg({ id: courseId, text: 'Course completed!', ok: true });
      setCourses(prev => prev.map(c => c._id === courseId ? { ...c, completed: true, completedAt } : c));
    } catch (e) {
      setCourseMsg({ id: courseId, text: 'Network error', ok: false });
    }
  };

  const downloadCertificate = (course) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 1000, 700);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e3a5f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1000, 700);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 8; ctx.strokeRect(24, 24, 952, 652);
    ctx.strokeStyle = 'rgba(245,158,11,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(36, 36, 928, 628);
    [[60,60],[940,60],[60,640],[940,640]].forEach(([x,y]) => { ctx.beginPath(); ctx.arc(x,y,14,0,Math.PI*2); ctx.fillStyle='#f59e0b'; ctx.fill(); });
    ctx.fillStyle='#f59e0b'; ctx.font='bold 20px Georgia,serif'; ctx.textAlign='center'; ctx.fillText('✦  CAMPUS EDUCOINS INSTITUTE  ✦',500,90);
    ctx.fillStyle='#ffffff'; ctx.font='italic bold 48px Georgia,serif'; ctx.fillText('Certificate of Completion',500,170);
    ctx.strokeStyle='#f59e0b'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(150,195); ctx.lineTo(850,195); ctx.stroke();
    ctx.fillStyle='#cbd5e1'; ctx.font='22px Georgia,serif'; ctx.fillText('This is to certify that',500,260);
    ctx.fillStyle='#f8fafc'; ctx.font='bold 42px Georgia,serif'; ctx.fillText(student.name||'Student',500,330);
    ctx.fillStyle='#94a3b8'; ctx.font='18px Georgia,serif'; ctx.fillText(`Roll No: ${student.roll}  ·  Department: ${student.dept}`,500,368);
    ctx.fillStyle='#cbd5e1'; ctx.font='22px Georgia,serif'; ctx.fillText('has successfully completed the course',500,420);
    ctx.fillStyle='#60a5fa'; ctx.font='bold 34px Georgia,serif'; ctx.fillText(course.title,500,478);
    ctx.fillStyle='#94a3b8'; ctx.font='18px Georgia,serif';
    const completedDate = course.completedAt ? new Date(course.completedAt).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'}) : new Date().toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'});
    ctx.fillText(`Duration: ${course.duration}  ·  Completed: ${completedDate}`,500,520);
    ctx.beginPath(); ctx.arc(500,600,44,0,Math.PI*2); ctx.fillStyle='#f59e0b'; ctx.fill();
    ctx.fillStyle='#0f172a'; ctx.font='bold 13px Arial,sans-serif'; ctx.fillText('VERIFIED',500,596); ctx.font='11px Arial,sans-serif'; ctx.fillText('EduCoins',500,613);
    ctx.fillStyle='rgba(245,158,11,0.15)'; ctx.font='bold 100px Georgia,serif'; ctx.globalAlpha=0.08; ctx.fillText('CERTIFIED',500,400); ctx.globalAlpha=1;
    const link = document.createElement('a');
    link.download = `Certificate_${(course.title||'course').replace(/\s+/g,'_')}_${student.roll}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const applyAcademicPayload = useCallback((payload) => {
    setMarksData(Array.isArray(payload?.marks) ? payload.marks : []);
    setCgpa(Number(payload?.cgpa || 0));
    setEduCoins(Number(payload?.eduCoins || 0));
    setRewardHistory(Array.isArray(payload?.rewardHistory) ? payload.rewardHistory : []);
    setSubjectStats(payload?.subjectStats && typeof payload.subjectStats === 'object' ? payload.subjectStats : {});
  }, []);

  useEffect(() => {
    // Try to load student from localStorage first
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('student')); } catch (e) { stored = null; }
    if (!stored) {
      setLoading(false);
      return;
    }

    // Fetch fresh student data from backend by _id (if available) or roll
    const identifier = stored._id || stored.roll;
    if (!identifier) {
      setStudent(stored);
      setLoading(false);
      return;
    }

    // Try backend directly first (dev server), then fallback to relative path
    (async () => {
      try {
        let r;
        try {
          r = await fetch(`http://localhost:5000/api/admin/student/${encodeURIComponent(identifier)}`);
        } catch (e) {
          r = await fetch(`/api/admin/student/${encodeURIComponent(identifier)}`);
        }

        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const txt = await r.text();
          console.error('Unexpected student detail response (not JSON):', txt.slice(0, 500));
          setStudent(stored);
          setError('Unexpected response fetching student details (not JSON)');
          return;
        }

        const data = await r.json();
        if (data && data.success && data.student) {
          setStudent(data.student);
        } else {
          setStudent(stored);
          if (data && data.message) setError(data.message);
        }
      } catch (err) {
        console.error('Error fetching student details:', err);
        setStudent(stored);
        setError('Failed to load latest details');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // fetch attendance summary for this student (per-subject percentages)
  const fetchSummary = useCallback(async (studentIdentifier) => {
    if (!studentIdentifier) return;
    try {
      const roll = studentIdentifier.roll || studentIdentifier;
      let r;
      try { r = await fetch(`http://localhost:5000/api/admin/attendance/summary?roll=${encodeURIComponent(roll)}`); }
      catch (e) { r = await fetch(`/api/admin/attendance/summary?roll=${encodeURIComponent(roll)}`); }
      const json = await r.json();
      if (json && json.success) setAttendanceSummary(json.summary || []);
    } catch (err) {
      console.error('Failed to load attendance summary', err);
    }
  }, []);

  // when student is loaded, fetch summary and poll every 15s
  useEffect(() => {
    if (!student) return;
    // load saved coin history for this student (if any)
    try {
      const key = historyStorageKey(student.roll);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setCoinHistory(parsed);
      }
    } catch (e) { /* ignore localStorage errors */ }
    fetchSummary(student);
    const id = setInterval(() => fetchSummary(student), 15000);
    return () => clearInterval(id);
  }, [student, fetchSummary]);

  // SSE subscription for real-time coin updates (try backend absolute URL first, then fallback)
  useEffect(() => {
    if (!student || !student.roll) return;
    const path = `/api/admin/coins/subscribe?roll=${encodeURIComponent(student.roll)}`;
    const candidates = [
      `http://localhost:5000${path}`,
      path
    ];

    let es = null;
    let aborted = false;
    let fallbackPollId = null;

    const tryConnect = (idx) => {
      if (aborted || idx >= candidates.length) return;
      const url = candidates[idx];
      try {
        const conn = new EventSource(url);
        let opened = false;
        const openTimer = setTimeout(() => {
          if (!opened) {
            // no open within timeout -> close and try next
            try { conn.close(); } catch (e) {}
            tryConnect(idx + 1);
          }
        }, 2000);

        conn.onopen = () => {
          opened = true;
          clearTimeout(openTimer);
          es = conn;
          console.log('SSE coins connected to', url);
          // stop fallback polling if any
          if (fallbackPollId) { clearInterval(fallbackPollId); fallbackPollId = null; }
        };

        conn.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data && data.roll && data.roll === student.roll) {
              setStudent(prev => {
                const prevCoins = (prev && typeof prev.coins === 'number') ? prev.coins : (prev && Number(prev.coins || 0));
                const newCoins = (typeof data.coins === 'number') ? data.coins : Number(data.coins || 0);
                  const delta = (typeof prevCoins === 'number') ? (newCoins - prevCoins) : null;

                  // If we don't have any previous balance to compare (first connect),
                  // and the user already has coins, show a detected/baseline entry so the panel isn't empty.
                  const now = new Date();
                  if ((delta === null || typeof delta !== 'number') && (typeof newCoins === 'number' && newCoins > 0) && (!Array.isArray(coinHistory) || coinHistory.length === 0)) {
                    const entry = { id: now.getTime(), ts: now.toISOString(), delta: newCoins, balance: newCoins, desc: 'Balance detected' };
                    setCoinHistory(h => {
                      const next = [entry, ...(h || [])].slice(0, 50);
                      try { localStorage.setItem(historyStorageKey(student.roll), JSON.stringify(next)); } catch(e){}
                      return next;
                    });
                  } else if (delta !== null && delta !== 0) {
                    const desc = delta > 0 ? (delta === 1 ? 'Attendance reward' : 'EduCoins credited') : 'EduCoins deducted';
                    const entry = { id: now.getTime(), ts: now.toISOString(), delta, balance: newCoins, desc };
                    setCoinHistory(h => {
                      const next = [entry, ...(h || [])].slice(0, 50);
                      try { localStorage.setItem(historyStorageKey(student.roll), JSON.stringify(next)); } catch(e){}
                      return next;
                    });
                  }

                  try { return { ...prev, coins: newCoins }; } catch(e) { return prev; }
              });
            }
          } catch (err) { /* ignore parse errors */ }
        };

        conn.onerror = (err) => {
          console.warn('SSE coins error from', url, err);
          try { conn.close(); } catch (e) {}
          if (!opened) {
            // try the next candidate
            tryConnect(idx + 1);
          }
          // start fallback polling if we've exhausted candidates
          if (idx === candidates.length - 1 && !fallbackPollId) {
            // poll coins every 2s
            fallbackPollId = setInterval(async () => {
              try {
                const identifier = student._id || student.roll;
                let r;
                try { r = await fetch(`http://localhost:5000/api/admin/student/${encodeURIComponent(identifier)}`); }
                catch (e) { r = await fetch(`/api/admin/student/${encodeURIComponent(identifier)}`); }
                const json = await r.json();
                if (json && json.success && json.student) setStudent(prev => ({ ...prev, coins: json.student.coins }));
              } catch (e) { /* ignore */ }
            }, 2000);
          }
        };
      } catch (err) {
        // constructor may throw for invalid URL
        console.warn('EventSource constructor failed for', url, err);
        tryConnect(idx + 1);
      }
    };

    tryConnect(0);

    return () => {
      aborted = true;
      if (es) try { es.close(); } catch (e) {}
      if (fallbackPollId) try { clearInterval(fallbackPollId); } catch (e) {}
    };
  }, [student && student.roll]);

  // poll student details (to pick up updated coins) every 10s
  useEffect(() => {
    if (!student) return;
    let mounted = true;
    const fetchDetails = async () => {
      try {
        const identifier = student._id || student.roll;
        let r;
        try { r = await fetch(`http://localhost:5000/api/admin/student/${encodeURIComponent(identifier)}`); }
        catch (e) { r = await fetch(`/api/admin/student/${encodeURIComponent(identifier)}`); }
        const json = await r.json();
        if (mounted && json && json.success && json.student) setStudent(json.student);
      } catch (err) {
        // ignore polling errors
      }
    };
    fetchDetails();
    const tid = setInterval(fetchDetails, 10000);
    return () => { mounted = false; clearInterval(tid); };
  }, [student]);

  // open subject modal and fetch session details
  const openSubject = async (subject) => {
    if (!student) return;
    setModalSubject(subject);
    setModalSessions([]);
    setModalOpen(true);
    try {
      const roll = student.roll;
      let r;
      try { r = await fetch(`http://localhost:5000/api/admin/attendance/sessions?roll=${encodeURIComponent(roll)}&subject=${encodeURIComponent(subject)}`); }
      catch (e) { r = await fetch(`/api/admin/attendance/sessions?roll=${encodeURIComponent(roll)}&subject=${encodeURIComponent(subject)}`); }
      const json = await r.json();
      if (json && json.success) setModalSessions(json.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions for subject', subject, err);
    }
  };

  // Fetch marks, CGPA, EduCoins, and reward history
  useEffect(() => {
    if (!student) return;
    (async () => {
      const identifier = student._id || student.roll;
      let loaded = false;

      // Primary path: JWT-protected student endpoint (if token exists)
      try {
        const token = localStorage.getItem('token');
        if (token) {
        let r;
        try {
          r = await fetch(`http://localhost:5000/api/student/marks`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (e) {
          r = await fetch(`/api/student/marks`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
        }
        const data = await r.json();
          if (r.ok && data && data.success) {
            applyAcademicPayload(data);
            loaded = true;
          }
        }
      } catch (err) {
        // ignore and try fallback
      }

      // Fallback path: admin academic endpoint by student id/roll
      if (!loaded && identifier) {
        try {
          let r;
          try {
            r = await fetch(`http://localhost:5000/api/admin/student/${encodeURIComponent(identifier)}/academic`);
          } catch (e) {
            r = await fetch(`/api/admin/student/${encodeURIComponent(identifier)}/academic`);
          }

          const ct = r.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await r.json();
            if (r.ok && data && data.success) {
              applyAcademicPayload(data);
              loaded = true;
            }
          }
        } catch (err) {
          // ignore and use student fallback below
        }
      }

      if (!loaded) {
        setCgpa(Number(student.cgpa || 0));
        setEduCoins(Number(student.eduCoins || 0));
      }
    })();
  }, [student, applyAcademicPayload]);

  const refreshDashboard = async () => {
    if (!student) return;
    setRefreshing(true);
    try {
      const identifier = student._id || student.roll;
      let r;
      try { r = await fetch(`http://localhost:5000/api/admin/student/${encodeURIComponent(identifier)}`); }
      catch (e) { r = await fetch(`/api/admin/student/${encodeURIComponent(identifier)}`); }

      const payload = await r.json();
      const nextStudent = payload && payload.success && payload.student ? payload.student : student;
      setStudent(nextStudent);
      await fetchSummary(nextStudent);
    } catch (err) {
      console.error('Failed to refresh dashboard', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div className="student-home-state">Loading student details...</div>;

  if (!student) {
    return (
      <div className="student-home-state">
        <h1>Welcome to the Student Home Page!</h1>
        <p>Please login to view your details.</p>
      </div>
    );
  }

  const coinBalance = typeof student.coins === 'number' ? student.coins : (student.coins || 0);
  const normalizedAttendanceQuery = attendanceQuery.trim().toLowerCase();
  const filteredAttendanceSummary = attendanceSummary.filter((item) => (item.subject || '').toLowerCase().includes(normalizedAttendanceQuery));
  const attendanceTotals = attendanceSummary.reduce((acc, item) => {
    acc.total += Number(item.total || 0);
    acc.present += Number(item.present || 0);
    return acc;
  }, { total: 0, present: 0 });
  const overallAttendance = attendanceTotals.total > 0
    ? Math.round((attendanceTotals.present / attendanceTotals.total) * 100)
    : 0;
  const lowAttendanceSubjects = attendanceSummary.filter((item) => {
    const total = Number(item.total || 0);
    const present = Number(item.present || 0);
    if (!total) return false;
    return Math.round((present / total) * 100) < 75;
  }).length;
  const averageMarks = marksData.length
    ? (marksData.reduce((sum, item) => {
      const total = Number(item.totalMarks || 0);
      const obtained = Number(item.marksObtained || 0);
      return sum + (total > 0 ? (obtained / total) * 100 : 0);
    }, 0) / marksData.length).toFixed(1)
    : '0.0';

  return (
    <div className="student-home-page">
      <div className="student-home-shell">
        <button
          onClick={() => setWalletOpen(true)}
          title="Wallet"
          className="wallet-fab"
        >
          <span className="wallet-icon" aria-hidden="true">💼</span>
          <span className="wallet-amount">{coinBalance}</span>
        </button>

        <header className="student-home-header">
          <div className="student-home-header-top">
            <div>
              <p className="student-home-kicker">Student Command Center</p>
              <h1>Hello {student.name}, welcome to your dashboard</h1>
              <p>Track attendance, marks, and EduCoin activity in one place.</p>
            </div>
            <div className="student-home-header-actions">
              <button
                className={`student-home-btn ${activeTab === 'dashboard' ? 'student-home-btn-primary' : 'student-home-btn-secondary'}`}
                onClick={() => setActiveTab('dashboard')}
              >Dashboard</button>
              <button
                className={`student-home-btn ${activeTab === 'courses' ? 'student-home-btn-primary' : 'student-home-btn-secondary'}`}
                onClick={() => setActiveTab('courses')}
              >📚 Courses</button>
              <button className="student-home-btn student-home-btn-secondary" onClick={refreshDashboard} disabled={refreshing}>
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button className="student-home-btn student-home-btn-secondary" onClick={() => setWalletOpen(true)}>
                Open Wallet
              </button>
            </div>
          </div>
        </header>

        {error && <p className="student-home-error">{error}</p>}

        {/* ── Courses Tab ── */}
        {activeTab === 'courses' && (() => {
          const categories = ['All', ...Array.from(new Set(courses.map(c => c.category)))];
          const filtered = courseFilter === 'All' ? courses : courses.filter(c => c.category === courseFilter);
          const doneCount = courses.filter(c => c.completed).length;
          const inProgressCount = courses.filter(c => c.enrolled && !c.completed).length;
          const affordableCount = courses.filter(c => coinBalance >= Number(c.cost || 10)).length;
          return (
          <section className="courses-section">
            {/* Banner */}
            <div className="courses-banner">
              <div className="courses-banner-left">
                <div className="courses-banner-icon-wrap">🎓</div>
                <div>
                  <h2 className="courses-banner-title">Course Library</h2>
                  <p className="courses-banner-sub">Invest EduCoins in learning — earn certificates you can download.</p>
                </div>
              </div>
              <div className="courses-banner-right">
                <div className="courses-balance-chip">
                  <span className="courses-balance-val">{coinBalance}</span>
                  <span className="courses-balance-label">EduCoins</span>
                </div>
                <div className="courses-stat-row">
                  <span className="courses-stat courses-stat--done">✓ {doneCount} completed</span>
                  <span className="courses-stat courses-stat--prog">{inProgressCount > 0 ? `● ${inProgressCount} in progress` : `${courses.length} courses`}</span>
                  <span className="courses-stat courses-stat--afford">🪙 {affordableCount} affordable</span>
                </div>
              </div>
            </div>

            {/* Category filter */}
            <div className="courses-filter-row">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`courses-filter-pill${courseFilter === cat ? ' courses-filter-pill--active' : ''}`}
                  onClick={() => setCourseFilter(cat)}
                >
                  {cat !== 'All' && (CATEGORY_ICONS[cat] || '📖')} {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            {coursesLoading ? (
              <div className="courses-loading"><div className="courses-spinner" /><span>Loading courses…</span></div>
            ) : filtered.length === 0 ? (
              <div className="courses-empty">
                <h3>No courses in this category</h3>
                <p>Try another filter, or check back after new courses are published.</p>
              </div>
            ) : (
              <div className="courses-grid">
                {filtered.map((course, idx) => {
                  const msg = courseMsg.id === course._id ? courseMsg : null;
                  const icon = CATEGORY_ICONS[course.category] || '📖';
                  const accent = CATEGORY_COLORS[course.category] || '#3b82f6';
                  const courseCost = Number(course.cost || 10);
                  return (
                    <div
                      key={course._id}
                      className={`course-card course-card--reveal ${course.completed ? 'course-card--done' : course.enrolled ? 'course-card--enrolled' : ''}`}
                      style={{ '--card-accent': accent, '--course-delay': `${Math.min(idx, 9) * 70}ms` }}
                    >
                      <div className="course-card-accent-bar" />
                      <div className="course-card-body">
                        <div className="course-card-head">
                          <span className="course-card-icon">{icon}</span>
                          <div className="course-card-badges">
                            <span className="course-category-badge" style={{ background: accent + '1a', color: accent }}>{course.category}</span>
                            {course.completed && <span className="course-done-badge">✓ Done</span>}
                            {course.enrolled && !course.completed && <span className="course-enrolled-badge">● Active</span>}
                          </div>
                        </div>
                        <h3 className="course-title">{course.title}</h3>
                        <p className="course-desc">{course.description}</p>
                        <div className="course-meta">
                          <span className="course-meta-pill">⏱ {course.duration}</span>
                          <span className="course-meta-pill course-meta-pill--coin">🪙 {courseCost} coins</span>
                        </div>
                        {msg && (
                          <div className={`course-msg ${msg.ok ? 'course-msg--ok' : 'course-msg--err'}`}>{msg.text}</div>
                        )}
                        <div className="course-actions">
                          {!course.enrolled && !course.completed && (
                            <button
                              className="course-btn course-btn-enroll"
                              onClick={() => handleEnroll(course._id)}
                              disabled={coinBalance < courseCost}
                            >
                              {coinBalance < courseCost ? '⚠ Insufficient Coins' : `+ Enroll for ${courseCost} coins`}
                            </button>
                          )}
                          {course.enrolled && !course.completed && (
                            <button className="course-btn course-btn-complete" onClick={() => handleComplete(course._id)}>✓ Mark Complete</button>
                          )}
                          {course.completed && (
                            <button className="course-btn course-btn-cert" onClick={() => downloadCertificate(course)}>⬇ Certificate</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          );
        })()}

        {/* ── Dashboard Tab ── */}
        {activeTab === 'dashboard' && (<>
        <section className="student-home-metrics" aria-label="Student performance quick metrics">
          <article className="student-home-metric-card">
            <p>Overall Attendance</p>
            <h3>{overallAttendance}%</h3>
            <span>{attendanceSummary.length} subjects tracked</span>
          </article>
          <article className="student-home-metric-card">
            <p>Average Marks</p>
            <h3>{averageMarks}%</h3>
            <span>{marksData.length} mark entries</span>
          </article>
          <article className="student-home-metric-card">
            <p>Attention Needed</p>
            <h3>{lowAttendanceSubjects}</h3>
            <span>subjects under 75% attendance</span>
          </article>
          <article className="student-home-metric-card">
            <p>Current CGPA</p>
            <h3>{Number(cgpa || 0).toFixed(2)}</h3>
            <span>computed from academic records</span>
          </article>
        </section>

        <div className="student-home-layout">
          <div className="student-home-main">
            <div className="student-top-grid">
              <aside className="student-profile-card">
                <div className="profile-photo-wrap">
            {student.imageUrl ? (
                    <img src={student.imageUrl} alt={student.name} className="profile-photo" />
            ) : (
                    <div className="profile-photo-empty">No Photo</div>
            )}
                </div>
                <div className="profile-details">
                  <p><strong>Name:</strong> {student.name}</p>
                  <p><strong>Roll:</strong> {student.roll}</p>
                  <p><strong>Dept:</strong> {student.dept}</p>
                  <p><strong>Section:</strong> {student.section || '-'}</p>
                  <p><strong>Semester:</strong> {student.sem}</p>
                  <p><strong>Email:</strong> {student.email}</p>
                  <p><strong>EduCoins:</strong> {coinBalance}</p>
                </div>
              </aside>

              <main className="attendance-card">
                <div className="attendance-head-row">
                  <h2>Attendance Summary by Subject</h2>
                  <input
                    type="search"
                    className="attendance-search"
                    value={attendanceQuery}
                    onChange={(e) => setAttendanceQuery(e.target.value)}
                    placeholder="Search subject..."
                    aria-label="Search attendance subject"
                  />
                </div>
            {filteredAttendanceSummary.length === 0 ? (
                  <div className="empty-muted">No attendance records yet.</div>
            ) : (
                  <div className="attendance-grid">
                    {filteredAttendanceSummary.map((item, idx) => {
                  const total = Number(item.total || 0);
                  const present = Number(item.present || 0);
                  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                  let statusLabel = 'Watch';
                  if (pct >= 90) statusLabel = 'Excellent';
                  else if (pct >= 75) statusLabel = 'Good';
                  else if (pct >= 50) statusLabel = 'Watch';
                  else statusLabel = 'Critical';
                  let barColor = '#dc2626';
                  // Color mapping:
                  // 100% -> green, 75-99 -> blue, 50-74 -> orange, 0-40 -> red, others -> orange
                  if (pct === 100) barColor = '#16a34a';
                  else if (pct >= 75) barColor = '#1e40af';
                  else if (pct >= 50) barColor = '#d97706';
                  else if (pct <= 40) barColor = '#dc2626';
                  else barColor = '#d97706';
                  return (
                        <div key={item.subject || `subject-${idx}`} className="attendance-item" onClick={() => openSubject(item.subject)}>
                      <div className={`attendance-pill attendance-pill-${statusLabel.toLowerCase()}`}>{statusLabel}</div>
                      <SemiCircle percent={pct} label={item.subject || '—'} />
                          <div className="attendance-meta">{present} / {total} ({pct}%)</div>
                          <div className="attendance-bar" aria-hidden>
                        <div style={{ width: `${pct}%`, height: '100%', background: barColor }} />
                      </div>
                    </div>
                  );
                    })}
              </div>
            )}
              </main>
            </div>

            <section className="academic-card">
              <div className="academic-head-row">
                <h2>Academic Performance</h2>
                <button className="academic-toggle-btn" onClick={() => setShowPerformanceChart((current) => !current)}>
                  {showPerformanceChart ? 'Hide Graph' : 'Show Graph'}
                </button>
              </div>
              {marksData.length === 0 ? (
                <div className="empty-muted">No marks data available.</div>
              ) : (
                <>
                  <div className="academic-table-wrap">
                    <table className="academic-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Marks Obtained</th>
                          <th>Total Marks</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marksData.map((m, i) => (
                          <tr key={i}>
                            <td>{m.subject?.name || m.subject?.code || m.subjectName || m.subjectCode || '-'}</td>
                            <td>{m.marksObtained}</td>
                            <td>{m.totalMarks}</td>
                            <td>{m.totalMarks ? ((m.marksObtained / m.totalMarks) * 100).toFixed(2) : '0.00'}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {showPerformanceChart && (
                    <div className="chart-wrap">
                      <ResponsiveContainer>
                        <BarChart data={Object.values(subjectStats).map(s => ({ name: s.name, Percentage: s.max ? (s.obtained / s.max) * 100 : 0 }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Percentage" fill="#1e40af" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="cgpa-row">
                    CGPA: {cgpa.toFixed(2)}%
                    <span className={`cgpa-badge ${cgpa > 80 ? 'eligible' : 'not-eligible'}`}>
                      {cgpa > 80 ? 'Eligible for EduCoin Reward!' : 'Keep improving for rewards'}
                    </span>
                  </div>

                  <div className="edcoins-row">EduCoins: {eduCoins}</div>

                  <div className="reward-history">
                    <h3>EduCoin Reward History</h3>
                    {rewardHistory.length === 0 ? <div className="empty-muted">No rewards yet.</div> : (
                      <ul>
                        {rewardHistory.map((r, i) => (
                          <li key={i}>
                            {r.amount} coins for {r.reason} ({new Date(r.timestamp || r.createdAt).toLocaleString()})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          <aside className="coin-history-panel" aria-live="polite">
            <div className="coin-history-header">
              <strong>EduCoin History</strong>
              <div className="coin-history-actions">
                <span className="coin-history-count">{coinHistory.length}</span>
                <button
                  onClick={() => {
                    if (!student || !student.roll) return;
                    try { localStorage.removeItem(historyStorageKey(student.roll)); } catch (e) {}
                    setCoinHistory([]);
                  }}
                  className="coin-clear-btn"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="coin-history-list">
              {coinHistory.length === 0 ? (
                <div className="empty-muted">No recent activity</div>
              ) : (
                coinHistory.map(item => (
                  <div key={item.id} className="coin-history-item">
                    <div className={`coin-icon-box ${item.delta > 0 ? 'credit' : 'debit'}`}>
                      {item.delta > 0 ? '➕' : '➖'}
                    </div>
                    <div className="coin-item-body">
                      <div className="coin-item-top">
                        <div className="coin-item-desc">{item.desc}</div>
                        <div className={`coin-item-delta ${item.delta > 0 ? 'credit' : 'debit'}`}>
                          {item.delta > 0 ? `+${item.delta}` : `${item.delta}`}
                        </div>
                      </div>
                      <div className="coin-item-meta">
                        <div>{new Date(item.ts).toLocaleString()}</div>
                        <div>Bal: {item.balance}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </>)}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onMouseDown={() => setModalOpen(false)}>
          <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{modalSubject || 'Subject'} - Attendance Details</h3>
              <button onClick={() => setModalOpen(false)} className="modal-close-btn">Close</button>
            </div>
            <div className="modal-summary">
              <p>
                {(() => {
                  const item = attendanceSummary.find(a => a.subject === modalSubject) || {};
                  return `Classes taken: ${item.total || 0} · Present: ${item.present || 0}`;
                })()}
              </p>
            </div>
            <div className="modal-content">
              {modalSessions.length === 0 ? <div className="empty-muted">No sessions recorded.</div> : (
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalSessions.map((s, i) => (
                      <tr key={i}>
                        <td>{s.date || '-'}</td>
                        <td>{(s.startTime || '-') + (s.endTime ? `-${s.endTime}` : '')}</td>
                        <td>{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {walletOpen && (
        <div className="modal-overlay" onMouseDown={() => setWalletOpen(false)}>
          <div className="wallet-modal-card" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>EduCoin Wallet</h3>
              <button onClick={() => setWalletOpen(false)} className="modal-close-btn">Close</button>
            </div>
            <div className="wallet-balance-box">
              <p>Current balance:</p>
              <div className="wallet-balance-value">
                {coinBalance}
                <span>EduCoins</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// simple semicircle SVG component
function SemiCircle({ percent = 0, label = '' }){
  const pct = Math.max(0, Math.min(100, Number(percent || 0)));
  const r = 40; const cx = 50; const cy = 50;
  const sweep = Math.PI * (pct / 100); // 0..PI
  const endTheta = Math.PI - sweep;
  const x = cx + r * Math.cos(endTheta);
  const y = cy - r * Math.sin(endTheta);
  const largeArc = sweep > Math.PI ? 1 : 0;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`;

  let color = '#dc2626'; // red
  if (pct === 100) color = '#16a34a';
  else if (pct >= 75) color = '#1e40af';
  else if (pct >= 50) color = '#d97706';
  else if (pct <= 40) color = '#dc2626';
  else color = '#d97706';

  return (
    <div className="semi-circle-wrap">
      <svg viewBox="0 0 100 60" width="120" height="72" aria-hidden>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
        <path d={path} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      </svg>
      <div className="semi-label">{label}</div>
      <div className="semi-percent" style={{ color }}>{pct}%</div>
    </div>
  );
}

export default HomePage;
