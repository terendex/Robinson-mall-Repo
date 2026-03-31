import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../css/Customer.css';

const statusIcons = {
  Pending:  'fa-clock',
  Approved: 'fa-circle-check',
  Rejected: 'fa-circle-xmark',
};

const CustomerClaims = ({ user }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

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

  return (
    <div className="customer-claims">
      <div className="customer-dashboard-header">
        <h1>My Claimed Vouchers</h1>
        <p>Monitor the status of your claimed vouchers and rewards.</p>
      </div>

      {/* Filter pills */}
      {claims.length > 0 && (
        <div className="claims-filter-bar">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              className={`filter-pill${filter === opt ? ' active' : ''}`}
              onClick={() => setFilter(opt)}
            >
              {opt !== 'All' && (
                <i className={`fa-solid ${statusIcons[opt]}`}></i>
              )}
              {opt}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-gift"></i>
          <h3>{claims.length === 0 ? 'No claimed vouchers yet.' : `No ${filter} claims.`}</h3>
          <p>
            {claims.length === 0
              ? 'Go to active campaigns to find deals!'
              : 'Try selecting a different filter above.'}
          </p>
        </div>
      ) : (
        <div className="claims-list">
          {filtered.map((claim) => (
            <div key={claim.id} className="claim-card">
              <div className="claim-icon">
                <i className={`fa-solid ${statusIcons[claim.status] || 'fa-ticket'}`}></i>
              </div>
              <div className="claim-info">
                <div className="claim-title">{claim.voucher_name}</div>
                <div className="claim-meta">
                  <span>
                    <i className="fa-solid fa-barcode"></i>
                    {claim.receipt_no}
                  </span>
                  <span>
                    <i className="fa-solid fa-calendar-days"></i>
                    {new Date(claim.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                  <span>
                    <i className="fa-solid fa-tag"></i>
                    {claim.voucher_code}
                  </span>
                </div>
              </div>
              <div className={`claim-status ${claim.status.toLowerCase()}`}>
                <i className={`fa-solid ${statusIcons[claim.status]}`}></i>
                {claim.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerClaims;
