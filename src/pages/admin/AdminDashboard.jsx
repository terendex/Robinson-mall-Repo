import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../css/AdminDashboard.css';
import '../../css/Transactions.css';

/**
 * AdminDashboard Component
 * Renders the top-level analytical view for Admins.
 * Connected to /api/dashboard-stats/ and displays:
 *  - Stat cards (campaigns, reach, claims today, vouchers redeemed)
 *  - Active & Upcoming Campaigns list
 *  - Claims Requiring Attention (Pending / Rejected)
 *  - Top Campaigns by Reach (horizontal bars)
 *  - Recent Activity timeline
 */
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/dashboard-stats/');
        setStats(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard data.');
        setLoading(false);
      }
    };
    fetchStats();
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

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dash-error">{error}</div>
      </div>
    );
  }

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ', ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const getActivityDot = (type, statusVal) => {
    if (type === 'claim') {
      if (statusVal === 'Approved') return '#22c55e';
      if (statusVal === 'Pending')  return '#eab308';
      if (statusVal === 'Rejected') return '#ef4444';
    }
    return '#3b82f6';
  };

  const maxReach = Math.max(
    ...(stats.top_campaigns_by_reach || []).map((c) => c.reach),
    1
  );

  return (
    <div className="dashboard-container">
      {/* ── Header ── */}
      <header className="dashboard-header">
        <h1>Performance Dashboard</h1>
      </header>

      {/* ── Stat Cards ── */}
      <div className="txn-stats">
        <div className="txn-stat-card">
          <div className="stat-title">Active Campaigns</div>
          <div className="stat-value">{stats.active_campaigns}</div>
          <div className="dash-stat-sub">{stats.scheduled_campaigns} scheduled</div>
        </div>
        <div className="txn-stat-card">
          <div className="stat-title">Total Reach</div>
          <div className="stat-value">{Number(stats.total_reach).toLocaleString()}</div>
          <div className="dash-stat-sub">across all campaigns</div>
        </div>
        <div className="txn-stat-card">
          <div className="stat-title">Claims Today</div>
          <div className="stat-value">{stats.claims_today}</div>
          <div className="dash-stat-sub">{stats.claims_pending} pending review</div>
        </div>
        <div className="txn-stat-card">
          <div className="stat-title">Vouchers Redeemed</div>
          <div className="stat-value">{stats.vouchers_redeemed}</div>
          <div className="dash-stat-sub">of {stats.vouchers_generated} generated</div>
        </div>
      </div>

      {/* ── Row 2: Campaigns list + Claims attention ── */}
      <div className="dash-grid-2">

        {/* Active & Upcoming Campaigns */}
        <div className="dash-card">
          <h2 className="dash-card-title">Active &amp; Upcoming Campaigns</h2>
          <div className="dash-list">
            {stats.active_upcoming_campaigns.length === 0 ? (
              <p className="dash-empty">No active or upcoming campaigns</p>
            ) : (
              stats.active_upcoming_campaigns.map((c) => (
                <div key={c.id} className="dash-list-row">
                  <span className="dash-list-label">{c.name}</span>
                  <span
                    className={`txn-status-badge ${
                      c.status === 'Active' ? 'redeemed' : 'pending'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))
            )}
            {stats.active_upcoming_campaigns.length > 0 &&
              stats.active_upcoming_campaigns.filter(c => c.status === 'Scheduled').length === 0 && (
                <p className="dash-empty-sub">No other upcoming campaigns</p>
              )}
          </div>
        </div>

        {/* Claims Requiring Attention */}
        <div className="dash-card">
          <h2 className="dash-card-title">Claims Requiring Attention</h2>
          <div className="dash-list">
            {stats.claims_requiring_attention.length === 0 ? (
              <p className="dash-empty">No claims require attention</p>
            ) : (
              stats.claims_requiring_attention.map((c) => (
                <div key={c.id} className="dash-list-row">
                  <div className="dash-claim-info">
                    <span className="dash-list-label">{c.user_name}</span>
                    <span className="dash-list-sub">
                      {c.voucher_name} &bull; ₱{Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span
                    className={`txn-status-badge ${
                      c.status === 'Pending' ? 'pending' : 'expired'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Top Campaigns bar chart + Recent Activity ── */}
      <div className="dash-grid-2">

        {/* Top Campaigns by Reach */}
        <div className="dash-card">
          <h2 className="dash-card-title">Top Campaigns by Reach</h2>
          <div className="dash-bar-list">
            {stats.top_campaigns_by_reach.length === 0 ? (
              <p className="dash-empty">No campaign data available</p>
            ) : (
              stats.top_campaigns_by_reach.map((c, i) => (
                <div key={i} className="dash-bar-row">
                  <span className="dash-bar-label" title={c.name}>{c.name}</span>
                  <div className="dash-bar-track">
                    <div
                      className="dash-bar-fill"
                      style={{ width: `${Math.round((c.reach / maxReach) * 100)}%` }}
                    />
                  </div>
                  <span className="dash-bar-value">{Number(c.reach).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dash-card">
          <h2 className="dash-card-title">Recent Activity</h2>
          <div className="dash-activity-list">
            {stats.recent_activity.length === 0 ? (
              <p className="dash-empty">No recent activity</p>
            ) : (
              stats.recent_activity.map((a, i) => (
                <div key={i} className="dash-activity-row">
                  <span
                    className="dash-activity-dot"
                    style={{ backgroundColor: getActivityDot(a.type, a.status) }}
                  />
                  <div className="dash-activity-info">
                    <span className="dash-activity-desc">{a.description}</span>
                    <span className="dash-activity-time">{formatTime(a.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
