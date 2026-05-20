import React from 'react';
import '../css/Modal.css';

// ── Shared display row (matches VoucherModal style) ────────
const DR = ({ label, value, wide, highlight, mono, badge, badgeColor }) => (
  <div style={{
    gridColumn: wide ? 'span 2' : 'span 1',
    display: 'flex', flexDirection: 'column', gap: '4px',
  }}>
    <span style={{
      fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: '0.06em', color: '#9e9e9e',
    }}>{label}</span>
    {badge ? (
      <span style={{
        display: 'inline-block', padding: '4px 12px', borderRadius: '999px',
        fontSize: '11px', fontWeight: '700', background: badgeColor?.bg || '#f1f5f9',
        color: badgeColor?.text || '#1e293b', border: `1px solid ${badgeColor?.border || '#e2e8f0'}`,
        width: 'fit-content',
      }}>{value}</span>
    ) : (
      <span style={{
        fontSize: '14.5px', fontWeight: highlight ? '700' : '500',
        color: highlight ? '#c40000' : '#1e293b',
        fontFamily: mono ? "'Courier New', monospace" : 'inherit',
        letterSpacing: mono ? '0.05em' : 'inherit',
        background: mono ? '#f8fafc' : 'transparent',
        padding: mono ? '4px 8px' : '0',
        borderRadius: mono ? '5px' : '0', display: 'inline-block',
      }}>{value || '—'}</span>
    )}
  </div>
);

const statusColors = {
  Approved: { bg: 'rgba(34,197,94,0.15)', text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
  Pending:  { bg: 'rgba(234,88,12,0.12)',  text: '#ea580c', border: 'rgba(234,88,12,0.3)' },
  Rejected: { bg: 'rgba(185,28,28,0.12)',  text: '#b91c1c', border: 'rgba(185,28,28,0.3)' },
};

const STATUS_LABEL = {
  Pending:  'Not Claimed',
  Approved: 'Claimed',
  Rejected: 'Expired',
};

/**
 * ClaimDetailsModal — redesigned to match VoucherModal display style.
 */
const ClaimDetailsModal = ({ show, onClose, claim }) => {
  if (!show || !claim) return null;

  const claimNo = claim.receipt_no || `CLM-${String(claim.id).padStart(4, '0')}`;
  const sc = statusColors[claim.status] || { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };

  return (
    <div className="modal-overlay">
      <div className="modal-content">

        {/* ── Dark banner header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.08)', borderRadius: '8px',
              padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Claim No.</span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff', fontFamily: "'Courier New', monospace", letterSpacing: '0.08em' }}>
                {claimNo}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
              background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
            }}>{STATUS_LABEL[claim.status] || claim.status}</span>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)',
                width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>
        </div>

        {/* ── Detail grid ── */}
        <div style={{ padding: '22px 22px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <DR label="Customer"     value={claim.user_name || 'Anonymous'} />
          <DR label="Phone"        value={claim.user_phone || 'N/A'} />
          <DR label="Voucher"      value={claim.voucher_name} />
          <DR label="Voucher Code" value={claim.voucher_code} mono />
          <DR label="Store"        value={claim.store_name} />
          <DR label="Amount"       value={`₱${Number(claim.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} highlight />
          {claim.expiry_date && claim.status !== 'Approved' && (
            <DR label="Expires On" value={new Date(claim.expiry_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} />
          )}
          <DR label="Date Submitted" value={new Date(claim.created_at).toLocaleString()} wide />
          {claim.rejection_reason && (
            <DR label="Expiration / Rejection Reason" value={claim.rejection_reason} wide />
          )}
        </div>

        <div className="modal-actions" style={{ justifyContent: 'flex-end', padding: '8px 22px 18px' }}>
          <button className="cancel-inner-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetailsModal;
