import React from 'react';

const TransactionDetailsModal = ({ show, onClose, transaction }) => {
  if (!show || !transaction) return null;

  const qrValue = transaction.qr_code_id || transaction.transaction_id || `TXN-${transaction.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=c50000&bgcolor=ffffff&data=${encodeURIComponent(qrValue)}`;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Redeemed': return 'redeemed';
      case 'Pending':  return 'pending';
      case 'Expired':  return 'expired';
      default:         return '';
    }
  };

  return (
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

        {/* ── Details ── */}
        <div className="txn-audit-details">
          <div className="txn-audit-row">
            <span className="txn-audit-key">Customer</span>
            <span className="txn-audit-val">{transaction.user_name || 'Anonymous'}</span>
          </div>
          <div className="txn-audit-row">
            <span className="txn-audit-key">Voucher Availed</span>
            <span className="txn-audit-val">{transaction.voucher_name || 'N/A'}</span>
          </div>
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
        </div>

        {/* ── Close Button ── */}
        <div className="txn-audit-footer">
          <button className="txn-audit-close-btn" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  );
};

export default TransactionDetailsModal;