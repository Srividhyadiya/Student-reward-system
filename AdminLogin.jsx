import React, { useState } from 'react';
import './AdminLogin.css';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (adminId.trim() && password.trim()) {
      try {
        // Call backend API to verify admin credentials
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ adminId, password }),
        });
        const result = await response.json();
        if (result.success) {
          navigate("/admin/dashboard");
        } else {
          setError("Invalid Admin ID or Password.");
        }
      } catch (err) {
        setError("Server error. Please try again later.");
      }
    } else {
      setError("Please enter Admin ID and Password.");
    }
  };

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-orb admin-auth-orb-left" aria-hidden="true" />
      <div className="admin-auth-orb admin-auth-orb-right" aria-hidden="true" />

      <div className="admin-auth-shell">
        <section className="admin-auth-intro" aria-label="Admin portal introduction">
          <p className="admin-auth-kicker">Control Center</p>
          <h1 className="admin-auth-title">Admin Portal Login</h1>
          <p className="admin-auth-copy">
            Access admissions, faculty, student services, and operations from one secure dashboard.
          </p>

          <div className="admin-auth-points">
            <article className="admin-auth-point-card">
              <h3>Institution Management</h3>
              <p>Coordinate student, teacher, and department workflows efficiently.</p>
            </article>
            <article className="admin-auth-point-card">
              <h3>Realtime Oversight</h3>
              <p>Review attendance, academic updates, and system activity in minutes.</p>
            </article>
            <article className="admin-auth-point-card">
              <h3>Protected Access</h3>
              <p>Use your verified admin credentials to continue into the dashboard.</p>
            </article>
          </div>
        </section>

        <section className="admin-auth-card" aria-label="Admin login form">
          <div className="admin-auth-icon-wrap">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="Admin Icon"
              className="admin-auth-icon"
            />
          </div>

          <h2 className="admin-auth-heading">Welcome, Admin</h2>
          <p className="admin-auth-subheading">Enter your credentials to continue.</p>

          <form className="admin-auth-form" onSubmit={handleLogin}>
            <label className="admin-auth-label" htmlFor="adminId">Admin ID</label>
          <input
            id="adminId"
            name="adminId"
            type="text"
            placeholder="Enter your Admin ID"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            aria-label="Admin ID"
            className="admin-auth-input"
          />

            <label className="admin-auth-label" htmlFor="adminPassword">Password</label>
          <input
            id="adminPassword"
            name="adminPassword"
            type="password"
            placeholder="Enter your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            className="admin-auth-input"
          />

            <button type="submit" className="admin-auth-submit" title="Login Button">Login</button>
            {error && <p className="admin-auth-error" role="alert">{error}</p>}
          </form>
        </section>
      </div>
    </div>
  );
};

export default AdminLogin;
