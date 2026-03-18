import React, { useState, useEffect } from 'react';
import './StationaryLogin.css';
import { useNavigate } from 'react-router-dom';

export default function StationaryLogin(){
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`);

  // generate a short random token for demo/random input
  function randToken(prefix = ''){
    return prefix + Math.random().toString(36).slice(2, 8);
  }

  useEffect(()=>{
    // autofill with random username/password on mount
    setUsername(randToken('u_'));
    setPassword(randToken('p_'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stationary/login`, {
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
        navigate('/stationary');
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
    <div className="stationary-login-page">
      <div className="stationary-aura stationary-aura-left" aria-hidden="true" />
      <div className="stationary-aura stationary-aura-right" aria-hidden="true" />

      <div className="stationary-login-shell">
        <div className="stationary-brand-panel" aria-hidden="true">
          <p className="stationary-kicker">Campus Store</p>
          <h1 className="stationary-title">Stationary Access Portal</h1>
          <p className="stationary-sub">
            Sign in to manage inventory, billing, and secure educoin transactions for the stationary counter.
          </p>

          <div className="stationary-feature-list">
            <div className="stationary-feature">Inventory updates</div>
            <div className="stationary-feature">Student checkout</div>
            <div className="stationary-feature">Instant wallet deductions</div>
          </div>

          <div className="stationary-demo-note">
            <div className="demo-label">Demo ID</div>
            <div className="demo-value">stat001</div>
          </div>
        </div>

        <div className="stationary-form-panel">
          <div className="stationary-form-top">
            <div className="stationary-logo-wrap" aria-hidden="true">
              <div className="stationary-logo">🖊️</div>
            </div>
            <div>
              <h2>Stationary Staff Login</h2>
              <p>Use your staff credentials to continue.</p>
            </div>
          </div>

          <div className="stationary-role-row">
            <label htmlFor="stationary-role">Login Type</label>
            <select id="stationary-role" className="stationary-role-select" defaultValue="stationary">
              <option value="">Select Login Type</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="canteen">Canteen</option>
              <option value="library">Library</option>
              <option value="stationary">Stationary</option>
            </select>
          </div>

          <form onSubmit={handleSubmit} className="stationary-login-form">
            <div className="form-group">
              <label htmlFor="stationary-username">Username</label>
              <div className="input-container">
                <input
                  id="stationary-username"
                  value={username}
                  onChange={(e)=>setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="stationary-password">Password</label>
              <div className="input-container">
                <input
                  id="stationary-password"
                  type="password"
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="helper-actions">
              <button
                type="button"
                onClick={() => { setUsername(randToken('u_')); setPassword(randToken('p_')); }}
                className="helper-btn"
              >
                Randomize
              </button>
              <button
                type="button"
                onClick={() => { setUsername('stat001'); setPassword('secret123'); }}
                className="helper-btn helper-btn-demo"
              >
                Use demo credentials
              </button>
            </div>

            <div className="form-footer">
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

