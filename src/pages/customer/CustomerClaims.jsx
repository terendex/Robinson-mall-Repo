import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Pagination from '../../components/Pagination';
import '../../css/Modal.css';
import '../../css/Customer.css';
import '../../css/CustomerVouchers.css';

const PAGE_SIZE = 6;
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const FILTER_OPTIONS = [
  { label: 'All', value: 'all', icon: 'fa-list' },
  { label: 'Locked', value: 'locked', icon: 'fa-lock' },
  { label: 'Not Claimed', value: 'not_claimed', icon: 'fa-clock' },
  { label: 'Claimed', value: 'claimed', icon: 'fa-circle-check' },
  { label: 'Expired', value: 'expired', icon: 'fa-circle-xmark' },
];

const STATUS_LABEL_MAP = {
  locked: 'Locked',
  not_claimed: 'Not Claimed',
  claimed: 'Claimed',
  expired: 'Expired',
};

const STATUS_ICON_MAP = {
  locked: 'fa-lock',
  not_claimed: 'fa-clock',
  claimed: 'fa-circle-check',
  expired: 'fa-circle-xmark',
};

const ACCENT_MAP = {
  locked: 'linear-gradient(to bottom, #94a3b8, #64748b)',
  not_claimed: 'linear-gradient(to bottom, #f97316, #c2410c)',
  claimed: 'linear-gradient(to bottom, #22c55e, #15803d)',
  expired: 'linear-gradient(to bottom, #ef4444, #b91c1c)',
};

const PILL_CLASS_MAP = {
  locked: 'claim-pill-locked',
  not_claimed: 'claim-pill-not_claimed',
  claimed: 'claim-pill-claimed',
  expired: 'claim-pill-expired',
};

const fmt = (n) =>
  Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── QR Modal — encodes CLAIM-{id} ── */
const QRModal = ({ claimRef, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div
      className="modal-content"
      style={{ maxWidth: 340, textAlign: 'center', padding: '2rem', borderRadius: 20, animation: 'fadeInUp 0.25s ease-out' }}
      onClick={e => e.stopPropagation()}
    >
      <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
        <i className="fa-solid fa-qrcode" style={{ marginRight: '0.5rem', color: '#cc2c2c' }}></i>
        Your Voucher QR
      </h3>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem', marginTop: 0 }}>
        Show this to the store staff to redeem your voucher.
      </p>

      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(claimRef)}&bgcolor=ffffff&color=0f172a&margin=10`}
        alt={`QR for ${claimRef}`}
        style={{ borderRadius: 12, border: '2px solid #e2e8f0', width: 240, height: 240 }}
      />

      <p style={{ marginTop: '1rem', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.12em', color: '#0f172a', fontSize: '1rem' }}>
        {claimRef}
      </p>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
        This code is unique to your account. Present it at the partner store.
      </p>
      <button className="save-btn" style={{ marginTop: '1.25rem', width: '100%' }} onClick={onClose}>
        Close
      </button>
    </div>
  </div>
);

/**
 * CustomerClaims — Voucher Hub
 *
 * Flow:
 *   1. Fetches active campaigns + customer transactions + existing claims.
 *   2. For each voucher in an active campaign:
 *        - LOCKED      → spending target not yet reached
 *        - NOT CLAIMED → target reached, auto-created claim pending store scan
 *        - CLAIMED     → store staff scanned QR and confirmed
 *        - EXPIRED     → claim rejected
 *   3. When unlocked, automatically POSTs a claim (if not already existing).
 *   4. Customer shows the QR code (CLAIM-{id}) at the store.
 *   5. Store staff scans QR on their portal → marks as Claimed.
 */
const CustomerClaims = ({ user }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [mySpend, setMySpend] = useState({});
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [qrRef, setQrRef] = useState(null);   // CLAIM-{id} string shown in QR modal
  const [claimMsg, setClaimMsg] = useState({ type: '', text: '' });
  const [claimingId, setClaimingId] = useState(null);   // voucherId currently being claimed
  const autoCreating = useRef(false);                      // guard against double-run

  /* ── Fetch all data ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, txnRes, claimRes] = await Promise.all([
        axios.get(`${BASE}/api/campaigns/`),
        axios.get(`${BASE}/api/transactions/`),
        axios.get(`${BASE}/api/claims/?user_id=${user.id}`),
      ]);

      const active = campRes.data.filter(c => c.status === 'Active');
      setCampaigns(active);

      /* Sum ALL approved transactions → applies to all active campaigns */
      const totalSpend = txnRes.data
        .filter(t => t.status === 'Approved')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const spendMap = {};
      active.forEach(c => { spendMap[c.id] = totalSpend; });
      setMySpend(spendMap);
      setMyClaims(claimRes.data);
      return { active, spendMap, claims: claimRes.data };
    } catch (err) {
      console.error('CustomerClaims load error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  /* ── Auto-create claim records for unlocked vouchers ── */
  const autoCreateClaims = useCallback(async (active, spendMap, existingClaims) => {
    if (autoCreating.current) return;
    autoCreating.current = true;
    const created = [];
    for (const camp of active) {
      const threshold = parseFloat(camp.spending_target > 0 ? camp.spending_target : camp.budget || 0);
      const spend = spendMap[camp.id] || 0;
      const unlocked = threshold > 0 && spend >= threshold;
      if (!unlocked) continue;

      for (const v of (camp.vouchers || [])) {
        const alreadyExists = existingClaims.find(
          cl => cl.voucher === v.id || cl.voucher_code === v.code
        );
        if (alreadyExists) continue;

        try {
          await axios.post(`${BASE}/api/claims/`, { voucher: v.id });
          created.push(v.name);
        } catch (err) {
          console.error('Auto-claim creation failed for voucher', v.id, err?.response?.data || err.message);
        }
      }
    }
    autoCreating.current = false;
    if (created.length > 0) {
      /* Reload to get fresh claim IDs */
      await load();
    }
  }, [user.id, load]);

  /* ── Manually generate a claim for an unlocked voucher ── */
  const handleGetQR = useCallback(async (voucherId) => {
    setClaimingId(voucherId);
    setClaimMsg({ type: '', text: '' });
    try {
      await axios.post(`${BASE}/api/claims/`, { voucher: voucherId });
      await load();
      setClaimMsg({ type: 'success', text: 'Your QR code is ready! Show it to store staff to redeem.' });
    } catch (err) {
      const msg = err?.response?.data?.detail
        || (typeof err?.response?.data === 'object' ? Object.values(err.response.data).flat().join(' ') : '')
        || 'Could not generate QR code. Please try again.';
      setClaimMsg({ type: 'error', text: msg });
    } finally {
      setClaimingId(null);
    }
  }, [load]);

  useEffect(() => {
    load().then(result => {
      if (result) autoCreateClaims(result.active, result.spendMap, result.claims);
    });
  }, [load, autoCreateClaims]);

  /* ── Helpers ── */
  const getSpend = (camp) => mySpend[camp.id] || 0;
  const getThreshold = (camp) => parseFloat(camp.spending_target > 0 ? camp.spending_target : camp.budget || 0);
  const isUnlocked = (camp) => getThreshold(camp) > 0 && getSpend(camp) >= getThreshold(camp);
  const getPct = (camp) => {
    const t = getThreshold(camp);
    return t ? Math.min(100, (getSpend(camp) / t) * 100) : 0;
  };

  /* ── Build flat voucher entries ── */
  const voucherEntries = campaigns.flatMap(camp => {
    const unlocked = isUnlocked(camp);
    const spend = getSpend(camp);
    const threshold = getThreshold(camp);
    const pct = getPct(camp);

    return (camp.vouchers || []).map(v => {
      const existClaim = myClaims.find(cl => cl.voucher === v.id || cl.voucher_code === v.code);
      return {
        key: `${camp.id}-${v.id}`,
        voucherId: v.id,
        voucherName: v.name,
        voucherCode: v.code,
        voucherType: v.voucher_type,
        discount: v.discount_percentage,
        campaignId: camp.id,
        campaignName: camp.name,
        campaignEndDate: camp.end_date,
        unlocked,
        claim: existClaim || null,
        spend,
        threshold,
        pct,
      };
    });
  });

  const getDisplayStatus = (entry) => {
    if (!entry.unlocked) return 'locked';
    if (!entry.claim || entry.claim.status === 'Pending') return 'not_claimed';
    if (entry.claim.status === 'Approved') return 'claimed';
    return 'expired';
  };

  const filtered = filter === 'all'
    ? voucherEntries
    : voucherEntries.filter(e => getDisplayStatus(e) === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) return (
    <div className="loading">
      <i className="fa-solid fa-spinner fa-spin"></i> Loading your vouchers…
    </div>
  );

  return (
    <div className="customer-claims">
      <div className="customer-dashboard-header">
        <h1>My Claims &amp; Vouchers</h1>
        <p>Reach the spending target to unlock your voucher, then show the QR code at the store.</p>
      </div>

      {/* Feedback */}
      {claimMsg.text && (
        <div className={`cv-alert ${claimMsg.type === 'success' ? 'cv-alert-success' : 'cv-alert-error'}`}
          style={{ marginBottom: '1rem' }}
        >
          <i className={`fa-solid ${claimMsg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
          {claimMsg.text}
          <button onClick={() => setClaimMsg({ type: '', text: '' })}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Info banner */}
      <div className="cv-info-banner">
        <i className="fa-solid fa-circle-info"></i>
        <span>
          Once your spending target is reached, a <strong>QR code</strong> is generated for each voucher.
          Visit the partner store and let the staff scan it to complete your claim.
        </span>
      </div>

      {/* Filter Pills */}
      <div className="claims-controls">
        <div className="claims-filter-bar">
          {FILTER_OPTIONS.map(({ label, value, icon }) => (
            <button
              key={value}
              className={[
                'filter-pill',
                `filter-pill-${value}`,
                filter === value ? `active active-${value}` : '',
              ].join(' ')}
              onClick={() => { setFilter(value); setCurrentPage(1); }}
            >
              <i className={`fa-solid ${icon}`}></i>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty states */}
      {voucherEntries.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-gift"></i>
          <h3>No active campaign vouchers.</h3>
          <p>Check the Campaigns page for active deals!</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-filter"></i>
          <h3>No vouchers match this filter.</h3>
          <p>Try selecting a different filter above.</p>
        </div>
      ) : (
        <div className="customer-cards-container">
          <div className="campaign-grid">
            {pagedItems.map((entry) => {
              const ds = getDisplayStatus(entry);
              const claimRef = entry.claim?.claim_ref || null;

              return (
                <div
                  key={entry.key}
                  className={`customer-campaign-card premium-voucher-card claim-card-${ds}`}
                >
                  <div className="voucher-left-accent" style={{ background: ACCENT_MAP[ds] }} />

                  <div className="campaign-card-content">

                    {/* Header */}
                    <div className="voucher-card-header">
                      <span className={`voucher-type-tag claim-tag-${ds}`}>
                        {STATUS_LABEL_MAP[ds]}
                      </span>
                      <div className={`voucher-status-icon claim-icon-${ds}`}>
                        <i className={`fa-solid ${STATUS_ICON_MAP[ds]}`}></i>
                      </div>
                    </div>

                    <h3>{entry.voucherName}</h3>
                    <p className="voucher-store-loc" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span><i className="fa-solid fa-tag"></i> {entry.campaignName}</span>
                      {entry.campaignEndDate && (
                        <span style={{ fontSize: '0.75rem', color: '#cc2c2c', fontWeight: 600 }}>
                          <i className="fa-solid fa-calendar-day" style={{ marginRight: '4px' }}></i>
                          Expires: {new Date(entry.campaignEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </p>

                    {/* Spending progress */}
                    <div style={{ margin: '0.5rem 0', padding: '0.5rem 0', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                        <span>
                          <i className="fa-solid fa-coins" style={{ color: '#c50000', marginRight: '4px' }}></i>
                          Spending Progress
                        </span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{Math.round(entry.pct)}%</span>
                      </div>
                      <div className="cv-progress-bar">
                        <div
                          className={`cv-progress-fill ${entry.unlocked ? 'filled' : ''}`}
                          style={{ width: `${entry.pct}%` }}
                        ></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>
                          ₱{fmt(entry.spend)} <span style={{ fontWeight: 400, color: '#94a3b8' }}>spent</span>
                        </span>
                        <span style={{ color: '#64748b' }}>
                          Target: <strong style={{ color: '#1e293b' }}>₱{fmt(entry.threshold)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Ticket divider */}
                    <div className="voucher-ticket-divider">
                      <div className="cutout cutout-left"></div>
                      <div className="divider-line"></div>
                      <div className="cutout cutout-right"></div>
                    </div>

                    {/* Claim reference / voucher code */}
                    <div className="voucher-code-display">
                      <div className="v-code-wrap">
                        <span className="v-code-label">
                          {entry.unlocked ? 'Claim Reference' : 'Voucher Code'}
                        </span>
                        <span
                          className="v-code-text"
                          style={!entry.unlocked ? { letterSpacing: '0.2em', color: '#94a3b8' } : {}}
                        >
                          {entry.unlocked
                            ? (claimRef || '—')
                            : '••••••••'}
                        </span>
                      </div>

                      {/* QR button — only for unlocked vouchers with a claim record */}
                      {entry.unlocked && claimRef && ds !== 'expired' && (
                        <button
                          className="voucher-use-btn"
                          title="Show QR Code"
                          onClick={() => setQrRef(claimRef)}
                        >
                          <i className="fa-solid fa-qrcode"></i>
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="voucher-footer">
                      {ds === 'locked' && (
                        <>
                          <span className="valid-until">
                            <i className="fa-solid fa-lock" style={{ marginRight: '4px', fontSize: '0.75rem' }}></i>
                            ₱{fmt(Math.max(0, entry.threshold - entry.spend))} more to unlock
                          </span>
                          <div className={`voucher-valid-pill ${PILL_CLASS_MAP[ds]}`}>Locked</div>
                        </>
                      )}

                      {ds === 'not_claimed' && (
                        <>
                          <span className="valid-until">
                            <i className="fa-solid fa-store" style={{ marginRight: '4px', color: '#f97316', fontSize: '0.75rem' }}></i>
                            Show QR at the store
                          </span>
                          {claimRef ? (
                            <button
                              className="cv-claim-btn"
                              style={{ width: 'auto', padding: '0.35rem 0.9rem', fontSize: '0.82rem', boxShadow: 'none', background: '#ea580c' }}
                              onClick={() => setQrRef(claimRef)}
                            >
                              <i className="fa-solid fa-qrcode"></i> Show QR
                            </button>
                          ) : (
                            <button
                              className="cv-claim-btn"
                              style={{ width: 'auto', padding: '0.35rem 0.9rem', fontSize: '0.82rem', boxShadow: 'none', background: '#c2410c' }}
                              disabled={claimingId === entry.voucherId}
                              onClick={() => handleGetQR(entry.voucherId)}
                            >
                              {claimingId === entry.voucherId
                                ? <><i className="fa-solid fa-spinner fa-spin"></i> Generating…</>
                                : <><i className="fa-solid fa-qrcode"></i> Get My QR</>}
                            </button>
                          )}
                        </>
                      )}

                      {ds === 'claimed' && (
                        <>
                          <span className="valid-until">CLAIMED ✓</span>
                          <div className={`voucher-valid-pill ${PILL_CLASS_MAP[ds]}`}>Claimed</div>
                        </>
                      )}

                      {ds === 'expired' && (
                        <>
                          <span className="valid-until">EXPIRED</span>
                          <div className={`voucher-valid-pill ${PILL_CLASS_MAP[ds]}`}>Expired</div>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      {qrRef && <QRModal claimRef={qrRef} onClose={() => setQrRef(null)} />}
    </div>
  );
};

export default CustomerClaims;
