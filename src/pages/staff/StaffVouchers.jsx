import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import VoucherModal from '../../components/VoucherModal';
import Pagination from '../../components/Pagination';
import RedeemVoucherPanel from '../../components/RedeemVoucherPanel';
import '../../css/Vouchers.css';

const PAGE_SIZE = 10;
const BASE = 'http://127.0.0.1:8000';

/**
 * StaffVouchers Component
 *
 * Tab 1 – Vouchers: browse/view all vouchers.
 * Tab 2 – Redeem Voucher: look up a customer's claim by ID (from QR scan)
 *          and confirm redemption.
 */
const StaffVouchers = () => {
  /* ── Tab ── */
  const [tab, setTab] = useState('vouchers'); // 'vouchers' | 'redeem'

  /* ── Voucher list state ── */
  const [vouchers, setVouchers]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [statusFilter, setStatusFilter]     = useState('All');
  const [showModal, setShowModal]           = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [currentPage, setCurrentPage]       = useState(1);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusFilterRef = useRef(null);

  /* ── Fetch vouchers ── */
  useEffect(() => {
    fetchVouchers();
    const handleClickOutside = (e) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(e.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/api/vouchers/`);
      setVouchers(res.data);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (voucher) => {
    setSelectedVoucher(voucher);
    setShowModal(true);
  };

  /* ── Voucher list filter ── */
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

  useMemo(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const totalPages    = Math.ceil(filteredVouchers.length / PAGE_SIZE);
  const pagedVouchers = filteredVouchers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* ── Redeem: lookup claim by ID ── */
  const handleLookup = async () => {
    const raw = redeemInput.trim();
    if (!raw) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError('');
    setRedeemMsg({ type: '', text: '' });
    try {
      const res = await axios.get(`${BASE}/api/claims/lookup/?q=${encodeURIComponent(raw)}`);
      setLookupResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Claim not found. Check the reference and try again.';
      setLookupError(msg);
    } finally {
      setLookupLoading(false);
    }
  };

  /* ── Redeem: confirm or reject ── */
  const handleRedeem = async (action) => {
    if (!lookupResult) return;
    setRedeemLoading(true);
    try {
      const res = await axios.patch(`${BASE}/api/claims/${lookupResult.id}/redeem/`, { action });
      setRedeemMsg({
        type: 'success',
        text: action === 'approve' ? '✅ Voucher successfully redeemed!' : '❌ Voucher marked as rejected.',
      });
      setLookupResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update claim status.';
      setRedeemMsg({ type: 'error', text: msg });
    } finally {
      setRedeemLoading(false);
    }
  };

  const statusLabel  = (s) => s === 'Approved' ? 'Claimed' : s === 'Rejected' ? 'Expired' : 'Not Claimed';
  const statusColor  = (s) => s === 'Approved' ? '#15803d' : s === 'Rejected' ? '#b91c1c' : '#c2410c';
  const statusBg     = (s) => s === 'Approved' ? '#dcfce7' : s === 'Rejected' ? '#fee2e2' : '#fff7ed';

  return (
    <div className="vouchers-page">
      <div className="vouchers-container">
        <div className="vouchers-header">
          <h1>Vouchers</h1>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setTab('vouchers')}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
                border: '1.5px solid', cursor: 'pointer', transition: 'all 0.18s',
                background: tab === 'vouchers' ? '#c50000' : '#fff',
                color:      tab === 'vouchers' ? '#fff'    : '#64748b',
                borderColor: tab === 'vouchers' ? '#c50000' : '#e2e8f0',
              }}
            >
              <i className="fa-solid fa-ticket-simple" style={{ marginRight: '0.4rem' }}></i>
              Vouchers
            </button>
            <button
              onClick={() => { setTab('redeem'); setLookupResult(null); setLookupError(''); setRedeemMsg({ type: '', text: '' }); setRedeemInput(''); }}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
                border: '1.5px solid', cursor: 'pointer', transition: 'all 0.18s',
                background: tab === 'redeem' ? '#16a34a' : '#fff',
                color:      tab === 'redeem' ? '#fff'    : '#64748b',
                borderColor: tab === 'redeem' ? '#16a34a' : '#e2e8f0',
              }}
            >
              <i className="fa-solid fa-qrcode" style={{ marginRight: '0.4rem' }}></i>
              Redeem Voucher
            </button>
          </div>
        </div>

        {/* ══ TAB: VOUCHER LIST ══ */}
        {tab === 'vouchers' && (
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
                        <span style={{ marginLeft: val === statusFilter ? 0 : 28 }}>
                          {val === 'All' ? 'All Status' : val}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="vouchers-table-wrapper">
              {loading ? (
                <div className="loading-container"><div className="loader"></div></div>
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
                      {pagedVouchers.map((voucher) => (
                        <tr key={voucher.id}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 5, letterSpacing: '0.04em' }}>
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
                              : <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>}
                          </td>
                          <td className="voucher-store-cell">
                            {voucher.store_name
                              ? <span className="voucher-store-tag"><i className="fa-solid fa-store" style={{ fontSize: '0.7rem', marginRight: '0.3rem' }}></i>{voucher.store_name}</span>
                              : <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>}
                          </td>
                          <td className="voucher-type-cell">{voucher.voucher_type}</td>
                          <td className="discount-cell">{voucher.discount_percentage}%</td>
                          <td className="usage-cell">
                            <span className="usage-text">{voucher.usage_count}/{voucher.usage_limit}</span>
                            <div className="progress-bar-container">
                              <div className="progress-bar-fill" style={{ width: `${Math.min((voucher.usage_count / voucher.usage_limit) * 100, 100)}%` }}></div>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${voucher.is_active ? 'active' : 'inactive'}`}>
                              {voucher.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="actions-cell">
                            <button className="view-details-btn-new" onClick={() => handleViewDetails(voucher)}>
                              <i className="fa-regular fa-eye"></i> View details
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
                    totalItems={filteredVouchers.length}
                    pageSize={PAGE_SIZE}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: REDEEM VOUCHER ══ */}
        {tab === 'redeem' && <RedeemVoucherPanel />}
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
