import React, { useState } from 'react';
import amcLogo from '../assets/amclogo.jpg';
import { useNavigate } from 'react-router-dom';
import './TeacherLogin.css';

const TeacherLogin = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (studentId.trim() && password.trim()) {
      // on successful login navigate to the teacher profile page
      navigate(`/teacher/${studentId}`);
    } else {
      setError('Please enter Teacher ID and Password.');
    }
  };

  return (
    <div className="teacher-login-page">
      <div className="teacher-login-orb teacher-login-orb-left" aria-hidden="true" />
      <div className="teacher-login-orb teacher-login-orb-right" aria-hidden="true" />

      <div className="teacher-login-shell">
      <div className="teacher-left-panel">
        <img
          src={amcLogo}
          alt="AMC Logo"
          className="teacher-logo"
        />

        <p className="teacher-kicker">AMC Institution of Technology</p>
        <h1 className="teacher-heading">Teacher Access Portal</h1>
        <p className="teacher-copy">Manage timetable, attendance tracking, and daily class operations from one dashboard.</p>

        <div className="teacher-campus-info">
          <p>An Autonomous Institute under VTU</p>
          <p>Channasandra, Bangalore - 560098</p>
          <p>www.amc.ac.in</p>
        </div>

        <div className="teacher-notice-box">
          <h3>Notice Board</h3>
          <p>Welcome to the updated faculty dashboard preview.</p>
        </div>
      </div>

      <div className="teacher-right-panel">
        <div className="teacher-avatar" aria-hidden="true">🧑‍🏫</div>
        <h2>Teacher Login</h2>
        <p className="teacher-form-subtitle">Use your Teacher ID and password to continue.</p>
        <form className="teacher-login-form" onSubmit={handleLogin}>
          <label htmlFor="teacher-id">Teacher ID</label>
          <div className="teacher-input-wrap">
          <input
            id="teacher-id"
            type="text"
            placeholder="Enter your Teacher ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          </div>

          <label htmlFor="teacher-password">Password</label>
          <div className="teacher-input-wrap">
          <input
            id="teacher-password"
            type="password"
            placeholder="Enter your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          </div>

          {error && <p className="teacher-error-message">{error}</p>}
          <button className="teacher-login-button" type="submit">Login</button>
        </form>
      </div>
      </div>
    </div>
  );
};

export default TeacherLogin;
