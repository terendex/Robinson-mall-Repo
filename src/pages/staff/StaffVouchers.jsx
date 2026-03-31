import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import VoucherModal from '../../components/VoucherModal';
import '../../css/Vouchers.css';

const StaffVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusFilterRef = useRef(null);

  useEffect(() => {
    fetchVouchers();

    const handleClickOutside = (event) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/vouchers/');
      setVouchers(response.data);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (voucher) => {
    setSelectedVoucher(voucher);
    setShowModal(true);
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           v.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || 
                           (statusFilter === 'Active' && v.is_active) || 
                           (statusFilter === 'Inactive' && !v.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [vouchers, searchQuery, statusFilter]);

  return (
    <div className="vouchers-page">
      <div className="vouchers-container">
        <div className="vouchers-header">
          <h1>Vouchers</h1>
        </div>

        <div className="vouchers-list-section">
          <div className="vouchers-controls">
            <div className="search-wrapper">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder="Search vouchers" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-dropdown-container" ref={statusFilterRef}>
              <button 
                className={`filter-button ${isStatusDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              >
                <i className="fa-solid fa-filter"></i> {statusFilter === 'All' ? 'All Status' : statusFilter}
              </button>
              {isStatusDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {['All', 'Active', 'Inactive'].map(val => (
                    <div 
                      key={val} 
                      className="filter-option"
                      onClick={() => { setStatusFilter(val); setIsStatusDropdownOpen(false); }}
                    >
                      {val === statusFilter && <i className="fa-solid fa-check"></i>}
                      <span style={{ marginLeft: val === statusFilter ? 0 : 28 }}>{val === 'All' ? 'All Status' : val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="vouchers-table-wrapper">
          {loading ? (
            <div className="loading-container">
              <div className="loader"></div>
            </div>
          ) : (
            <table className="vouchers-table">
              <thead>
                <tr>
                  <th>Voucher</th>
                  <th>Type</th>
                  <th>Discount</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td>
                      <div className="voucher-info-cell">
                        <span className="voucher-name">{voucher.name}</span>
                        <span className="voucher-code">{voucher.code}</span>
                      </div>
                    </td>
                    <td className="voucher-type-cell">{voucher.voucher_type}</td>
                    <td className="discount-cell">{voucher.discount_percentage}%</td>
                    <td className="usage-cell">
                      <span className="usage-text">{voucher.usage_count}/{voucher.usage_limit}</span>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${Math.min((voucher.usage_count / voucher.usage_limit) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${voucher.is_active ? 'active' : 'inactive'}`}>
                        {voucher.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions-cell">
                        <button 
                          className="view-details-btn-new"
                          onClick={() => handleViewDetails(voucher)}
                        >
                          <i className="fa-regular fa-eye"></i> View details
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      </div>
      <VoucherModal 
        show={showModal}
        onClose={() => setShowModal(false)}
        voucherToEdit={selectedVoucher}
        readOnly={true}
      />
    </div>
  );
};

export default StaffVouchers;
