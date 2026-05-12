import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import ClaimDetailsModal from '../../components/ClaimDetailsModal';
import Pagination from '../../components/Pagination';
import '../../css/Claims.css';

const PAGE_SIZE = 10;


/**
 * StaffClaims Component
 * Handles the UI and data logic for the StaffClaims module.
 */
const StaffClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [statusFilters, setStatusFilters] = useState({
    Approved: false,
    Rejected: false,
    Pending: false
  });
  const [amountFilter, setAmountFilter] = useState('All Values');
  
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isAmountDropdownOpen, setIsAmountDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  
  const statusFilterRef = useRef(null);
  const amountFilterRef = useRef(null);

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

  const handleFilterToggle = (status) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const handleViewDetails = (claim) => {
    setSelectedClaim(claim);
    setShowModal(true);
  };

  const filteredClaims = useMemo(() => {
    const isAnyStatusSelected = Object.values(statusFilters).some(v => v);
    
    return claims.filter(c => {
      const matchesSearch = 
        (c.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.voucher_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.store_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (isAnyStatusSelected) {
        matchesStatus = statusFilters[c.status];
      }

      let matchesAmount = true;
      const amt = Number(c.amount);
      if (amountFilter === 'Under P1,000') matchesAmount = amt < 1000;
      else if (amountFilter === 'P1,000 - P5,000') matchesAmount = amt >= 1000 && amt <= 5000;
      else if (amountFilter === 'Over P5,000') matchesAmount = amt > 5000;
      
      return matchesSearch && matchesStatus && matchesAmount;
    });
  }, [claims, searchQuery, statusFilters, amountFilter]);

  useMemo(() => { setCurrentPage(1); }, [searchQuery, statusFilters, amountFilter]);

  const totalPages  = Math.ceil(filteredClaims.length / PAGE_SIZE);
  const pagedClaims = filteredClaims.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);


  const stats = useMemo(() => {
    return {
      total: claims.length,
      claimed:    claims.filter(c => c.status === 'Approved').length,
      notClaimed: claims.filter(c => c.status === 'Pending').length,
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
          <h1>Claims Overview</h1>
        </div>

        <div className="claim-stats">
          <div className="claim-stat-card">
            <div className="stat-title">TOTAL CLAIMS</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="claim-stat-card">
            <div className="stat-title">CLAIMED</div>
            <div className="stat-value">{stats.claimed}</div>
          </div>
          <div className="claim-stat-card">
            <div className="stat-title">NOT CLAIMED</div>
            <div className="stat-value">{stats.notClaimed}</div>
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
                  {[{ val: 'Approved', lbl: 'Claimed' }, { val: 'Pending', lbl: 'Not Claimed' }, { val: 'Rejected', lbl: 'Expired' }].map(({ val, lbl }) => (
                    <label key={val} className="filter-option">
                      <input
                        type="checkbox"
                        checked={statusFilters[val]}
                        onChange={() => handleFilterToggle(val)}
                      /> {lbl}
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
              <>
                <table className="claims-table">
                  <thead>
                    <tr>
                      <th>Claim No.</th>
                      <th>Customer</th>
                      <th>Voucher</th>
                      <th>Store</th>
                      <th>Amount</th>
                      <th>Date/Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedClaims.map((claim) => (

                      <tr key={claim.id}>
                        <td>
                          <span className="receipt-no">{claim.receipt_no || `CLM-${String(claim.id).padStart(4, '0')}`}</span>
                        </td>
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
                        <td className="amount-cell">
                          ₱{Number(claim.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td className="date-cell">
                          {formatDateTime(claim.created_at)}
                        </td>
                         <td>
                           <span className={`status-badge ${claim.status === 'Approved' ? 'approved-filled' : claim.status.toLowerCase()}`}>
                             {({ Pending: 'Not Claimed', Approved: 'Claimed', Rejected: 'Expired' })[claim.status] || claim.status}
                           </span>
                         </td>
                        <td className="actions-cell" style={{ textAlign: 'center' }}>
                          <button 
                            className="view-details-btn-new"
                            onClick={() => handleViewDetails(claim)}
                            style={{ margin: '0 auto' }}
                          >
                            <i className="fa-regular fa-eye"></i> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredClaims.length}
                  pageSize={PAGE_SIZE}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <ClaimDetailsModal 
        show={showModal}
        onClose={() => setShowModal(false)}
        claim={selectedClaim}
      />
    </div>
  );
};

export default StaffClaims;
