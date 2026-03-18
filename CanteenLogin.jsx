import React, { useState } from 'react';
import './CanteenLogin.css';
import { useNavigate } from 'react-router-dom';

export default function CanteenLogin(){
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/canteen/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: username.trim(), password: password })
      });
      if (!res.ok) {
        if (res.status === 401) setError('Invalid id or password');
        else setError('Login failed. Please try again');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data && data.success) {
        // success — redirect to canteen page
        navigate('/canteen');
      } else {
        setError(data?.message || 'Invalid id or password');
      }
    } catch (err) {
      console.error('Login error', err);
      setError('Network error. Check server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="canteen-login-page">
      <div className="canteen-aura canteen-aura-left" aria-hidden="true" />
      <div className="canteen-aura canteen-aura-right" aria-hidden="true" />

      <div className="canteen-login-shell">
        <div className="canteen-brand-panel" aria-hidden="true">
          <p className="canteen-kicker">Campus Canteen</p>
          <h1 className="canteen-title">Kitchen Operations Portal</h1>
          <p className="canteen-sub">
            Sign in to manage food orders, student scans, and secure educoin checkout across the canteen counter.
          </p>

          <div className="canteen-feature-list">
            <div className="canteen-feature">Live order queue</div>
            <div className="canteen-feature">Fast ID scan workflow</div>
            <div className="canteen-feature">Wallet-safe deductions</div>
          </div>

          <div className="canteen-status-card">
            <div className="canteen-status-label">Access Role</div>
            <div className="canteen-status-value">Canteen Staff</div>
          </div>
        </div>

        <div className="canteen-form-panel">
          <div className="canteen-form-top">
            <div className="canteen-logo-wrap" aria-hidden="true">
              <div className="canteen-logo">🍽️</div>
            </div>
            <div>
              <h2>Canteen Staff Login</h2>
              <p>Enter your credentials to continue.</p>
            </div>
          </div>

          <div className="canteen-role-row">
            <label htmlFor="canteen-role">Login Type</label>
            <select id="canteen-role" className="canteen-role-select" defaultValue="canteen">
              <option value="">Select Login Type</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="canteen">Canteen</option>
              <option value="library">Library</option>
            </select>
          </div>

          <form onSubmit={handleSubmit} className="canteen-login-form">
            <div className="canteen-form-group">
              <label htmlFor="canteen-username">Username</label>
              <div className="canteen-input-wrap">
                <input
                  id="canteen-username"
                  value={username}
                  onChange={(e)=>setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="canteen-form-group">
              <label htmlFor="canteen-password">Password</label>
              <div className="canteen-input-wrap">
                <input
                  id="canteen-password"
                  type="password"
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && <div className="canteen-error-message">{error}</div>}

            <button type="submit" className="canteen-login-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}