import React from 'react';
import '../css/Modal.css';

// ── Shared display row (matches VoucherModal style) ────────
const DR = ({ label, value, wide, highlight, mono }) => (
  <div style={{
    gridColumn: wide ? 'span 2' : 'span 1',
    display: 'flex', flexDirection: 'column', gap: '4px',
  }}>
    <span style={{
      fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: '0.06em', color: '#9e9e9e',
    }}>{label}</span>
    <span style={{
      fontSize: '14.5px', fontWeight: highlight ? '700' : '500',
      color: highlight ? '#c40000' : '#1e293b',
      fontFamily: mono ? "'Courier New', monospace" : 'inherit',
      letterSpacing: mono ? '0.05em' : 'inherit',
      background: mono ? '#f8fafc' : 'transparent',
      padding: mono ? '4px 8px' : '0',
      borderRadius: mono ? '5px' : '0', display: 'inline-block',
    }}>{value || '—'}</span>
  </div>
);

const statusColors = {
  Active:    { bg: 'rgba(34,197,94,0.15)',  text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
  Completed: { bg: 'rgba(100,116,139,0.12)', text: '#475569', border: 'rgba(100,116,139,0.3)' },
  Scheduled: { bg: 'rgba(59,130,246,0.12)',  text: '#2563eb', border: 'rgba(59,130,246,0.3)' },
};

/**
 * CampaignDetailsModal — dual-mode:
 *   • `campaign` prop → admin/staff/manager management display (dark banner + data grid)
 *   • `offer` prop   → customer-facing view (existing premium layout)
 */
const CampaignDetailsModal = ({ show, onClose, campaign, offer, onClaim, claiming }) => {
  // Resolve which data object to use
  const data = campaign || offer;
  if (!show || !data) return null;

  // ── Admin / Staff / Manager view ──────────────────────────
  if (campaign) {
    const sc = statusColors[campaign.status] || { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
    const fmt = (d) => {
      if (!d) return '—';
      const date = new Date(d);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    const budget = campaign.budget != null
      ? `₱${Number(campaign.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—';
    const spendTarget = campaign.spending_target != null && campaign.spending_target > 0
      ? `₱${Number(campaign.spending_target).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—';

    return (
      <div className="modal-overlay">
        <div className="modal-content">

          {/* Dark banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.08)', borderRadius: '8px',
              padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaign</span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff', letterSpacing: '-0.01em' }}>
                {campaign.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
              }}>{campaign.status}</span>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)',
                width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          </div>

          {/* Detail grid */}
          <div style={{ padding: '22px 22px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <DR label="Start Date"       value={fmt(campaign.start_date)} />
            <DR label="End Date"         value={fmt(campaign.end_date)} />
            <DR label="Budget"           value={budget} />
            <DR label="Spending Target"  value={spendTarget} highlight />
            <DR label="Vouchers"         value={String(campaign.voucher_count ?? campaign.vouchers?.length ?? 0)} />
            <DR label="Total Reach"      value={Number(campaign.reach || 0).toLocaleString()} />
            <DR label="Conversions"      value={Number(campaign.conversions || 0).toLocaleString()} />
            {campaign.description && (
              <DR label="Description" value={campaign.description} wide />
            )}
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', padding: '8px 22px 18px' }}>
            <button className="cancel-inner-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Customer-facing view (offer prop) ─────────────────────
  return (
    <div className="modal-overlay modal-blur" onClick={onClose}>
      <div className="modal-content campaign-details-modal premium-details-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header-premium">
          <div className="header-badge-row">
            <span className="voucher-type-pill">{offer.voucher_type}</span>
          </div>
          <div className="header-main-row">
            <h2>{offer.name}</h2>
            <button className="close-btn-round" onClick={onClose}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="modal-body-premium">
          <div className="details-grid-refined">
            <div className="details-main-content">
              <section className="info-section">
                <h4 className="section-label"><i className="fa-solid fa-store"></i> Participating Store</h4>
                <div className="store-identity">
                  <div className="store-avatar"><i className="fa-solid fa-shop"></i></div>
                  <div className="store-text">
                    <p className="store-name-bold">{offer.store_name}</p>
                    <span className="store-location"><i className="fa-solid fa-location-dot"></i> Ground Floor, Robinsons Mall</span>
                  </div>
                </div>
              </section>

              <section className="info-section">
                <h4 className="section-label"><i className="fa-solid fa-circle-info"></i> About this Offer</h4>
                <div className="offer-desc-box">
                  <p>
                    Enjoy an exclusive <strong>{offer.discount_percentage}% discount</strong> on your next purchase at <strong>{offer.store_name}</strong>.
                    This reward is part of our <strong>{offer.campaign_name}</strong> promotion, curated just for you.
                  </p>
                </div>
              </section>

              <section className="info-section">
                <h4 className="section-label"><i className="fa-solid fa-list-check"></i> Redemption Guide</h4>
                <div className="stepper-guide">
                  {[
                    `Visit ${offer.store_name} at their mall location.`,
                    'Make a purchase and keep your official receipt.',
                    'Submit your receipt through the Transactions page.',
                    'Once verified, your discount will be applied automatically!',
                  ].map((step, i) => (
                    <div className="step-item-refined" key={i}>
                      <div className="step-marker">
                        <div className="step-number">{i + 1}</div>
                        {i < 3 && <div className="step-line"></div>}
                      </div>
                      <div className="step-content"><p>{step}</p></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="info-section">
                <h4 className="section-label"><i className="fa-solid fa-scale-balanced"></i> Terms &amp; Conditions</h4>
                <ul className="terms-checklist">
                  <li><i className="fa-solid fa-check-double"></i> Valid for one-time use per customer.</li>
                  <li><i className="fa-solid fa-check-double"></i> Cannot be combined with other store promos.</li>
                  <li><i className="fa-solid fa-check-double"></i> Receipt must be clear and fully legible.</li>
                </ul>
              </section>
            </div>

            <div className="details-sidebar-refined">
              <div className="sticky-sidebar-content">
                <div className="reward-highlight-card">
                  <span className="reward-label">REWARD VALUE</span>
                  <div className="reward-value-display">
                    <span className="r-val">{offer.discount_percentage}%</span>
                    <span className="r-off">OFF</span>
                  </div>
                  <div className="reward-glow"></div>
                </div>
                <div className="status-info-card">
                  <div className="status-row">
                    <span className="s-label">Spending Target</span>
                    <span className="s-val" style={{ fontWeight: 700, color: '#c40000' }}>
                      {(offer.campaign_spending_target || offer.campaign_budget)
                        ? `₱${Number(offer.campaign_spending_target || offer.campaign_budget).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                  </div>
                  <div className="status-row">
                    <span className="s-label">Expires On</span>
                    <span className="s-val">{new Date(offer.campaign_end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="status-row">
                    <span className="s-label">Availability</span>
                    <span className="s-val active-status"><i className="fa-solid fa-circle"></i> Active Now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer-premium">
          <button className="back-btn-minimal" onClick={onClose}>Back to Browse</button>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailsModal;
