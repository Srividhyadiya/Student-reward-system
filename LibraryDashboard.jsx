import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LibraryDashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

export default function LibraryDashboard() {
  const navigate = useNavigate();
  const [creditedAmount, setCreditedAmount] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchCredited(){
      try{
        const res = await fetch(`${API_BASE}/api/library/credit`);
        if(!res.ok) throw new Error('Network response not ok');
        const j = await res.json();
        const amt = (j && (typeof j.amount_credited === 'number' ? j.amount_credited : Number(j.amount_credited || 0))) || 0;
        if(mounted) setCreditedAmount(amt);
      }catch(e){ console.warn('Could not fetch credited amount', e); if(mounted) setCreditedAmount(0); }
    }
    fetchCredited();
    const iv = setInterval(fetchCredited, 10000); // poll every 10s
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const buttons = [
    {
      key: 'add-books',
      emoji: '📚',
      label: 'Add Books',
      description: 'Register newly arrived titles into the collection.',
      to: '/library/add-books',
      cls: 'tone-sky',
    },
    {
      key: 'issue-book',
      emoji: '📖',
      label: 'Issue Book',
      description: 'Lend books quickly with student verification.',
      to: '/library/issue-book',
      cls: 'tone-mint',
    },
    {
      key: 'due-list',
      emoji: '⏰',
      label: 'Due List',
      description: 'Track soon-to-expire returns and reminders.',
      to: '/library/due-list',
      cls: 'tone-amber',
    },
    {
      key: 'returned-list',
      emoji: '✅',
      label: 'Returned List',
      description: 'Review completed returns and closed issues.',
      to: '/library/returned-list',
      cls: 'tone-jade',
    },

  ];

  const Button = ({ item }) => (
    <button
      onClick={() => navigate(item.to)}
      className={`lib-btn ${item.cls}`}
      aria-label={item.label}
    >
      <div className="lib-btn-left">
        <span className="lib-emoji" aria-hidden>{item.emoji}</span>
        <div>
          <div className="lib-label">{item.label}</div>
          <div className="lib-desc">{item.description}</div>
        </div>
      </div>
      <div className="lib-arrow">›</div>
    </button>
  );

  return (
    <div className="lib-page">
      <div className="lib-aura lib-aura-left" aria-hidden="true" />
      <div className="lib-aura lib-aura-right" aria-hidden="true" />

      <div className="lib-card">
        <div className="lib-card-top" />

        <div className="lib-card-body">
          <div className="lib-hero">
            <div>
              <p className="lib-kicker">Campus Library</p>
              <h1 className="lib-title">Library Control Center</h1>
              <p className="lib-sub">Manage catalog, lending, returns, and penalties from one modern dashboard.</p>
            </div>

            <div className="lib-wallet" aria-live="polite">
              <div className="lib-wallet-icon" aria-hidden="true">🪙</div>
              <div>
                <div className="lib-wallet-label">Total Educoins Credited</div>
                <div className="lib-wallet-value">{creditedAmount !== null ? creditedAmount : '—'}</div>
              </div>
            </div>
          </div>
          <div className="lib-stats-grid" aria-hidden="true">
            <div className="lib-stat-card">
              <div className="lib-stat-label">Modules</div>
              <div className="lib-stat-value">5</div>
            </div>
            <div className="lib-stat-card">
              <div className="lib-stat-label">Live Status</div>
              <div className="lib-stat-value">Online</div>
            </div>
            <div className="lib-stat-card">
              <div className="lib-stat-label">Workspace</div>
              <div className="lib-stat-value">Librarian</div>
            </div>
          </div>

          <div className="lib-grid">
            {buttons.map((b, idx) => (
              <div key={b.key} className={`lib-grid-item ${idx === 4 ? 'lib-grid-span-2' : ''}`}>
                <Button item={b} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
