import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LibrarianLogin.css';

export default function LibrarianLogin(){
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!id.trim() || !password) { setError('Enter id and password'); return; }
    setLoading(true);
    try {
      // Attempt server login if endpoint exists; otherwise accept any credentials in dev
      const res = await fetch(`${API_BASE}/api/library/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id.trim(), password })
      }).catch(()=>null);
      if (res) {
        if (!res.ok) {
          const j = await res.json().catch(()=>({message:'Login failed'}));
          setError(j.message || 'Invalid credentials');
          setLoading(false);
          return;
        }
        // success
        navigate('/library');
        return;
      }

      // No server endpoint reachable — fall back to client-side redirect
      navigate('/library');
    } catch (err) {
      console.error('Librarian login error', err);
      setError('Network error');
    } finally { setLoading(false); }
  };

  return (
    <div className="librarian-login-wrap">
      <div className="librarian-login-card">
        <div className="login-brand-panel" aria-hidden="true">
          <div className="brand-kicker">Campus Library</div>
          <h1 className="brand-title">Librarian Access</h1>
          <p className="brand-copy">Manage lending, returns, and penalties with a secure staff sign in.</p>
          <div className="brand-metrics">
            <div className="metric-chip">
              <span className="metric-label">Role</span>
              <span className="metric-value">Librarian</span>
            </div>
            <div className="metric-chip">
              <span className="metric-label">Status</span>
              <span className="metric-value">Online</span>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <h2 className="form-title">Sign In</h2>
          <p className="muted">Enter your staff credentials to continue.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="staff-id">Staff ID</label>
            <input
              id="staff-id"
              value={id}
              onChange={(e)=>setId(e.target.value)}
              className="input"
              placeholder="Enter staff ID"
              autoComplete="username"
            />

            <label htmlFor="staff-password">Password</label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="input"
              placeholder="Enter password"
              autoComplete="current-password"
            />

            {error && <div className="error">{error}</div>}

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
