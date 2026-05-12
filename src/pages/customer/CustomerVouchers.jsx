import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../../components/Pagination';
import '../../css/Customer.css';

const PAGE_SIZE = 6;

/**
 * CustomerVouchers Component
 * Redesigned to look like premium digital tickets.
 */
const CustomerVouchers = ({ user }) => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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
        <div className="customer-cards-container">
          <div className="campaign-grid">
            {vouchers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((claim) => (
              <div key={claim.id} className="customer-campaign-card premium-voucher-card">
                <div className="voucher-left-accent"></div>
                <div className="campaign-card-content">
                  <div className="voucher-card-header">
                    <span className="voucher-type-tag">Exclusive Reward</span>
                    <div className="voucher-status-icon"><i className="fa-solid fa-circle-check"></i></div>
                  </div>
                  
                  <h3>{claim.voucher_name}</h3>
                  <p className="voucher-store-loc"><i className="fa-solid fa-location-dot"></i> {claim.store_name}</p>

                  <div className="voucher-ticket-divider">
                    <div className="cutout cutout-left"></div>
                    <div className="divider-line"></div>
                    <div className="cutout cutout-right"></div>
                  </div>

                  <div className="voucher-code-display">
                    <div className="v-code-wrap">
                      <span className="v-code-label">Voucher Code</span>
                      <span className="v-code-text">{claim.voucher_code}</span>
                    </div>
                    <button
                      className="voucher-use-btn"
                      onClick={() => alert(`Showing QR for ${claim.voucher_code}`)}
                    >
                      <i className="fa-solid fa-qrcode"></i>
                    </button>
                  </div>

                  <div className="voucher-footer">
                    <span className="valid-until">VALID FOR REDEMPTION</span>
                    <div className="voucher-valid-pill">ACTIVE</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Pagination 
            currentPage={currentPage}
            totalPages={Math.ceil(vouchers.length / PAGE_SIZE)}
            onPageChange={setCurrentPage}
            totalItems={vouchers.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}
    </div>
  );
};

export default CustomerVouchers;
