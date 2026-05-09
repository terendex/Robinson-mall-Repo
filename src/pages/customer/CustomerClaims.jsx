import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../../components/Pagination';
import '../../css/Customer.css';

const PAGE_SIZE = 6;

const statusIcons = {
  Pending:  'fa-clock',
  Approved: 'fa-circle-check',
  Rejected: 'fa-circle-xmark',
};

/**
 * CustomerClaims Component
 * Consolidated view of all user claims and vouchers.
 * Replaces the previous separate Vouchers and Claims pages.
 */
const CustomerClaims = ({ user }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

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

  const filterOptions = ['All', 'Pending', 'Approved', 'Rejected'];
  const filtered = filter === 'All' ? claims : claims.filter(c => c.status === filter);
  
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedClaims = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatusClass = (status) => {
    switch(status) {
      case 'Approved': return 'approved-ticket';
      case 'Rejected': return 'rejected-ticket';
      default: return 'pending-ticket';
    }
  };

  return (
    <div className="customer-claims">
      <div className="customer-dashboard-header">
        <h1>My Claims & Vouchers</h1>
        <p>Monitor your voucher status and view active rewards.</p>
      </div>

      <div className="claims-controls">
        <div className="claims-filter-bar">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              className={`filter-pill${filter === opt ? ' active' : ''}`}
              onClick={() => { setFilter(opt); setCurrentPage(1); }}
            >
              {opt !== 'All' && <i className={`fa-solid ${statusIcons[opt]}`}></i>}
              {opt}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-gift"></i>
          <h3>{claims.length === 0 ? 'No claims yet.' : `No ${filter} claims.`}</h3>
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
              <div key={claim.id} className={`customer-campaign-card premium-voucher-card ${getStatusClass(claim.status)}`}>
                <div className="voucher-left-accent"></div>
                <div className="campaign-card-content">
                  <div className="voucher-card-header">
                    <span className="voucher-type-tag">{claim.status}</span>
                    <div className="voucher-status-icon"><i className={`fa-solid ${statusIcons[claim.status]}`}></i></div>
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
                      <span className="v-code-label">{claim.status === 'Approved' ? 'Voucher Code' : 'Receipt Reference'}</span>
                      <span className="v-code-text">{claim.status === 'Approved' ? claim.voucher_code : claim.receipt_no}</span>
                    </div>
                    {claim.status === 'Approved' && (
                      <button
                        className="voucher-use-btn"
                        onClick={() => alert(`Showing QR for ${claim.voucher_code}`)}
                      >
                        <i className="fa-solid fa-qrcode"></i>
                      </button>
                    )}
                  </div>

                  <div className="voucher-footer">
                    <span className="valid-until">
                      {claim.status === 'Pending' ? 'PENDING REVIEW' : 
                       claim.status === 'Rejected' ? 'CLAIM REJECTED' : 
                       'VALID FOR REDEMPTION'}
                    </span>
                    <div className={`voucher-valid-pill status-${claim.status.toLowerCase()}`}>{claim.status}</div>
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
    </div>
  );
};

export default CustomerClaims;
