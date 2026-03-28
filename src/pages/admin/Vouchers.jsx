import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import VoucherModal from '../../components/VoucherModal';
import '../../styles/Vouchers.css';

const Vouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [voucherToEdit, setVoucherToEdit] = useState(null);
  const [activeActions, setActiveActions] = useState(null);

  useEffect(() => {
    fetchVouchers();
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

  const handleAddVoucher = () => {
    setVoucherToEdit(null);
    setShowModal(true);
  };

  const handleEditVoucher = (voucher) => {
    setVoucherToEdit(voucher);
    setShowModal(true);
    setActiveActions(null);
  };

  const handleDeleteVoucher = async (id) => {
    if (window.confirm('Are you sure you want to delete this voucher?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/vouchers/${id}/`);
        setVouchers(vouchers.filter(v => v.id !== id));
      } catch (error) {
        console.error('Error deleting voucher:', error);
      }
    }
  };

  const handleSaveVoucher = async (formData) => {
    try {
      if (voucherToEdit) {
        const response = await axios.patch(`http://127.0.0.1:8000/api/vouchers/${voucherToEdit.id}/`, formData);
        setVouchers(vouchers.map(v => v.id === voucherToEdit.id ? response.data : v));
      } else {
        const response = await axios.post('http://127.0.0.1:8000/api/vouchers/', formData);
        setVouchers([...vouchers, response.data]);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving voucher:', error);
      alert('Error saving voucher. Please check if code is unique.');
    }
  };

  const toggleVoucherStatus = async (voucher) => {
    try {
      const response = await axios.patch(`http://127.0.0.1:8000/api/vouchers/${voucher.id}/`, {
        is_active: !voucher.is_active
      });
      setVouchers(vouchers.map(v => v.id === voucher.id ? response.data : v));
      setActiveActions(null);
    } catch (error) {
      console.error('Error toggling voucher status:', error);
    }
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
          <button className="create-voucher-btn" onClick={handleAddVoucher}>
            <i className="fa-solid fa-plus"></i> Create Voucher
          </button>
        </div>

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
          <div className="filter-wrapper">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="vouchers-list-section">
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
                  <th>Actions</th>
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
                    <td style={{ position: 'relative', textAlign: 'center' }}>
                      <button 
                        className="triple-dot-btn" 
                        onClick={() => setActiveActions(activeActions === voucher.id ? null : voucher.id)}
                      >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                      {activeActions === voucher.id && (
                        <div className="dot-menu show">
                          <button onClick={() => handleEditVoucher(voucher)}>Edit</button>
                          <button onClick={() => toggleVoucherStatus(voucher)}>
                            {voucher.is_active ? 'Disable' : 'Active'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <VoucherModal 
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveVoucher}
        voucherToEdit={voucherToEdit}
      />
    </div>
  );
};

export default Vouchers;
