import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../../components/Pagination';
import '../../css/Modal.css';
import '../../css/Customer.css';


const PAGE_SIZE = 6;

// ── Map backend status values → display labels ──────────────────
const STATUS_LABEL = {
  Pending:  'Not Claimed',
  Approved: 'Claimed',
  Rejected: 'Expired',
};

// ── Filter options (display label → backend value) ──────────────
const FILTER_OPTIONS = [
  { label: 'All',         value: 'All',      icon: 'fa-list' },
  { label: 'Not Claimed', value: 'Pending',  icon: 'fa-clock' },
  { label: 'Claimed',     value: 'Approved', icon: 'fa-circle-check' },
  { label: 'Expired',     value: 'Rejected', icon: 'fa-circle-xmark' },
];

// ── Coloured left accent per backend status ─────────────────────
const accentGradient = (status) => {
  if (status === 'Approved') return 'linear-gradient(to bottom, #22c55e, #15803d)';
  if (status === 'Rejected') return 'linear-gradient(to bottom, #ef4444, #b91c1c)';
  return 'linear-gradient(to bottom, #f97316, #c2410c)'; // Pending / Not Claimed
};

// ── QR Code Modal (uses free QR Server API, no extra packages) ──
const QRModal = ({ code, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div
      className="modal-content"
      style={{
        maxWidth: 320,
        textAlign: 'center',
        padding: '2rem',
        borderRadius: 20,
        animation: 'fadeInUp 0.25s ease-out',
      }}
      onClick={e => e.stopPropagation()}
    >
      <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
        <i className="fa-solid fa-qrcode" style={{ marginRight: '0.5rem', color: '#cc2c2c' }}></i>
        Voucher QR Code
      </h3>

      {/* QR image from free public API — no package needed */}
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=0f172a`}
        alt={`QR for ${code}`}
        style={{ borderRadius: 12, border: '2px solid #e2e8f0', width: 220, height: 220 }}
      />

      <p style={{
        marginTop: '1rem',
        fontFamily: 'monospace',
        fontWeight: 800,
        letterSpacing: '0.1em',
        color: '#0f172a',
        fontSize: '1.1rem',
      }}>
        {code}
      </p>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
        Present this code at the store to redeem your voucher.
      </p>
      <button
        className="save-btn"
        style={{ marginTop: '1.25rem', width: '100%' }}
        onClick={onClose}
      >
        Close
      </button>
    </div>
  </div>
);

/**
 * CustomerClaims Component
 *
 * Status display mapping:
 *   Pending  → "Not Claimed"
 *   Approved → "Claimed"
 *   Rejected → "Expired"
 *
 * Voucher Code + QR button are always shown (no Receipt Reference).
 */
const CustomerClaims = ({ user }) => {
  const [claims, setClaims]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('All');   // backend value or 'All'
  const [currentPage, setCurrentPage] = useState(1);
  const [qrCode, setQrCode]           = useState(null);   // code currently shown in modal

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/claims/?user_id=${user.id}`
        );
        setClaims(response.data);
      } catch (error) {
        console.error('Error fetching claims:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, [user.id]);

  if (loading) return (
    <div className="loading">
      <i className="fa-solid fa-spinner fa-spin"></i> Loading your claims...
    </div>
  );

  const filtered    = filter === 'All' ? claims : claims.filter(c => c.status === filter);
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedClaims = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /** Bottom-of-card footer text */
  const footerText = (status) => {
    if (status === 'Approved') return 'CLAIMED';
    if (status === 'Rejected') return 'EXPIRED';
    return 'AWAITING CLAIM';
  };

  /** CSS class for the status pill at the bottom of each card */
  const pillClass = (status) => {
    if (status === 'Approved') return 'claim-pill-claimed';
    if (status === 'Rejected') return 'claim-pill-expired';
    return 'claim-pill-notclaimed';
  };

  /** Icon per backend status */
  const statusIcon = (status) => {
    if (status === 'Approved') return 'fa-circle-check';
    if (status === 'Rejected') return 'fa-circle-xmark';
    return 'fa-clock';
  };

  const activeFilterLabel = FILTER_OPTIONS.find(o => o.value === filter)?.label || 'All';

  return (
    <div className="customer-claims">
      <div className="customer-dashboard-header">
        <h1>My Claims &amp; Vouchers</h1>
        <p>Monitor your voucher status and view active rewards.</p>
      </div>

      {/* ── Filter Pills ── */}
      <div className="claims-controls">
        <div className="claims-filter-bar">
          {FILTER_OPTIONS.map(({ label, value, icon }) => (
            <button
              key={value}
              className={[
                'filter-pill',
                `filter-pill-${value.toLowerCase()}`,
                filter === value ? `active active-${value.toLowerCase()}` : '',
              ].join(' ')}
              onClick={() => { setFilter(value); setCurrentPage(1); }}
            >
              <i className={`fa-solid ${icon}`}></i>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-gift"></i>
          <h3>
            {claims.length === 0
              ? 'No claims yet.'
              : `No "${activeFilterLabel}" claims.`}
          </h3>
          <p>
            {claims.length === 0
              ? 'Go to active campaigns to find deals!'
              : 'Try selecting a different filter above.'}
          </p>
        </div>
      ) : (
        <div className="customer-cards-container">
          <div className="campaign-grid">
            {pagedClaims.map((claim) => (
              <div
                key={claim.id}
                className={`customer-campaign-card premium-voucher-card claim-card-${claim.status.toLowerCase()}`}
              >
                {/* ── Coloured left accent bar ── */}
                <div
                  className="voucher-left-accent"
                  style={{ background: accentGradient(claim.status) }}
                />

                <div className="campaign-card-content">

                  {/* ── Header: status tag + status icon ── */}
                  <div className="voucher-card-header">
                    <span className={`voucher-type-tag claim-tag-${claim.status.toLowerCase()}`}>
                      {STATUS_LABEL[claim.status] || claim.status}
                    </span>
                    <div className={`voucher-status-icon claim-icon-${claim.status.toLowerCase()}`}>
                      <i className={`fa-solid ${statusIcon(claim.status)}`}></i>
                    </div>
                  </div>

                  <h3>{claim.voucher_name}</h3>
                  <p className="voucher-store-loc">
                    <i className="fa-solid fa-location-dot"></i> {claim.store_name}
                  </p>

                  {/* ── Ticket-perforation divider ── */}
                  <div className="voucher-ticket-divider">
                    <div className="cutout cutout-left"></div>
                    <div className="divider-line"></div>
                    <div className="cutout cutout-right"></div>
                  </div>

                  {/* ── Voucher Code — always visible ── */}
                  <div className="voucher-code-display">
                    <div className="v-code-wrap">
                      <span className="v-code-label">Voucher Code</span>
                      <span className="v-code-text">
                        {claim.voucher_code || '—'}
                      </span>
                    </div>
                    {/* QR button — shown whenever a code exists */}
                    {claim.voucher_code && (
                      <button
                        className="voucher-use-btn"
                        title="Show QR Code"
                        onClick={() => setQrCode(claim.voucher_code)}
                      >
                        <i className="fa-solid fa-qrcode"></i>
                      </button>
                    )}
                  </div>

                  {/* ── Footer ── */}
                  <div className="voucher-footer">
                    <span className="valid-until">{footerText(claim.status)}</span>
                    <div className={`voucher-valid-pill ${pillClass(claim.status)}`}>
                      {STATUS_LABEL[claim.status] || claim.status}
                    </div>
                  </div>

                </div>
              </div>
            ))}
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

      {/* ── QR Code Modal ── */}
      {qrCode && <QRModal code={qrCode} onClose={() => setQrCode(null)} />}
    </div>
  );
};

export default CustomerClaims;
