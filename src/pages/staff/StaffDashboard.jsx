import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../css/AdminDashboard.css';
import '../../css/Transactions.css';
import ErrorModal from '../../components/ErrorModal';

// ISSUE-05 FIX: Staff was the only role without a dashboard — this creates one.
// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL.
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ISSUE-12: Format timestamps in Philippine Standard Time
const fmtTimePH = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const isToday =
    d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) ===
    now.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' });
  const timeStr = d.toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (isToday) return `Today, ${timeStr}`;
  return (
    d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }) +
    ', ' +
    timeStr
  );
};

/**
 * StaffDashboard — ISSUE-05 FIX
 *
 * Staff were the only role without a landing dashboard. This page surfaces
 * the key metrics Staff act on daily: pending claims, recent transactions,
 * and a summary of active campaign vouchers.
 */
const StaffDashboard = () => {
  const [claims,       setClaims]       = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [campaigns,    setCampaigns]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [errorConfig,  setErrorConfig]  = useState({
    show: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [claimRes, txnRes, campRes] = await Promise.all([
          axios.get(`${BASE}/api/claims/`),
          axios.get(`${BASE}/api/transactions/`),
          axios.get(`${BASE}/api/campaigns/`),
        ]);
        setClaims(claimRes.data);
        setTransactions(txnRes.data);
        setCampaigns(campRes.data.filter(c => c.status === 'Active'));
      } catch (err) {
        console.error('StaffDashboard fetch error:', err);
        setErrorConfig({
          show: true,
          title: 'Sync Failed',
          message: 'We couldn\'t load the dashboard data. Please check your connection to the Robinson Mall server.'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="txn-loading">
          <i className="fa-solid fa-spinner fa-spin fa-2xl" style={{ color: '#bdbdbd' }}></i>
        </div>
      </div>
    );
  }



  // ── Derived stats ──────────────────────────────────────────────────────────
  const pendingClaims   = claims.filter(c => c.status === 'Pending');
  const approvedClaims  = claims.filter(c => c.status === 'Approved');
  const pendingTxns     = transactions.filter(t => t.status === 'Pending');
  const approvedTxns    = transactions.filter(t => t.status === 'Approved');

  // Recent 8 claims (LIFO)
  const recentClaims    = [...claims].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  ).slice(0, 8);

  const statusDot = (status) => {
    if (status === 'Approved') return '#22c55e';
    if (status === 'Pending')  return '#eab308';
    if (status === 'Rejected') return '#ef4444';
    return '#94a3b8';
  };

  return (
    <div className="dashboard-container">
      {/* ── Header ── */}
      <header className="dashboard-header">
        <h1>Staff Overview</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
          Your daily at-a-glance: claims, transactions, and active campaigns.
        </p>
      </header>

      {/* ── Stat Cards ── */}
      <div className="txn-stats">
        <div className="txn-stat-card">
          <div className="stat-title">Pending Claims</div>
          <div className="stat-value" style={{ color: '#eab308' }}>{pendingClaims.length}</div>
          <div className="dash-stat-sub">awaiting review</div>
        </div>
        <div className="txn-stat-card">
          <div className="stat-title">Approved Claims</div>
          <div className="stat-value" style={{ color: '#22c55e' }}>{approvedClaims.length}</div>
          <div className="dash-stat-sub">successfully redeemed</div>
        </div>
        <div className="txn-stat-card">
          <div className="stat-title">Pending Transactions</div>
          <div className="stat-value" style={{ color: '#eab308' }}>{pendingTxns.length}</div>
          <div className="dash-stat-sub">need approval</div>
        </div>
        <div className="txn-stat-card">
          <div className="stat-title">Active Campaigns</div>
          <div className="stat-value">{campaigns.length}</div>
          <div className="dash-stat-sub">with live vouchers</div>
        </div>
      </div>

      {/* ── Row 2: Pending Claims + Active Campaigns ── */}
      <div className="dash-grid-2">

        {/* Claims Requiring Attention */}
        <div className="dash-card">
          <h2 className="dash-card-title">
            <i className="fa-solid fa-clock" style={{ marginRight: '0.4rem', color: '#eab308' }}></i>
            Pending Claims
          </h2>
          <div className="dash-list">
            {pendingClaims.length === 0 ? (
              <p className="dash-empty">No pending claims — all clear!</p>
            ) : (
              pendingClaims.slice(0, 6).map((c) => (
                <div key={c.id} className="dash-list-row">
                  <div className="dash-claim-info">
                    <span className="dash-list-label">{c.user_name || 'Anonymous'}</span>
                    <span className="dash-list-sub">
                      {c.voucher_name || '—'}{c.amount ? ` • ₱${Number(c.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
                    </span>
                  </div>
                  <span className="txn-status-badge pending">Pending</span>
                </div>
              ))
            )}
            {pendingClaims.length > 6 && (
              <p className="dash-empty-sub" style={{ marginTop: '0.5rem' }}>
                +{pendingClaims.length - 6} more pending claim{pendingClaims.length - 6 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="dash-card">
          <h2 className="dash-card-title">
            <i className="fa-solid fa-bullhorn" style={{ marginRight: '0.4rem', color: '#c50000' }}></i>
            Active Campaigns
          </h2>
          <div className="dash-list">
            {campaigns.length === 0 ? (
              <p className="dash-empty">No active campaigns at the moment.</p>
            ) : (
              campaigns.slice(0, 6).map((c) => (
                <div key={c.id} className="dash-list-row">
                  <div className="dash-claim-info">
                    <span className="dash-list-label">{c.name}</span>
                    <span className="dash-list-sub">
                      {c.voucher_count || 0} voucher{c.voucher_count !== 1 ? 's' : ''} • Ends {c.end_date}
                    </span>
                  </div>
                  <span className="txn-status-badge active-badge">Active</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="dash-card" style={{ marginTop: '1.25rem' }}>
        <h2 className="dash-card-title">
          <i className="fa-solid fa-bolt" style={{ marginRight: '0.4rem', color: '#c50000' }}></i>
          Recent Claim Activity
        </h2>
        <div className="dash-activity-list">
          {recentClaims.length === 0 ? (
            <p className="dash-empty">No recent claim activity.</p>
          ) : (
            recentClaims.map((c) => (
              <div key={c.id} className="dash-activity-row">
                <span
                  className="dash-activity-dot"
                  style={{ backgroundColor: statusDot(c.status) }}
                />
                <div className="dash-activity-info">
                  <span className="dash-activity-desc">
                    {c.user_name || 'Anonymous'} — {c.voucher_name || 'voucher'}{' '}
                    <strong style={{ color: statusDot(c.status) }}>{c.status.toLowerCase()}</strong>
                  </span>
                  <span className="dash-activity-time">{fmtTimePH(c.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <ErrorModal 
        {...errorConfig}
        onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default StaffDashboard;
