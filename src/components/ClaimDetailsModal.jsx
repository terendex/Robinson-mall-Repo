import React from 'react';
import '../styles/Modal.css';

const ClaimDetailsModal = ({ show, onClose, claim }) => {
  if (!show || !claim) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Claim Details</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <div className="claim-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="detail-item">
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Customer</label>
              <p style={{ margin: '5px 0', fontSize: '15px' }}>{claim.user_name || 'Anonymous'}</p>
            </div>
            <div className="detail-item">
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Phone</label>
              <p style={{ margin: '5px 0', fontSize: '15px' }}>{claim.user_phone || 'N/A'}</p>
            </div>
            <div className="detail-item">
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Voucher</label>
              <p style={{ margin: '5px 0', fontSize: '15px' }}>{claim.voucher_name}</p>
            </div>
            <div className="detail-item">
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Voucher Code</label>
              <p style={{ margin: '5px 0', fontSize: '15px' }}>{claim.voucher_code}</p>
            </div>
            <div className="detail-item">
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Store</label>
              <p style={{ margin: '5px 0', fontSize: '15px' }}>{claim.store_name}</p>
            </div>
            <div className="detail-item">
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Receipt No.</label>
              <p style={{ margin: '5px 0', fontSize: '15px' }}>{claim.receipt_no}</p>
            </div>
            <div className="detail-item">
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Amount</label>
              <p style={{ margin: '5px 0', fontSize: '15px', fontWeight: 'bold', color: '#c50000' }}>
                ₱{Number(claim.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>
            <div className="detail-item">
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Date Submitted</label>
              <p style={{ margin: '5px 0', fontSize: '15px' }}>{new Date(claim.created_at).toLocaleString()}</p>
            </div>
            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
              <label style={{ fontWeight: 'bold', fontSize: '12px', color: '#757575', textTransform: 'uppercase' }}>Current Status</label>
              <p style={{ margin: '10px 0' }}>
                <span className={`status-badge ${claim.status === 'Approved' ? 'approved-filled' : claim.status.toLowerCase()}`}>
                  {claim.status}
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
          <button className="cancel-inner-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetailsModal;
