import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { exportCSV, exportExcel, buildReportRows } from '../../utils/exportUtils';
import ErrorModal from '../../components/ErrorModal';
import '../../css/Reports.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Colour palette ─────────────────────────────────────────────────────────
const BRAND_RED   = '#c50000';
const CHART_BLUE  = '#3b82f6';
const CHART_GREEN = '#22c55e';
const CHART_AMBER = '#f59e0b';
const CHART_GRAY  = '#94a3b8';

const PIE_CLAIMS_COLORS  = [CHART_GREEN, BRAND_RED, CHART_AMBER];   // Approved, Rejected, Pending
const PIE_TXN_COLORS     = [CHART_GREEN, CHART_AMBER, BRAND_RED, CHART_GRAY]; // Redeemed, Pending, Expired, other

// ── Period helpers ──────────────────────────────────────────────────────────
const PERIODS = ['Today', 'This Week', 'This Month', 'All Time'];

function filterByPeriod(items, dateKey, period) {
  const now = new Date();
  return items.filter((item) => {
    const d = new Date(item[dateKey]);
    if (isNaN(d)) return false;
    const diffMs = now - d;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (period === 'Today')      return diffDays < 1;
    if (period === 'This Week')  return diffDays <= 7;
    if (period === 'This Month') return diffDays <= 30;
    return true; // All Time
  });
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rpt-tooltip">
      <p className="rpt-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="rpt-tooltip-item">
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Custom Donut label ──────────────────────────────────────────────────────
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
const Reports = () => {
  const [dashStats, setDashStats]   = useState(null);
  const [claims, setClaims]         = useState([]);
  const [campaigns, setCampaigns]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [errorConfig, setErrorConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  // Period filter
  const [period, setPeriod]                   = useState('This Month');
  const [isPeriodOpen, setIsPeriodOpen]       = useState(false);
  const periodRef                             = useRef(null);

  // Export dropdown
  const [isExportOpen, setIsExportOpen]       = useState(false);
  const exportRef                             = useRef(null);

  // ── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [statsRes, claimsRes, campaignsRes] = await Promise.all([
          axios.get(`${BASE}/api/dashboard-stats/`),
          axios.get(`${BASE}/api/claims/`),
          axios.get(`${BASE}/api/campaigns/`),
        ]);
        setDashStats(statsRes.data);
        setClaims(claimsRes.data);
        setCampaigns(campaignsRes.data);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setErrorConfig({
          show: true,
          title: 'Analytics Sync Failed',
          message: 'Failed to load report data. Please ensure the Robinson Mall backend is reachable.'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (periodRef.current && !periodRef.current.contains(e.target)) setIsPeriodOpen(false);
      if (exportRef.current  && !exportRef.current.contains(e.target))  setIsExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived: filtered claims ───────────────────────────────────────────────
  const filteredClaims = useMemo(
    () => filterByPeriod(claims, 'created_at', period),
    [claims, period]
  );

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const statCards = useMemo(() => {
    if (!dashStats) return [];
    const total    = filteredClaims.length;
    const approved = filteredClaims.filter(c => c.status === 'Approved').length;
    const pending  = filteredClaims.filter(c => c.status === 'Pending').length;

    const filteredCampaigns = filterByPeriod(campaigns, 'created_at', period);
    const totalReach = filteredCampaigns.reduce((s, c) => s + (c.reach || 0), 0);

    const convRate   = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
    const pendingPct = total > 0 ? ((pending / total) * 100).toFixed(1) : '0.0';

    return [
      {
        id: 'reach',
        label: 'TOTAL REACH',
        value: Number(totalReach).toLocaleString(),
        sub: `${filteredCampaigns.length} campaign(s)`,
        icon: 'fa-solid fa-bullhorn',
        accent: '#3b82f6',
      },
      {
        id: 'conv',
        label: 'CONVERSION RATE',
        value: `${convRate}%`,
        sub: `${approved} of ${total} claims`,
        icon: 'fa-solid fa-arrow-trend-up',
        accent: '#22c55e',
      },
      {
        id: 'approval',
        label: 'CLAIMS APPROVAL',
        value: `${approvalRate}%`,
        sub: `${approved} approved`,
        icon: 'fa-solid fa-circle-check',
        accent: '#c50000',
      },
      {
        id: 'pending',
        label: 'PENDING CLAIMS',
        value: `${pendingPct}%`,
        sub: `${pending} awaiting review`,
        icon: 'fa-solid fa-clock',
        accent: '#f59e0b',
      },
    ];
  }, [dashStats, filteredClaims, campaigns, period]);

  // ── Chart 1: Daily Reach & Conversions (line, uses monthly_stats) ──────────
  const lineData = useMemo(() => {
    if (!dashStats?.monthly_stats) return [];
    return dashStats.monthly_stats.map(m => ({
      name: m.month,
      Reach: m.claims,          // claims as proxy for reach activity
      Conversions: m.redemptions,
    }));
  }, [dashStats]);

  // ── Chart 2: Reach vs Budget (bar, per campaign) ───────────────────────────
  const barData = useMemo(() => {
    const relevant = filterByPeriod(campaigns, 'created_at', period);
    return relevant
      .filter(c => c.reach > 0 || c.budget > 0)
      .slice(0, 8)
      .map(c => ({
        name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
        Reach: c.reach || 0,
        Budget: Number(c.budget || 0),
      }));
  }, [campaigns, period]);

  // ── Chart 3: Claims Activity (donut) ──────────────────────────────────────
  const claimsPieData = useMemo(() => {
    const approved = filteredClaims.filter(c => c.status === 'Approved').length;
    const rejected = filteredClaims.filter(c => c.status === 'Rejected').length;
    const pending  = filteredClaims.filter(c => c.status === 'Pending').length;
    return [
      { name: 'Approved', value: approved },
      { name: 'Rejected', value: rejected },
      { name: 'Pending',  value: pending  },
    ].filter(d => d.value > 0);
  }, [filteredClaims]);

  // ── Chart 4: Transaction Status (donut) ────────────────────────────────────
  const txnPieData = useMemo(() => {
    // We derive from claims as a proxy for voucher redemption lifecycle
    const approved = filteredClaims.filter(c => c.status === 'Approved').length;
    const pending  = filteredClaims.filter(c => c.status === 'Pending').length;
    const rejected = filteredClaims.filter(c => c.status === 'Rejected').length;
    return [
      { name: 'Approved', value: approved },
      { name: 'Pending',  value: pending  },
      { name: 'Expired',  value: rejected },
    ].filter(d => d.value > 0);
  }, [filteredClaims]);

  // ── Export helpers ─────────────────────────────────────────────────────────
  const slug = `report-${period.replace(/\s/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;

  const handleExportCSV = () => {
    exportCSV(buildReportRows(filteredClaims, period), `${slug}.csv`);
    setIsExportOpen(false);
  };

  const handleExportExcel = () => {
    exportExcel(buildReportRows(filteredClaims, period), 'Claims Report', `${slug}.xlsx`);
    setIsExportOpen(false);
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rpt-page">
        <div className="rpt-loading">
          <i className="fa-solid fa-spinner fa-spin fa-2xl" style={{ color: '#bdbdbd' }} />
        </div>
      </div>
    );
  }



  return (
    <div className="rpt-page">
      <div className="rpt-container">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="rpt-header">
          <div className="rpt-header-left">
            <h1>Reports &amp; Analytics</h1>
            <p className="rpt-header-sub">
              Insights for&nbsp;
              <span className="rpt-period-chip">{period}</span>
            </p>
          </div>

          <div className="rpt-header-actions">

            {/* Period dropdown */}
            <div className="rpt-dropdown-wrap" ref={periodRef}>
              <button
                id="rpt-period-btn"
                className={`rpt-filter-btn ${isPeriodOpen ? 'active' : ''}`}
                onClick={() => setIsPeriodOpen(o => !o)}
              >
                <i className="fa-regular fa-calendar" />
                Period: <strong>{period}</strong>
                <i className="fa-solid fa-chevron-down rpt-chevron" />
              </button>
              {isPeriodOpen && (
                <div className="rpt-dropdown-menu">
                  {PERIODS.map(p => (
                    <div
                      key={p}
                      className={`rpt-dropdown-item ${period === p ? 'selected' : ''}`}
                      onClick={() => { setPeriod(p); setIsPeriodOpen(false); }}
                    >
                      {period === p && <i className="fa-solid fa-check" />}
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export dropdown */}
            <div className="rpt-dropdown-wrap" ref={exportRef}>
              <button
                id="rpt-export-btn"
                className={`rpt-export-btn ${isExportOpen ? 'active' : ''}`}
                onClick={() => setIsExportOpen(o => !o)}
              >
                <i className="fa-solid fa-file-arrow-down" />
                Export Report
                <i className="fa-solid fa-chevron-down rpt-chevron" />
              </button>
              {isExportOpen && (
                <div className="rpt-dropdown-menu rpt-dropdown-right">
                  <div className="rpt-dropdown-item" onClick={handleExportCSV}>
                    <i className="fa-solid fa-file-csv" style={{ color: '#22c55e' }} />
                    <span>Download as CSV</span>
                  </div>
                  <div className="rpt-dropdown-item" onClick={handleExportExcel}>
                    <i className="fa-solid fa-file-excel" style={{ color: '#16a34a' }} />
                    <span>Download as Excel</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Stat Cards ───────────────────────────────────────────────── */}
        <div className="rpt-stats">
          {statCards.map(card => (
            <div key={card.id} className="rpt-stat-card">
              <div className="rpt-stat-icon-wrap" style={{ background: `${card.accent}18` }}>
                <i className={card.icon} style={{ color: card.accent }} />
              </div>
              <div className="rpt-stat-body">
                <div className="rpt-stat-label">{card.label}</div>
                <div className="rpt-stat-value">{card.value}</div>
                <div className="rpt-stat-sub">{card.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts Row 1 ─────────────────────────────────────────────── */}
        <div className="rpt-charts-row">

          {/* Line chart – Daily Reach & Conversions */}
          <div className="rpt-chart-card rpt-chart-wide">
            <div className="rpt-chart-header">
              <h2>Daily Reach &amp; Conversions</h2>
              <span className="rpt-chart-badge">6-Month Trend</span>
            </div>
            {lineData.length === 0 ? (
              <div className="rpt-chart-empty">No data available for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="Reach"       stroke={CHART_BLUE}  strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Conversions" stroke={BRAND_RED}   strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar chart – Reach and Budget Comparison */}
          <div className="rpt-chart-card rpt-chart-wide">
            <div className="rpt-chart-header">
              <h2>Reach &amp; Budget Comparison</h2>
              <span className="rpt-chart-badge">Per Campaign</span>
            </div>
            {barData.length === 0 ? (
              <div className="rpt-chart-empty">No campaign data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="Reach"  fill={CHART_BLUE}  radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Budget" fill={BRAND_RED}   radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

        {/* ── Charts Row 2 ─────────────────────────────────────────────── */}
        <div className="rpt-charts-row">

          {/* Donut – Claims Activity */}
          <div className="rpt-chart-card rpt-chart-half">
            <div className="rpt-chart-header">
              <h2>Daily Claims Activity</h2>
              <span className="rpt-chart-badge">{filteredClaims.length} total</span>
            </div>
            {claimsPieData.length === 0 ? (
              <div className="rpt-chart-empty">No claim data for this period</div>
            ) : (
              <div className="rpt-donut-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={claimsPieData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderDonutLabel}
                    >
                      {claimsPieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_CLAIMS_COLORS[idx % PIE_CLAIMS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} claims`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="rpt-donut-legend">
                  {claimsPieData.map((d, idx) => (
                    <div key={d.name} className="rpt-legend-item">
                      <span className="rpt-legend-dot" style={{ background: PIE_CLAIMS_COLORS[idx] }} />
                      <span className="rpt-legend-name">{d.name}</span>
                      <span className="rpt-legend-val">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Donut – Voucher Transaction Status */}
          <div className="rpt-chart-card rpt-chart-half">
            <div className="rpt-chart-header">
              <h2>Voucher Transaction Status</h2>
              <span className="rpt-chart-badge">Claim lifecycle</span>
            </div>
            {txnPieData.length === 0 ? (
              <div className="rpt-chart-empty">No transaction data for this period</div>
            ) : (
              <div className="rpt-donut-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={txnPieData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderDonutLabel}
                    >
                      {txnPieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_TXN_COLORS[idx % PIE_TXN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} items`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="rpt-donut-legend">
                  {txnPieData.map((d, idx) => (
                    <div key={d.name} className="rpt-legend-item">
                      <span className="rpt-legend-dot" style={{ background: PIE_TXN_COLORS[idx] }} />
                      <span className="rpt-legend-name">{d.name}</span>
                      <span className="rpt-legend-val">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Summary Table ────────────────────────────────────────────── */}
        <div className="rpt-chart-card rpt-summary-card">
          <div className="rpt-chart-header">
            <h2>Top Campaigns by Reach</h2>
            <span className="rpt-chart-badge">All time</span>
          </div>
          <div className="rpt-summary-table-wrap">
            <table className="rpt-summary-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Reach</th>
                  <th>Budget</th>
                  <th>Reach %</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan="6" className="rpt-table-empty">No campaigns found</td></tr>
                ) : (
                  [...campaigns]
                    .sort((a, b) => (b.reach || 0) - (a.reach || 0))
                    .slice(0, 8)
                    .map((c, i) => {
                      const maxReach = Math.max(...campaigns.map(x => x.reach || 0), 1);
                      const pct = Math.round(((c.reach || 0) / maxReach) * 100);
                      const statusClass =
                        c.status === 'Active'    ? 'active-badge'    :
                        c.status === 'Scheduled' ? 'scheduled-badge' :
                        c.status === 'Completed' ? 'completed-badge' : '';
                      return (
                        <tr key={c.id}>
                          <td className="rpt-rank">{i + 1}</td>
                          <td className="rpt-campaign-name">{c.name}</td>
                          <td>
                            <span className={`txn-status-badge ${statusClass}`}>{c.status}</span>
                          </td>
                          <td className="rpt-num">{Number(c.reach || 0).toLocaleString()}</td>
                          <td className="rpt-num">₱{Number(c.budget || 0).toLocaleString()}</td>
                          <td>
                            <div className="rpt-bar-cell">
                              <div className="rpt-bar-track">
                                <div className="rpt-bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="rpt-bar-pct">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      <ErrorModal 
        {...errorConfig}
        onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default Reports;
