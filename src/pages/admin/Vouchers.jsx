import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import VoucherModal from '../../components/VoucherModal';
import Pagination from '../../components/Pagination';
import RedeemVoucherPanel from '../../components/RedeemVoucherPanel';
import ActionConfirmModal from '../../components/ActionConfirmModal';
import SuccessModal from '../../components/SuccessModal';
import '../../css/Vouchers.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';


/**
 * Vouchers Component
 * Handles the UI and data logic for the Vouchers module.
 */
const PAGE_SIZE = 10;

const TAB_BTN = (active, color, onClick, icon, label) => (
  <button onClick={onClick} style={{
    padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
    border: '1.5px solid', cursor: 'pointer', transition: 'all 0.18s',
    background: active ? color : '#fff',
    color:      active ? '#fff' : '#64748b',
    borderColor: active ? color : '#e2e8f0',
  }}>
    <i className={`fa-solid ${icon}`} style={{ marginRight: '0.4rem' }}></i>{label}
  </button>
);

const Vouchers = () => {
  const [tab, setTab] = useState('vouchers'); // 'vouchers' | 'redeem'
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [voucherToEdit, setVoucherToEdit] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [activeActions, setActiveActions] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const statusFilterRef = useRef(null);

  const [confirmConfig, setConfirmConfig] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'primary',
    onConfirm: () => {}
  });

  const [successConfig, setSuccessConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchVouchers();
    
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActiveActions(null);
      }
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
      const response = await axios.get(`${BASE}/api/vouchers/`);
      setVouchers(response.data);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVoucher = () => {
    setVoucherToEdit(null);
    setViewOnly(false);
    setShowModal(true);
  };

  const handleEditVoucher = (voucher) => {
    setVoucherToEdit(voucher);
    setViewOnly(false);
    setShowModal(true);
    setActiveActions(null);
  };

  const handleViewVoucher = (voucher) => {
    setVoucherToEdit(voucher);
    setViewOnly(true);
    setShowModal(true);
    setActiveActions(null);
  };

  const handleDeleteVoucher = async (id) => {
    try {
      await axios.delete(`${BASE}/api/vouchers/${id}/`);
      setVouchers(vouchers.filter(v => v.id !== id));
      setSuccessConfig({
        show: true,
        title: 'Deleted!',
        message: 'The voucher has been removed successfully.'
      });
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert('Failed to delete voucher.');
    }
  };

  const requestDeleteConfirm = (voucher) => {
    setActiveActions(null);
    setConfirmConfig({
      show: true,
      title: 'Delete Voucher',
      message: `Are you sure you want to delete "${voucher.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => handleDeleteVoucher(voucher.id)
    });
  };

  const handleSaveVoucher = async (formData) => {
    try {
      if (voucherToEdit) {
        const response = await axios.patch(`${BASE}/api/vouchers/${voucherToEdit.id}/`, formData);
        setVouchers(vouchers.map(v => v.id === voucherToEdit.id ? response.data : v));
      } else {
        const response = await axios.post(`${BASE}/api/vouchers/`, formData);
        setVouchers([response.data, ...vouchers]);
      }
      setShowModal(false);
      setSuccessConfig({
        show: true,
        title: voucherToEdit ? 'Updated!' : 'Created!',
        message: `Voucher "${formData.name}" has been ${voucherToEdit ? 'updated' : 'created'} successfully.`
      });
    } catch (error) {
      console.error('Error saving voucher:', error);
      alert('Error saving voucher. Please check if code is unique.');
    }
  };

  const requestSaveConfirm = (formData) => {
    setConfirmConfig({
      show: true,
      title: voucherToEdit ? 'Confirm Edit' : 'Confirm Add',
      message: `Are you sure you want to ${voucherToEdit ? 'update' : 'create'} this voucher?`,
      confirmText: voucherToEdit ? 'Save Changes' : 'Create Voucher',
      variant: 'success',
      onConfirm: () => handleSaveVoucher(formData)
    });
  };

  const toggleVoucherStatus = async (voucher) => {
    try {
      const response = await axios.patch(`${BASE}/api/vouchers/${voucher.id}/`, {
        is_active: !voucher.is_active
      });
      setVouchers(vouchers.map(v => v.id === voucher.id ? response.data : v));
      setActiveActions(null);
      setSuccessConfig({
        show: true,
        title: response.data.is_active ? 'Activated!' : 'Disabled!',
        message: `Voucher "${voucher.name}" is now ${response.data.is_active ? 'active' : 'inactive'}.`
      });
    } catch (error) {
      console.error('Error toggling voucher status:', error);
      alert('Failed to update voucher status.');
    }
  };

  const requestToggleStatusConfirm = (voucher) => {
    setActiveActions(null);
    setConfirmConfig({
      show: true,
      title: voucher.is_active ? 'Disable Voucher' : 'Activate Voucher',
      message: `Are you sure you want to ${voucher.is_active ? 'disable' : 'activate'} "${voucher.name}"?`,
      confirmText: voucher.is_active ? 'Disable' : 'Activate',
      variant: voucher.is_active ? 'danger' : 'success',
      onConfirm: () => toggleVoucherStatus(voucher)
    });
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

  // Reset to page 1 on search/filter change
  useMemo(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  // Pagination
  const totalPages    = Math.ceil(filteredVouchers.length / PAGE_SIZE);
  const pagedVouchers = filteredVouchers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="vouchers-page">
      <div className="vouchers-container">
        <div className="vouchers-header">
          <h1>Vouchers</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {tab === 'vouchers' && (
              <button className="create-voucher-btn" onClick={handleAddVoucher}>
                <i className="fa-solid fa-plus"></i> Create Voucher
              </button>
            )}
            {TAB_BTN(tab === 'vouchers', '#c50000', () => setTab('vouchers'), 'fa-ticket-simple', 'Vouchers')}
            {TAB_BTN(tab === 'redeem',   '#16a34a', () => setTab('redeem'),   'fa-qrcode',        'Redeem Voucher')}
          </div>
        </div>

        {tab === 'redeem' && <RedeemVoucherPanel />}

        <div className="vouchers-list-section" style={{ display: tab === 'vouchers' ? '' : 'none' }}>
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
                      onClick={() => { setStatusFilter(val); setIsStatusDropdownOpen(false); setCurrentPage(1); }}
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
            <>
                <table className="vouchers-table">
                <thead>
                  <tr>
                    <th>Voucher ID</th>
                    <th>Voucher</th>
                    <th>Campaign</th>
                    <th>Store</th>
                    <th>Type</th>
                    <th>Discount</th>
                    <th>Usage</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedVouchers.length > 0 ? pagedVouchers.map((voucher) => (
                    <tr key={voucher.id}>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          color: '#64748b',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          letterSpacing: '0.04em',
                        }}>
                          VCH-{String(voucher.id).padStart(4, '0')}
                        </span>
                      </td>
                      <td>
                        <div className="voucher-info-cell">
                          <span className="voucher-name">{voucher.name}</span>
                          <span className="voucher-code">{voucher.code}</span>
                        </div>
                      </td>
                      <td className="voucher-campaign-cell">
                        {voucher.campaign_name
                          ? <span className="voucher-campaign-tag">{voucher.campaign_name}</span>
                          : <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>
                        }
                      </td>
                      <td className="voucher-store-cell">
                        {voucher.store_name
                          ? <span className="voucher-store-tag"><i className="fa-solid fa-store" style={{ fontSize: '0.7rem', marginRight: '0.3rem' }}></i>{voucher.store_name}</span>
                          : <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>
                        }
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
                      <td style={{ textAlign: 'center' }}>
                        <div 
                          style={{ position: 'relative', display: 'inline-block' }} 
                          ref={activeActions === voucher.id ? actionsRef : null}
                        >
                          <button 
                            className="triple-dot-btn" 
                            onClick={() => setActiveActions(activeActions === voucher.id ? null : voucher.id)}
                          >
                            <i className="fa-solid fa-ellipsis-vertical"></i>
                          </button>
                          {activeActions === voucher.id && (
                            <div className="dot-menu show">
                              <button onClick={() => handleViewVoucher(voucher)}>
                                <i className="fa-regular fa-eye"></i> View Details
                              </button>
                              <button onClick={() => handleEditVoucher(voucher)}>
                                <i className="fa-solid fa-pen-to-square"></i> Edit
                              </button>
                              <button onClick={() => requestToggleStatusConfirm(voucher)}>
                                <i className={`fa-solid ${voucher.is_active ? 'fa-ban' : 'fa-check'}`}></i> {voucher.is_active ? 'Disable' : 'Activate'}
                              </button>
                              <button onClick={() => requestDeleteConfirm(voucher)} style={{ color: '#dc2626' }}>
                                <i className="fa-solid fa-trash"></i> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#9e9e9e' }}>
                        No vouchers found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredVouchers.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
          </div>
        </div>
      </div>

      <VoucherModal 
        show={showModal}
        onClose={() => { setShowModal(false); setViewOnly(false); }}
        onSave={requestSaveConfirm}
        voucherToEdit={voucherToEdit}
        readOnly={viewOnly}
      />

      <ActionConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(p => ({ ...p, show: false }))}
      />

      <SuccessModal 
        {...successConfig}
        onClose={() => setSuccessConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default Vouchers;
