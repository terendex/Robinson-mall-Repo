import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import '../../styles/Claims.css';

const Claims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [statusFilters, setStatusFilters] = useState({
    Approved: false,
    Rejected: false,
    Pending: false
  });
  const [amountFilter, setAmountFilter] = useState('All Values');
  
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isAmountDropdownOpen, setIsAmountDropdownOpen] = useState(false);
  const [activeActions, setActiveActions] = useState(null);
  
  const statusFilterRef = useRef(null);
  const amountFilterRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
      if (amountFilterRef.current && !amountFilterRef.current.contains(event.target)) {
        setIsAmountDropdownOpen(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActiveActions(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/claims/');
      setClaims(response.data);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const response = await axios.patch(`http://127.0.0.1:8000/api/claims/${id}/`, {
        status: newStatus
      });
      setClaims(claims.map(c => c.id === id ? response.data : c));
      setActiveActions(null);
    } catch (error) {
      console.error('Error updating claim status:', error);
    }
  };

  const handleFilterToggle = (status) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const filteredClaims = useMemo(() => {
    const isAnyStatusSelected = Object.values(statusFilters).some(v => v);
    
    return claims.filter(c => {
      // Search logic (Customer, Voucher, Store)
      const matchesSearch = 
        (c.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.voucher_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.store_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter logic
      let matchesStatus = true;
      if (isAnyStatusSelected) {
        matchesStatus = statusFilters[c.status];
      }

      // Amount filter logic
      let matchesAmount = true;
      const amt = Number(c.amount);
      if (amountFilter === 'Under P1,000') matchesAmount = amt < 1000;
      else if (amountFilter === 'P1,000 - P5,000') matchesAmount = amt >= 1000 && amt <= 5000;
      else if (amountFilter === 'Over P5,000') matchesAmount = amt > 5000;
      
      return matchesSearch && matchesStatus && matchesAmount;
    });
  }, [claims, searchQuery, statusFilters, amountFilter]);

  const stats = useMemo(() => {
    return {
      total: claims.length,
      approved: claims.filter(c => c.status === 'Approved').length,
      pending: claims.filter(c => c.status === 'Pending').length
    };
  }, [claims]);

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return (
      <>
        {date.toISOString().split('T')[0]}<br />
        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </>
    );
  };

  return (
    <div className="claims-page">
      <div className="claims-container">
        <div className="claims-header">
          <h1>Claims Management</h1>
          <button className="new-claim-btn">
            <i className="fa-solid fa-plus"></i> New Claim
          </button>
        </div>

        <div className="claim-stats">
          <div className="claim-stat-card">
            <div className="stat-title">TOTAL CLAIMS</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="claim-stat-card">
            <div className="stat-title">APPROVED CLAIMS</div>
            <div className="stat-value">{stats.approved}</div>
          </div>
          <div className="claim-stat-card">
            <div className="stat-title">PENDING REVIEW</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
        </div>

        <div className="claim-table-section">
          <div className="claim-table-controls">
            <div className="claim-search-wrapper">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder="Search by voucher, user, or store" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="filter-dropdown-container" ref={amountFilterRef}>
              <button 
                className={`filter-button ${isAmountDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsAmountDropdownOpen(!isAmountDropdownOpen)}
              >
                <i className="fa-solid fa-arrows-up-down"></i> {amountFilter}
              </button>
              {isAmountDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {['All Values', 'Under P1,000', 'P1,000 - P5,000', 'Over P5,000'].map(val => (
                    <div 
                      key={val} 
                      className="filter-option"
                      onClick={() => { setAmountFilter(val); setIsAmountDropdownOpen(false); }}
                    >
                      {val === amountFilter && <i className="fa-solid fa-check"></i>}
                      <span style={{ marginLeft: val === amountFilter ? 0 : 28 }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-dropdown-container" ref={statusFilterRef}>
              <button 
                className={`filter-button ${isStatusDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              >
                <i className="fa-solid fa-filter"></i> Filter Status
              </button>
              {isStatusDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {['Approved', 'Rejected', 'Pending'].map(status => (
                    <label key={status} className="filter-option">
                      <input 
                        type="checkbox" 
                        checked={statusFilters[status]} 
                        onChange={() => handleFilterToggle(status)} 
                      /> {status}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="claim-table-wrapper">
            {loading ? (
              <div className="loading-wrap">
                <i className="fa-solid fa-spinner fa-spin fa-2xl" color="#bdbdbd"></i>
              </div>
            ) : (
              <table className="claims-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Voucher</th>
                    <th>Store</th>
                    <th>Receipt No.</th>
                    <th>Amount</th>
                    <th>Date/Time</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-name">{claim.user_name || 'Anonymous User'}</span>
                          <span className="customer-phone">
                            <i className="fa-solid fa-phone"></i> {claim.user_phone || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="voucher-cell">
                          <span className="voucher-title">{claim.voucher_name}</span>
                          <span className="voucher-code">{claim.voucher_code}</span>
                        </div>
                      </td>
                      <td>
                        <span className="store-name">{claim.store_name}</span>
                      </td>
                      <td>
                        <span className="receipt-no">{claim.receipt_no}</span>
                      </td>
                      <td className="amount-cell">
                        ₱{Number(claim.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td className="date-cell">
                        {formatDateTime(claim.created_at)}
                      </td>
                      <td>
                        <span className={`status-badge ${claim.status === 'Approved' ? 'approved-filled' : claim.status.toLowerCase()}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="action-dot-btn"
                          onClick={() => setActiveActions(activeActions === claim.id ? null : claim.id)}
                        >
                          <i className="fa-solid fa-ellipsis"></i>
                        </button>
                        {activeActions === claim.id && (
                          <div className="action-dropdown" ref={actionsRef}>
                            <button className="action-item" onClick={() => setActiveActions(null)}>
                              <i className="fa-regular fa-eye"></i> View Claim Details
                            </button>
                            <button className="action-item" onClick={() => setActiveActions(null)}>
                              <i className="fa-regular fa-pen-to-square"></i> Edit Claim Details
                            </button>
                            <div className="action-divider"></div>
                            <button className="action-item approve" onClick={() => handleStatusUpdate(claim.id, 'Approved')}>
                              <i className="fa-solid fa-check"></i> Approve Claim
                            </button>
                            <button className="action-item reject" onClick={() => handleStatusUpdate(claim.id, 'Rejected')}>
                              <i className="fa-solid fa-xmark"></i> Reject Claim
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredClaims.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#9e9e9e' }}>
                        No claims found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Claims;
