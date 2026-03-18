import React, { useEffect, useMemo, useState } from 'react';
import amcLogo from '../assets/amclogo.jpg';
import student1 from '../assets/student1.jpg';
import student2 from '../assets/student2.jpg';
import student3 from '../assets/student3.jpg';
import campusBg from '../assets/amc-background.jpg';
import { useNavigate } from 'react-router-dom';
import './StudentLogin.css';

const StudentLogin = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTip, setActiveTip] = useState(0);
  const navigate = useNavigate();

  const tipCards = useMemo(() => ([
    {
      title: 'Attendance Insights',
      text: 'Track subject-wise attendance trends and drill into each class session.'
    },
    {
      title: 'Academic Tracker',
      text: 'Watch marks, percentage, and CGPA progress in one interactive dashboard.'
    },
    {
      title: 'EduCoin Wallet',
      text: 'Monitor credits in real time and review your complete reward history.'
    }
  ]), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTip((current) => (current + 1) % tipCards.length);
    }, 4200);

    return () => clearInterval(timer);
  }, [tipCards.length]);

  const portalGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    if (!studentId.trim() || !password.trim()) {
      setError('Please enter Student ID and Password.');
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // Try backend directly first (common dev port). If it fails, try relative path.
        let r;
        try {
          r = await fetch('http://localhost:5000/api/admin/student/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: studentId.trim(), password: password.trim() })
          });
        } catch (e) {
          // network error (backend not running on 5000)
          r = await fetch('/api/admin/student/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: studentId.trim(), password: password.trim() })
          });
        }

        // if response is not JSON (e.g. HTML from dev server), surface helpful message
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await r.text();
          console.error('Login response was not JSON:', text.slice(0, 500));
          setError('Unexpected response from server (not JSON). Check server logs.');
          return;
        }
        const data = await r.json();
        if (!data || !data.success) {
          setError(data && data.message ? data.message : 'Invalid ID or password');
          return;
        }

        // Choose identifier to fetch authoritative student record: prefer _id returned by login, otherwise roll
        const returned = data.student || {};
        const identifier = returned._id || returned.roll || studentId.trim();

        // Fetch fresh student details from backend (this endpoint omits password)
        try {
          // try backend directly first
          let rr;
          try {
            rr = await fetch(`http://localhost:5000/api/admin/student/${encodeURIComponent(identifier)}`);
          } catch (e) {
            rr = await fetch(`/api/admin/student/${encodeURIComponent(identifier)}`);
          }

          const ct2 = rr.headers.get('content-type') || '';
          if (!ct2.includes('application/json')) {
            const txt = await rr.text();
            console.error('Student detail response not JSON:', txt.slice(0,500));
            setError('Unexpected response fetching student details (not JSON)');
            return;
          }
          const payload = await rr.json();
          if (rr.ok && payload && payload.success && payload.student) {
            try { localStorage.setItem('student', JSON.stringify(payload.student)); } catch (e) {}
            navigate('/student');
            return;
          }
          // If fetch didn't return fresh data, fall back to what login returned
          if (returned && Object.keys(returned).length) {
            try { localStorage.setItem('student', JSON.stringify(returned)); } catch (e) {}
            navigate('/student');
            return;
          }

          setError(payload && payload.message ? payload.message : 'Failed to load student details');
        } catch (fetchErr) {
          console.error('Error fetching student after login', fetchErr);
          // fallback to storing returned student if present
          if (returned && Object.keys(returned).length) {
            try { localStorage.setItem('student', JSON.stringify(returned)); } catch (e) {}
            navigate('/student');
            return;
          }
          setError('Server error while fetching student details');
        }
      } catch (err) {
        console.error('Login error', err);
        setError('Server error during login');
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="student-login-page">
      <div className="student-bg-orb student-bg-orb-left" aria-hidden="true" />
      <div className="student-bg-orb student-bg-orb-right" aria-hidden="true" />

      <div className="student-photo-collage" aria-hidden="true">
        <img src={campusBg} alt="" className="student-collage-img student-collage-campus" />
        <img src={student1} alt="" className="student-collage-img student-collage-student-one" />
        <img src={student2} alt="" className="student-collage-img student-collage-student-two" />
        <img src={student3} alt="" className="student-collage-img student-collage-student-three" />
      </div>

      <div className="student-login-shell">
        <div className="student-left-panel">
          <img
            src={amcLogo}
            alt="AMC Logo"
            className="student-logo"
          />

          <p className="student-kicker">AMC Institution of Technology</p>
          <h1 className="student-heading">Student Login Portal</h1>
          <p className="student-copy">Access attendance, marks, EduCoins, and campus services with your student credentials.</p>

          <div className="student-highlight-row" aria-hidden="true">
            <span>Live attendance tracker</span>
            <span>Academic analytics</span>
            <span>Rewards wallet</span>
          </div>

          <div className="student-campus-info">
            <p>An Autonomous Institute under VTU</p>
            <p>Channasandra, Bangalore - 560098</p>
            <p>www.amc.ac.in</p>
          </div>

          <div className="student-live-tip" role="status" aria-live="polite">
            <h3>{tipCards[activeTip].title}</h3>
            <p>{tipCards[activeTip].text}</p>
            <div className="student-tip-dots" aria-hidden="true">
              {tipCards.map((_, index) => (
                <span key={index} className={index === activeTip ? 'is-active' : ''} />
              ))}
            </div>
          </div>
        </div>

        <div className="student-right-panel">
          <div className="student-avatar" aria-hidden="true">🎓</div>
          <h2>{portalGreeting}, Student</h2>
          <p className="student-form-subtitle">Use your USN and password to open your interactive dashboard.</p>

          <form className="student-login-form" onSubmit={handleLogin}>
            <label htmlFor="student-id">USN Number (Username)</label>
            <div className="student-input-wrap">
          <input
            id="student-id"
            type="text"
            placeholder="Enter your USNO number"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
            </div>

            <label htmlFor="student-password">Password</label>
            <div className="student-input-wrap">
              <input
                id="student-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="student-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && <p className="student-error-message">{error}</p>}
            <button type="submit" className="student-login-button" disabled={loading}>{loading ? 'Logging in...' : 'Enter Dashboard'}</button>
          </form>

          <p className="student-footer-note">Tip: Use the same credentials issued by admin records.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
