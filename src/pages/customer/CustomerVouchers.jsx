import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../css/Customer.css';

/**
 * CustomerVouchers Component
 * Handles the UI and data logic for the CustomerVouchers module.
 */
const CustomerVouchers = ({ user }) => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApprovedVouchers = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/claims/?user_id=${user.id}&status=Approved`
        );
        setVouchers(response.data);
      } catch (error) {
        console.error('Error fetching approved vouchers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovedVouchers();
  }, [user.id]);

  if (loading) return (
    <div className="loading">
      <i className="fa-solid fa-spinner fa-spin"></i> Loading your vouchers...
    </div>
  );

  return (
    <div className="customer-vouchers">
      <div className="customer-dashboard-header">
        <h1>My Vouchers</h1>
        <p>Ready-to-use rewards and exclusive discounts.</p>
      </div>

      {vouchers.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-ticket-simple"></i>
          <h3>No active vouchers yet.</h3>
          <p>Your approved claims will appear here as vouchers you can use.</p>
        </div>
      ) : (
        <div className="campaign-grid">
          {vouchers.map((claim) => (
            <div key={claim.id} className="customer-campaign-card voucher-card">
              {/* Card header — green gradient */}
              <div
                className="campaign-card-image"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
              >
                <i className="fa-solid fa-check-circle"></i>
              </div>

              <div className="campaign-card-content">
                {/* Status badge */}
                <span
                  className="campaign-card-type"
                  style={{ background: '#dcfce7', color: '#15803d' }}
                >
                  <i className="fa-solid fa-circle-check" style={{ marginRight: '0.4rem', fontSize: '0.7rem' }}></i>
                  {claim.status}
                </span>

                <h3>{claim.voucher_name}</h3>

                <div className="voucher-code-row">
                  <span className="voucher-code-label">Code</span>
                  <span className="voucher-code-value">{claim.voucher_code}</span>
                </div>

                <div className="campaign-card-details">
                  <div className="voucher-valid-badge">
                    <i className="fa-solid fa-shield-check"></i> VALID
                  </div>
                  <button
                    className="claim-btn"
                    style={{ background: '#16a34a' }}
                    onClick={() => alert(`Showing QR for ${claim.voucher_code}`)}
                  >
                    <i className="fa-solid fa-qrcode" style={{ marginRight: '0.4rem' }}></i>
                    Use Voucher
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerVouchers;
