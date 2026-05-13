import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import '../../css/CustomerVouchers.css';

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const PAGE_SIZE = 6;

/* ── helpers ──────────────────────────────────────────────── */
const fmt = (n) =>
  Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateStr = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/**
 * CustomerVouchers
 *
 * Shows every ACTIVE campaign the system has.
 * For each campaign it fetches the customer's total APPROVED transaction
 * amount tied to that campaign's vouchers, then displays a spending-progress
 * bar against the campaign budget (the spending threshold set by admin/manager).
 *
 * When the customer's spend ≥ budget they may claim the voucher directly
 * from this page. Already-claimed vouchers are shown with their status.
 */
const CustomerVouchers = ({ user }) => {
  const navigate = useNavigate();

  /* page state */
  const [tab, setTab]           = useState('available'); // 'available' | 'mine'
  const [campaigns, setCampaigns] = useState([]);
  const [mySpend, setMySpend]   = useState({});          // { campaignId: totalApprovedAmount }
  const [myClaims, setMyClaims] = useState([]);          // flat list of this user's claims
  const [loading, setLoading]   = useState(true);
  const [claiming, setClaiming] = useState(null);        // campaignId being claimed
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');
  const [page, setPage]         = useState(1);

  /* fetch everything */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsRes, transactionsRes, claimsRes] = await Promise.all([
        axios.get(`${BASE}/api/campaigns/`),
        axios.get(`${BASE}/api/transactions/`),
        axios.get(`${BASE}/api/claims/`),
      ]);

      /* only Active campaigns */
      const active = campaignsRes.data.filter(c => c.status === 'Active');
      setCampaigns(active);

      /* build a map of voucher_code → campaign_id for quick lookup */
      const codeToCampaign = {};
      active.forEach(camp => {
        (camp.vouchers || []).forEach(v => {
          codeToCampaign[v.code] = camp.id;
        });
      });

      /* sum Approved transaction amounts per campaign for this user */
      const spendMap = {};
      transactionsRes.data
        .filter(t => t.status === 'Approved')
        .forEach(t => {
          const campId = codeToCampaign[t.voucher_code];
          if (campId) {
            spendMap[campId] = (spendMap[campId] || 0) + parseFloat(t.amount || 0);
          }
        });
      setMySpend(spendMap);

      setMyClaims(claimsRes.data);
    } catch (err) {
      console.error('CustomerVouchers load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);                   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  /* ── claim a voucher for a campaign ─────────────────────── */
  const handleClaim = async (campaign) => {
    setClaimError('');
    setClaimSuccess('');

    /* pick the first active voucher from this campaign */
    const voucher = (campaign.vouchers || []).find(v => v.is_active);
    if (!voucher) {
      setClaimError('No active voucher available for this campaign.');
      return;
    }

    /* check if already claimed (any status) */
    const alreadyClaimed = myClaims.some(c => c.voucher === voucher.id || c.voucher_name === voucher.name);
    if (alreadyClaimed) {
      setClaimError('You have already submitted a claim for this voucher.');
      return;
    }

    setClaiming(campaign.id);
    try {
      await axios.post(`${BASE}/api/claims/`, {
        voucher:    voucher.id,
        store:      voucher.store_id || null,
        amount:     mySpend[campaign.id] || 0,
        status:     'Pending',
      });
      setClaimSuccess(`Claim for "${voucher.name}" submitted! Pending admin approval.`);
      await load(); // refresh
    } catch (err) {
      const detail = err.response?.data?.detail
        || Object.values(err.response?.data || {}).flat().join(' ')
        || 'Failed to submit claim.';
      setClaimError(detail);
    } finally {
      setClaiming(null);
    }
  };

  /* ── helpers for per-campaign state ─────────────────────── */
  const getSpend = (camp) => mySpend[camp.id] || 0;
  const getThreshold = (camp) => parseFloat(camp.budget || 0);
  const getPct = (camp) => {
    const t = getThreshold(camp);
    if (!t) return 100;
    return Math.min(100, (getSpend(camp) / t) * 100);
  };
  const isUnlocked = (camp) => getSpend(camp) >= getThreshold(camp);

  const getClaimForCampaign = (camp) => {
    const voucherIds  = (camp.vouchers || []).map(v => v.id);
    const voucherNames = (camp.vouchers || []).map(v => v.name);
    return myClaims.find(c => voucherIds.includes(c.voucher) || voucherNames.includes(c.voucher_name));
  };

  /* ── tabs ────────────────────────────────────────────────── */
  const myClaimedCards = myClaims.filter(c => {
    /* only show claims that belong to an active campaign */
    return campaigns.some(camp =>
      (camp.vouchers || []).some(v => v.id === c.voucher || v.name === c.voucher_name)
    );
  });

  const pagedCampaigns = campaigns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pagedMine      = myClaimedCards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── render ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="cv-loading">
      <i className="fa-solid fa-spinner fa-spin"></i>
      <span>Loading vouchers…</span>
    </div>
  );

  return (
    <div className="cv-page">
      {/* ── header ── */}
      <div className="cv-header">
        <div>
          <h1>My Vouchers</h1>
          <p>Spend at participating stores and unlock exclusive rewards.</p>
        </div>
        <button className="cv-txn-btn" onClick={() => navigate('/customer/transactions')}>
          <i className="fa-solid fa-receipt"></i> My Transactions
        </button>
      </div>

      {/* ── global feedback ── */}
      {claimSuccess && (
        <div className="cv-alert cv-alert-success">
          <i className="fa-solid fa-circle-check"></i> {claimSuccess}
          <button onClick={() => setClaimSuccess('')}><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}
      {claimError && (
        <div className="cv-alert cv-alert-error">
          <i className="fa-solid fa-triangle-exclamation"></i> {claimError}
          <button onClick={() => setClaimError('')}><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* ── info banner ── */}
      <div className="cv-info-banner">
        <i className="fa-solid fa-circle-info"></i>
        <span>
          Reach the <strong>spending target</strong> for any active campaign through your
          approved transactions to unlock and claim its voucher.
        </span>
      </div>

      {/* ── tabs ── */}
      <div className="cv-tabs">
        <button
          className={`cv-tab ${tab === 'available' ? 'active' : ''}`}
          onClick={() => { setTab('available'); setPage(1); }}
        >
          <i className="fa-solid fa-tag"></i> Available Campaigns
          <span className="cv-tab-badge">{campaigns.length}</span>
        </button>
        <button
          className={`cv-tab ${tab === 'mine' ? 'active' : ''}`}
          onClick={() => { setTab('mine'); setPage(1); }}
        >
          <i className="fa-solid fa-ticket-simple"></i> My Claims
          <span className="cv-tab-badge">{myClaimedCards.length}</span>
        </button>
      </div>

      {/* ── AVAILABLE CAMPAIGNS TAB ── */}
      {tab === 'available' && (
        <>
          {campaigns.length === 0 ? (
            <div className="cv-empty">
              <i className="fa-solid fa-tag"></i>
              <h3>No active campaigns right now.</h3>
              <p>Check back soon for new spending rewards!</p>
            </div>
          ) : (
            <>
              <div className="cv-grid">
                {pagedCampaigns.map(camp => {
                  const spend     = getSpend(camp);
                  const threshold = getThreshold(camp);
                  const pct       = getPct(camp);
                  const unlocked  = isUnlocked(camp);
                  const existingClaim = getClaimForCampaign(camp);
                  const firstVoucher  = (camp.vouchers || [])[0];
                  const isClaiming    = claiming === camp.id;

                  return (
                    <div key={camp.id} className={`cv-card ${unlocked ? 'cv-card-unlocked' : ''}`}>
                      {/* top accent */}
                      <div className="cv-card-accent"></div>

                      {/* header row */}
                      <div className="cv-card-top">
                        <div className="cv-campaign-info">
                          <span className="cv-campaign-name">{camp.name}</span>
                          <span className="cv-campaign-dates">
                            <i className="fa-regular fa-calendar"></i>
                            {dateStr(camp.start_date)} – {dateStr(camp.end_date)}
                          </span>
                        </div>
                        <div className={`cv-lock-badge ${unlocked ? 'unlocked' : 'locked'}`}>
                          <i className={`fa-solid ${unlocked ? 'fa-lock-open' : 'fa-lock'}`}></i>
                          <span>{unlocked ? 'Unlocked' : 'Locked'}</span>
                        </div>
                      </div>

                      {/* voucher preview */}
                      {firstVoucher && (
                        <div className="cv-voucher-preview">
                          <span className="cv-voucher-tag">{firstVoucher.voucher_type}</span>
                          <span className="cv-voucher-name">{firstVoucher.name}</span>
                          <span className="cv-voucher-discount">
                            {firstVoucher.discount_percentage}% OFF
                          </span>
                        </div>
                      )}

                      {/* spending progress */}
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

                      {/* claim section */}
                      <div className="cv-card-footer">
                        {existingClaim ? (
                          <div className={`cv-claimed-badge cv-status-${existingClaim.status.toLowerCase()}`}>
                            <i className={`fa-solid ${
                              existingClaim.status === 'Approved'  ? 'fa-circle-check' :
                              existingClaim.status === 'Rejected'  ? 'fa-circle-xmark' :
                              'fa-clock'
                            }`}></i>
                            Claim {existingClaim.status}
                          </div>
                        ) : unlocked ? (
                          <button
                            className="cv-claim-btn"
                            onClick={() => handleClaim(camp)}
                            disabled={isClaiming}
                          >
                            {isClaiming
                              ? <><i className="fa-solid fa-spinner fa-spin"></i> Claiming…</>
                              : <><i className="fa-solid fa-gift"></i> Claim Voucher</>
                            }
                          </button>
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
                totalPages={Math.ceil(campaigns.length / PAGE_SIZE)}
                onPageChange={setPage}
                totalItems={campaigns.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </>
      )}

      {/* ── MY CLAIMS TAB ── */}
      {tab === 'mine' && (
        <>
          {myClaimedCards.length === 0 ? (
            <div className="cv-empty">
              <i className="fa-solid fa-ticket-simple"></i>
              <h3>No claims yet.</h3>
              <p>Reach a campaign's spending target to claim your first voucher!</p>
              <button className="cv-switch-tab-btn" onClick={() => setTab('available')}>
                Browse Campaigns
              </button>
            </div>
          ) : (
            <>
              <div className="cv-grid">
                {pagedMine.map(claim => (
                  <div key={claim.id} className="cv-ticket-card">
                    <div className="cv-ticket-left"></div>
                    <div className="cv-ticket-body">
                      <div className="cv-ticket-top">
                        <span className="cv-ticket-label">Exclusive Reward</span>
                        <div className={`cv-status-pill cv-status-${(claim.status || '').toLowerCase()}`}>
                          {claim.status}
                        </div>
                      </div>

                      <h3 className="cv-ticket-name">{claim.voucher_name}</h3>
                      <p className="cv-ticket-store">
                        <i className="fa-solid fa-location-dot"></i> {claim.store_name || 'All Stores'}
                      </p>

                      <div className="cv-ticket-divider">
                        <div className="cv-cutout cv-cutout-left"></div>
                        <div className="cv-dashed-line"></div>
                        <div className="cv-cutout cv-cutout-right"></div>
                      </div>

                      <div className="cv-ticket-code-row">
                        <div>
                          <span className="cv-code-label">Voucher Code</span>
                          <span className="cv-code-text">{claim.voucher_code || '—'}</span>
                        </div>
                        {claim.status === 'Approved' && claim.voucher_code && (
                          <button
                            className="cv-qr-btn"
                            title="Show QR Code"
                            onClick={() => alert(`QR for ${claim.voucher_code}`)}
                          >
                            <i className="fa-solid fa-qrcode"></i>
                          </button>
                        )}
                      </div>

                      <div className="cv-ticket-footer">
                        <span className="cv-ticket-date">
                          Claimed {dateStr(claim.created_at)}
                        </span>
                        {claim.status === 'Approved' && (
                          <span className="cv-active-pill">ACTIVE</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={page}
                totalPages={Math.ceil(myClaimedCards.length / PAGE_SIZE)}
                onPageChange={setPage}
                totalItems={myClaimedCards.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerVouchers;
