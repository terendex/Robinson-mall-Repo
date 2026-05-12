import React, { useState } from 'react';

const TransactionDetailsModal = ({ show, onClose, transaction }) => {
  const [receiptZoomed, setReceiptZoomed] = useState(false);

  if (!show || !transaction) return null;

  const qrValue = transaction.qr_code_id || transaction.transaction_id || `TXN-${transaction.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=c50000&bgcolor=ffffff&data=${encodeURIComponent(qrValue)}`;

  const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : 'N/A';
  const formatAmount = (a) => (a || a === 0) ? `₱${Number(a).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'N/A';
  const storeName = transaction.store_display_name || transaction.store_name || null;

  const statusColors = {
    Approved: { bg: 'rgba(34,197,94,0.15)',  text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
    Pending:  { bg: 'rgba(234,88,12,0.12)',  text: '#ea580c', border: 'rgba(234,88,12,0.3)' },
    Rejected: { bg: 'rgba(185,28,28,0.12)',  text: '#b91c1c', border: 'rgba(185,28,28,0.3)' },
    Expired:  { bg: 'rgba(100,116,139,0.12)', text: '#475569', border: 'rgba(100,116,139,0.3)' },
  };
  const sc = statusColors[transaction.status] || { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
  const txnShort = transaction.transaction_id_short || transaction.transaction_id || `TXN-${transaction.id}`;

  // Shared display row
  const DR = ({ label, value, mono, highlight }) => (
    <div className="txn-audit-row">
      <span className="txn-audit-key">{label}</span>
      <span className={`txn-audit-val${mono ? ' txn-audit-mono' : ''}${highlight ? ' txn-audit-amount' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content txn-audit-modal">

          {/* ── Dark banner header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: '8px',
                padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '2px',
              }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transaction ID</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff', fontFamily: "'Courier New', monospace", letterSpacing: '0.06em' }}>
                  {txnShort}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
              }}>{transaction.status}</span>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.7)',
                width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
                fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          </div>

          {/* ── QR Code ── */}
          <div className="txn-audit-qr-wrapper">
            <img src={qrImageUrl} alt="QR Code" className="txn-audit-qr-img" />
            <p className="txn-audit-qr-label">QR Code ID: <strong>{qrValue}</strong></p>
          </div>

          <div className="txn-audit-divider"></div>

          {/* ── Receipt Image ── */}
          {transaction.receipt_image && (
            <>
              <div className="txn-audit-receipt-section">
                <p className="txn-audit-receipt-heading">
                  <i className="fa-solid fa-receipt"></i> Receipt Image
                </p>
                <div
                  className="txn-audit-receipt-thumb-wrap"
                  onClick={() => setReceiptZoomed(true)}
                  title="Click to enlarge"
                >
                  <img src={transaction.receipt_image} alt="Receipt" className="txn-audit-receipt-thumb" />
                  <div className="txn-audit-receipt-zoom-hint">
                    <i className="fa-solid fa-magnifying-glass-plus"></i>
                  </div>
                </div>
              </div>
              <div className="txn-audit-divider"></div>
            </>
          )}

          {/* ── Detail rows ── */}
          <div className="txn-audit-details">
            <DR label="Customer"       value={transaction.user_name || 'Anonymous'} />
            {storeName && <DR label="Store / Branch" value={storeName} />}
            {(transaction.amount || transaction.amount === 0) && (
              <DR label="Receipt Total" value={formatAmount(transaction.amount)} highlight />
            )}
            {transaction.receipt_no && (
              <DR label="Receipt No." value={transaction.receipt_no} mono />
            )}
            <DR label="Voucher Availed" value={transaction.voucher_name || 'N/A'} />
            {transaction.voucher_code && (
              <DR label="Voucher Code" value={transaction.voucher_code} mono />
            )}

            {/* Rejection reason */}
            {transaction.status === 'Rejected' && transaction.rejection_reason && (
              <div className="txn-audit-row txn-audit-rejection-row">
                <span className="txn-audit-key">Rejection Reason</span>
                <span className="txn-audit-val txn-audit-rejection-reason">
                  <i className="fa-solid fa-circle-xmark" style={{ color: '#c40000', marginRight: '0.35rem' }}></i>
                  {transaction.rejection_reason}
                </span>
              </div>
            )}

            <DR label="Expires on"    value={formatDate(transaction.expiry_date)} />
            {transaction.created_at && <DR label="Date Recorded" value={formatDate(transaction.created_at)} />}
            {transaction.updated_at && transaction.status !== 'Pending' && (
              <DR label="Last Updated" value={formatDate(transaction.updated_at)} />
            )}
          </div>

          {/* ── Footer ── */}
          <div className="txn-audit-footer">
            <button className="txn-audit-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      {/* Receipt lightbox */}
      {receiptZoomed && transaction.receipt_image && (
        <div className="receipt-lightbox-overlay" onClick={() => setReceiptZoomed(false)}>
          <div className="receipt-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="receipt-lightbox-close" onClick={() => setReceiptZoomed(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img src={transaction.receipt_image} alt="Receipt full view" className="receipt-lightbox-img" />
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionDetailsModal;