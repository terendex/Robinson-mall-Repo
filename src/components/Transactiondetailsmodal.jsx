import React, { useState } from 'react';

const TransactionDetailsModal = ({ show, onClose, transaction }) => {
  const [receiptZoomed, setReceiptZoomed] = useState(false);

  if (!show || !transaction) return null;

  const qrValue = transaction.qr_code_id || transaction.transaction_id || `TXN-${transaction.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=c50000&bgcolor=ffffff&data=${encodeURIComponent(qrValue)}`;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Redeemed': return 'redeemed';
      case 'Pending': return 'pending';
      case 'Expired': return 'expired';
      default: return '';
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content txn-audit-modal">

          {/* ── Header ── */}
          <div className="modal-header">
            <h2>Transaction Audit</h2>
            <button className="close-x" onClick={onClose}>&times;</button>
          </div>

          {/* ── QR Code ── */}
          <div className="txn-audit-qr-wrapper">
            <img
              src={qrImageUrl}
              alt="QR Code"
              className="txn-audit-qr-img"
            />
            <p className="txn-audit-qr-label">
              QR Code ID: <strong>{qrValue}</strong>
            </p>
          </div>

          <div className="txn-audit-divider"></div>

          {/* ── Receipt Image (if attached) ── */}
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
                  <img
                    src={transaction.receipt_image}
                    alt="Receipt"
                    className="txn-audit-receipt-thumb"
                  />
                  <div className="txn-audit-receipt-zoom-hint">
                    <i className="fa-solid fa-magnifying-glass-plus"></i>
                  </div>
                </div>
              </div>
              <div className="txn-audit-divider"></div>
            </>
          )}

          {/* ── Details ── */}
          <div className="txn-audit-details">

            <div className="txn-audit-row">
              <span className="txn-audit-key">Customer</span>
              <span className="txn-audit-val">{transaction.user_name || 'Anonymous'}</span>
            </div>

            {transaction.store_name && (
              <div className="txn-audit-row">
                <span className="txn-audit-key">Store / Branch</span>
                <span className="txn-audit-val">{transaction.store_name}</span>
              </div>
            )}

            {(transaction.amount || transaction.amount === 0) && (
              <div className="txn-audit-row">
                <span className="txn-audit-key">Receipt Total</span>
                <span className="txn-audit-val txn-audit-amount">{formatAmount(transaction.amount)}</span>
              </div>
            )}

            {transaction.receipt_no && (
              <div className="txn-audit-row">
                <span className="txn-audit-key">Receipt No.</span>
                <span className="txn-audit-val txn-audit-mono">{transaction.receipt_no}</span>
              </div>
            )}

            <div className="txn-audit-row">
              <span className="txn-audit-key">Voucher Availed</span>
              <span className="txn-audit-val">{transaction.voucher_name || 'N/A'}</span>
            </div>

            {transaction.voucher_code && (
              <div className="txn-audit-row">
                <span className="txn-audit-key">Voucher Code</span>
                <span className="txn-audit-val txn-audit-mono">{transaction.voucher_code}</span>
              </div>
            )}

            <div className="txn-audit-row">
              <span className="txn-audit-key">Status</span>
              <span className={`txn-status-badge ${getStatusClass(transaction.status)}`}>
                {transaction.status}
              </span>
            </div>

            <div className="txn-audit-row">
              <span className="txn-audit-key">Expires on</span>
              <span className="txn-audit-val">{formatDate(transaction.expiry_date)}</span>
            </div>

            {transaction.created_at && (
              <div className="txn-audit-row">
                <span className="txn-audit-key">Date Recorded</span>
                <span className="txn-audit-val">{formatDate(transaction.created_at)}</span>
              </div>
            )}
          </div>

          {/* ── Close Button ── */}
          <div className="txn-audit-footer">
            <button className="txn-audit-close-btn" onClick={onClose}>Close</button>
          </div>

        </div>
      </div>

      {/* ── Receipt Zoom Lightbox ── */}
      {receiptZoomed && transaction.receipt_image && (
        <div
          className="receipt-lightbox-overlay"
          onClick={() => setReceiptZoomed(false)}
        >
          <div className="receipt-lightbox-content" onClick={e => e.stopPropagation()}>
            <button
              className="receipt-lightbox-close"
              onClick={() => setReceiptZoomed(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img
              src={transaction.receipt_image}
              alt="Receipt full view"
              className="receipt-lightbox-img"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionDetailsModal;