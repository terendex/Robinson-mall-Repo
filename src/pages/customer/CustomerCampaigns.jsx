import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Pagination from '../../components/Pagination';
import '../../css/Customer.css';
import '../../css/CustomerVouchers.css';

const PAGE_SIZE = 6;
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const fmt = (n) =>
  Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/**
 * CustomerCampaigns — Active Campaigns browser.
 *
 * Shows each Active campaign as a card with:
 *   - Campaign name & dates
 *   - Spending progress bar (spend vs spending_target / budget)
 *   - ₱X spent  /  Target: ₱Y
 *
 * No voucher info, no lock/unlock badge, no claiming.
 * Voucher claiming is handled in the My Claims page.
 */
const CustomerCampaigns = ({ user }) => {
  const [campaigns,   setCampaigns]   = useState([]);
  const [mySpend,     setMySpend]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page,        setPage]        = useState(1);

  /* ── Fetch active campaigns + customer transactions ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, txnRes] = await Promise.all([
        axios.get(`${BASE}/api/campaigns/`),
        axios.get(`${BASE}/api/transactions/`),
      ]);

      const active = campRes.data.filter(c => c.status === 'Active');
      setCampaigns(active);

      /* Sum ALL approved transactions — no voucher mapping needed.
         Every approved transaction contributes toward the spending target
         of all currently active campaigns. */
      const totalSpend = txnRes.data
        .filter(t => t.status === 'Approved')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      /* Apply the same total to every active campaign */
      const spendMap = {};
      active.forEach(c => { spendMap[c.id] = totalSpend; });
      setMySpend(spendMap);
    } catch (err) {
      console.error('CustomerCampaigns load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Derived helpers ── */
  const getSpend     = (c) => mySpend[c.id] || 0;
  const getThreshold = (c) => parseFloat(c.spending_target > 0 ? c.spending_target : c.budget || 0);
  const getPct       = (c) => {
    const t = getThreshold(c);
    return t ? Math.min(100, (getSpend(c) / t) * 100) : 0;
  };
  const isUnlocked   = (c) => getThreshold(c) > 0 && getSpend(c) >= getThreshold(c);

  /* ── Filter ── */
  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paged       = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return (
    <div className="loading">
      <i className="fa-solid fa-spinner fa-spin"></i> Loading campaigns…
    </div>
  );

  return (
    <div className="customer-campaigns">

      {/* ── Page header ── */}
      <div className="customer-dashboard-header campaigns-header-premium">
        <div className="header-text-content">
          <h1>Active Campaigns</h1>
          <p>Spend at participating stores to reach the target and unlock your voucher in My Claims.</p>
        </div>
        <div className="header-search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search campaigns…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="cv-info-banner">
        <i className="fa-solid fa-circle-info"></i>
        <span>
          Reach a campaign's <strong>spending target</strong> through approved transactions.
          Once unlocked, go to <strong>My Claims</strong> to claim your voucher.
        </span>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="cv-empty">
          <i className="fa-solid fa-tag"></i>
          <h3>{searchQuery ? 'No campaigns match your search.' : 'No active campaigns right now.'}</h3>
          <p>Check back soon for new deals!</p>
        </div>
      ) : (
        <>
          <div className="cv-grid">
            {paged.map(camp => {
              const spend     = getSpend(camp);
              const threshold = getThreshold(camp);
              const pct       = getPct(camp);
              const unlocked  = isUnlocked(camp);

              return (
                <div
                  key={camp.id}
                  className={`cv-card ${unlocked ? 'cv-card-unlocked' : ''}`}
                >
                  <div className="cv-card-accent"></div>

                  <div style={{ padding: '1rem 1rem 0' }}>
                    {/* Campaign name + dates */}
                    <div className="cv-card-top">
                      <div className="cv-campaign-info">
                        <span className="cv-campaign-name">{camp.name}</span>
                        <span className="cv-campaign-dates">
                          <i className="fa-regular fa-calendar"></i>
                          {fmtDate(camp.start_date)} – {fmtDate(camp.end_date)}
                        </span>
                      </div>
                      {/* Voucher count badge */}
                      {(camp.vouchers?.length > 0) && (
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700,
                          padding: '3px 10px', borderRadius: '999px',
                          background: '#f1f5f9', color: '#475569',
                          flexShrink: 0,
                        }}>
                          <i className="fa-solid fa-ticket-simple" style={{ marginRight: '4px' }}></i>
                          {camp.vouchers.length} voucher{camp.vouchers.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Spending progress */}
                  <div className="cv-progress-section">
                    <div className="cv-progress-labels">
                      <span className="cv-progress-title">
                        <i className="fa-solid fa-coins"></i> Spending Progress
                      </span>
                      <span className="cv-progress-pct">{Math.round(pct)}%</span>
                    </div>
                    <div className="cv-progress-bar">
                      <div
                        className={`cv-progress-fill ${unlocked ? 'filled' : ''}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="cv-progress-amounts">
                      <span className="cv-spent">
                        ₱{fmt(spend)} <span className="cv-spent-label">spent</span>
                      </span>
                      <span className="cv-target">
                        Target: <strong>₱{fmt(threshold)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="cv-card-footer">
                    {unlocked ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        color: '#15803d', fontWeight: 700, fontSize: '0.85rem',
                      }}>
                        <i className="fa-solid fa-circle-check"></i>
                        Target reached! Claim your voucher in <strong>My Claims</strong>.
                      </div>
                    ) : (
                      <div className="cv-remaining-hint">
                        <i className="fa-solid fa-arrow-trend-up"></i>
                        ₱{fmt(Math.max(0, threshold - spend))} more to unlock
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </div>
  );
};

export default CustomerCampaigns;
