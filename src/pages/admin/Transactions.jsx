import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import TransactionDetailsModal from '../../components/Transactiondetailsmodal';
import TransactionModal from '../../components/Transactionmodal';
import { exportCSV, exportExcel, buildTransactionRows } from '../../utils/exportUtils';
import Pagination from '../../components/Pagination';
import ActionConfirmModal from '../../components/ActionConfirmModal';
import SuccessModal from '../../components/SuccessModal';
import '../../css/Transactions.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ISSUE-12 FIX: Format dates in Philippine Standard Time (UTC+8)
const fmtDatePH = (dateString) => {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(dateString));
};

const fmtTimePH = (dateString) => {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(dateString));
};
const PAGE_SIZE = 10;

const Transactions = () => {
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff';
  const isManager = user.role === 'manager';
  const isCustomer = user.role === 'customer';

  // Admin and Staff have full control. Managers are view-only.
  const canManage = isAdmin || isStaff;
  const isViewOnly = isManager; 

  const [transactions, setTransactions]         = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [searchQuery, setSearchQuery]           = useState('');

  // Filters
  const [timeFilter,           setTimeFilter]           = useState('All Time');
  const [amountFilter,         setAmountFilter]         = useState('All Values');
  const [isTimeDropdownOpen,   setIsTimeDropdownOpen]   = useState(false);
  const [isAmountDropdownOpen, setIsAmountDropdownOpen] = useState(false);

  // Modals
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal,    setShowDetailsModal]    = useState(false);
  const [showFormModal,       setShowFormModal]       = useState(false);
  const [transactionToEdit,   setTransactionToEdit]   = useState(null);

  // Row actions
  const [activeActions, setActiveActions] = useState(null);
  const [currentPage, setCurrentPage]     = useState(1);

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


  // Reject-reason inline modal state
  const [rejectTarget,       setRejectTarget]       = useState(null);  // txn being rejected
  const [rejectReason,       setRejectReason]       = useState('');
  const [showRejectModal,    setShowRejectModal]     = useState(false);
  const [statusLoading,      setStatusLoading]       = useState(null);  // txn id being updated

  // Export dropdown
  const [isExportOpen, setIsExportOpen] = useState(false);

  const timeFilterRef   = useRef(null);
  const amountFilterRef = useRef(null);
  const actionsRef      = useRef(null);
  const exportRef       = useRef(null);

  useEffect(() => { fetchTransactions(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (timeFilterRef.current   && !timeFilterRef.current.contains(e.target))   setIsTimeDropdownOpen(false);
      if (amountFilterRef.current && !amountFilterRef.current.contains(e.target)) setIsAmountDropdownOpen(false);
      if (actionsRef.current      && !actionsRef.current.contains(e.target))      setActiveActions(null);
      if (exportRef.current       && !exportRef.current.contains(e.target))       setIsExportOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE}/api/transactions/`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransaction = async (formData) => {
    try {
      const { receipt_image, ...apiPayload } = formData;
      if (transactionToEdit) {
        const response = await axios.patch(
          `${BASE}/api/transactions/${transactionToEdit.id}/`,
          apiPayload
        );
        setTransactions(transactions.map(t =>
          t.id === transactionToEdit.id
            ? { ...response.data, receipt_image: receipt_image || t.receipt_image }
            : t
        ));
      } else {
        const response = await axios.post(`${BASE}/api/transactions/`, apiPayload);
        setTransactions([{ ...response.data, receipt_image }, ...transactions]);
      }
      setShowFormModal(false);
      setTransactionToEdit(null);
      setSuccessConfig({
        show: true,
        title: transactionToEdit ? 'Updated!' : 'Created!',
        message: `Transaction record has been ${transactionToEdit ? 'updated' : 'recorded'} successfully.`
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
      const errData = error.response?.data;
      const msg =
        (errData?.receipt_no && errData.receipt_no[0]) ||
        (errData?.user_name  && errData.user_name[0])  ||
        errData?.detail ||
        'Error saving transaction. Please check the form and try again.';
      alert(msg);
    }
  };

  const requestSaveConfirm = (formData) => {
    setConfirmConfig({
      show: true,
      title: transactionToEdit ? 'Confirm Edit' : 'Confirm Add',
      message: `Are you sure you want to ${transactionToEdit ? 'update' : 'create'} this transaction record?`,
      confirmText: transactionToEdit ? 'Save Changes' : 'Create Transaction',
      variant: 'success',
      onConfirm: () => handleSaveTransaction(formData)
    });
  };

  const handleDeleteTransaction = async (txnId) => {
    setStatusLoading(txnId);
    setActiveActions(null);
    try {
      await axios.delete(`${BASE}/api/transactions/${txnId}/`);
      setTransactions(prev => prev.filter(t => t.id !== txnId));
      setSuccessConfig({
        show: true,
        title: 'Deleted!',
        message: 'The transaction record has been removed.'
      });
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction.');
    } finally {
      setStatusLoading(null);
    }
  };

  const requestDeleteConfirm = (txn) => {
    setActiveActions(null);
    setConfirmConfig({
      show: true,
      title: 'Delete Transaction',
      message: `Are you sure you want to delete transaction ${txn.transaction_id}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => handleDeleteTransaction(txn.id)
    });
  };

  // ── Status update helpers ──────────────────────────────────────────
  const markApproved = async (txn) => {
    setStatusLoading(txn.id);
    setActiveActions(null);
    try {
      const response = await axios.patch(
        `${BASE}/api/transactions/${txn.id}/update_status/`,
        { status: 'Approved' }
      );
      setTransactions(prev => prev.map(t => t.id === txn.id ? response.data : t));
      setSuccessConfig({
        show: true,
        title: 'Approved!',
        message: `Transaction ${txn.transaction_id} has been approved.`
      });
    } catch (err) {
      console.error('Error marking approved:', err);
      alert(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setStatusLoading(null);
    }
  };

  const requestApproveConfirm = (txn) => {
    setActiveActions(null);
    setConfirmConfig({
      show: true,
      title: 'Approve Transaction',
      message: `Are you sure you want to approve transaction ${txn.transaction_id}?`,
      confirmText: 'Approve',
      variant: 'success',
      onConfirm: () => markApproved(txn)
    });
  };

  const openRejectModal = (txn) => {
    setRejectTarget(txn);
    setRejectReason('');
    setShowRejectModal(true);
    setActiveActions(null);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }
    setStatusLoading(rejectTarget.id);
    setShowRejectModal(false);
    try {
      const response = await axios.patch(
        `${BASE}/api/transactions/${rejectTarget.id}/update_status/`,
        { status: 'Rejected', rejection_reason: rejectReason }
      );
      setTransactions(prev => prev.map(t => t.id === rejectTarget.id ? response.data : t));
      setSuccessConfig({
        show: true,
        title: 'Rejected!',
        message: `Transaction ${rejectTarget.transaction_id} has been rejected.`
      });
    } catch (err) {
      console.error('Error rejecting transaction:', err);
      alert(err.response?.data?.rejection_reason || err.response?.data?.detail || 'Failed to reject.');
    } finally {
      setStatusLoading(null);
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  // ── View / Edit helpers ──────────────────────────────────────────
  const openViewModal = (txn) => {
    setSelectedTransaction(txn);
    setShowDetailsModal(true);
    setActiveActions(null);
  };

  const openEditModal = (txn) => {
    setTransactionToEdit(txn);
    setShowFormModal(true);
    setActiveActions(null);
  };

  const openNewModal = () => {
    setTransactionToEdit(null);
    setShowFormModal(true);
  };

  // ISSUE-14 FIX: Remove side-effect (setCurrentPage) from useMemo — use useEffect instead
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const matchesSearch =
        (t.transaction_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.user_name      || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.store_display_name || t.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.receipt_no     || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.amount?.toString() || '').includes(searchQuery);

      let matchesTime = true;
      if (timeFilter !== 'All Time' && t.created_at) {
        const created  = new Date(t.created_at);
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        if      (timeFilter === 'Today')        matchesTime = diffDays < 1;
        else if (timeFilter === 'Last 7 Days')  matchesTime = diffDays <= 7;
        else if (timeFilter === 'Last 30 Days') matchesTime = diffDays <= 30;
      }

      let matchesAmount = true;
      const amt = Number(t.amount);
      if      (amountFilter === 'Under ₱1,000')     matchesAmount = amt < 1000;
      else if (amountFilter === '₱1,000 – ₱5,000')  matchesAmount = amt >= 1000 && amt <= 5000;
      else if (amountFilter === 'Over ₱5,000')       matchesAmount = amt > 5000;

      return matchesSearch && matchesTime && matchesAmount;
    });
  }, [transactions, searchQuery, timeFilter, amountFilter]);

  // Reset to page 1 whenever any filter changes (extracted from useMemo — fixes anti-pattern)
  useEffect(() => { setCurrentPage(1); }, [searchQuery, timeFilter, amountFilter]);


  // Pagination slice
  const totalPages           = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const pagedTransactions    = filteredTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '—';
    return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalQR:  transactions.length,
    approved: transactions.filter(t => t.status === 'Approved').length,
    pending:  transactions.filter(t => t.status === 'Pending').length,
    rejected: transactions.filter(t => t.status === 'Rejected').length,
  }), [transactions]);

  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    // ISSUE-12 FIX: Use PH timezone instead of raw ISO string (UTC)
    return (
      <>
        {fmtDatePH(dateString)}<br />
        {fmtTimePH(dateString)}
      </>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // ISSUE-12 FIX: Display in PH timezone
    return fmtDatePH(dateString);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Approved': return 'approved-filled'; 
      case 'Pending':  return 'pending';
      case 'Rejected': return 'rejected';
      case 'Expired':  return 'expired';
      default:         return '';
    }
  };

  // ── Fixed-position action dropdown (escapes overflow:auto clipping) ──
  const [actionMenuPos, setActionMenuPos] = useState(null);

  const openActionMenu = (e, txnId) => {
    if (activeActions === txnId) {
      setActiveActions(null);
      setActionMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenuPos({
      top:   rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setActiveActions(txnId);
  };

  return (
    <div className="transactions-page">
      <div className="transactions-container">

        {/* ── Header ── */}
        <div className="transactions-header">
          <h1>{isCustomer ? 'My Transactions' : 'Transaction History'}</h1>
          <div className="txn-header-actions">

            {/* Export dropdown */}
            <div className="txn-export-wrap" ref={exportRef}>
              <button
                id="txn-export-btn"
                className={`export-report-btn ${isExportOpen ? 'active' : ''}`}
                onClick={() => setIsExportOpen(o => !o)}
              >
                <i className="fa-solid fa-file-arrow-down"></i>
                Export
                <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.7rem', opacity: 0.6 }}></i>
              </button>
              {isExportOpen && (
                <div className="txn-export-dropdown">
                  <button
                    className="txn-export-item"
                    onClick={() => {
                      exportCSV(buildTransactionRows(filteredTransactions), `transactions-${new Date().toISOString().slice(0,10)}.csv`);
                      setIsExportOpen(false);
                    }}
                  >
                    <i className="fa-solid fa-file-csv" style={{ color: '#22c55e' }}></i>
                    Download as CSV
                  </button>
                  <button
                    className="txn-export-item"
                    onClick={() => {
                      exportExcel(buildTransactionRows(filteredTransactions), 'Transactions', `transactions-${new Date().toISOString().slice(0,10)}.xlsx`);
                      setIsExportOpen(false);
                    }}
                  >
                    <i className="fa-solid fa-file-excel" style={{ color: '#16a34a' }}></i>
                    Download as Excel
                  </button>
                </div>
              )}
            </div>

            {/* BUG-02 FIX: Only staff/admin can create transactions.
                Customers must use the Claims flow (submit claim → staff scans QR).
                Manager is view-only but can still add transactions if needed. */}
            {(canManage || isManager) && (
              <button className="new-transaction-btn" onClick={openNewModal}>
                <i className="fa-solid fa-plus"></i> New Transaction
              </button>
            )}
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="txn-stats">
          <div className="txn-stat-card">
            <div className="stat-title">TOTAL TRANSACTIONS</div>
            <div className="stat-value">{stats.totalQR}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">APPROVED</div>
            <div className="stat-value">{stats.approved}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">PENDING</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
          <div className="txn-stat-card txn-stat-card--rejected">
            <div className="stat-title">REJECTED</div>
            <div className="stat-value">{stats.rejected}</div>
          </div>
        </div>

        {/* ── Table Section ── */}
        <div className="txn-table-section">
          <div className="txn-table-controls">

            {/* Search */}
            <div className="txn-search-wrapper">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                placeholder="Search by customer, store, or receipt number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Time Filter */}
            <div className="txn-filter-container" ref={timeFilterRef}>
              <button
                className={`txn-filter-btn ${isTimeDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
              >
                <i className="fa-regular fa-calendar"></i> {timeFilter}
              </button>
              {isTimeDropdownOpen && (
                <div className="txn-filter-dropdown">
                  {['All Time', 'Today', 'Last 7 Days', 'Last 30 Days'].map(val => (
                    <div
                      key={val}
                      className={`txn-filter-option ${timeFilter === val ? 'selected' : ''}`}
                      onClick={() => { setTimeFilter(val); setIsTimeDropdownOpen(false); }}
                    >
                      {timeFilter === val && <i className="fa-solid fa-check"></i>}
                      <span style={{ marginLeft: timeFilter === val ? 0 : 20 }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Filter */}
            <div className="txn-filter-container" ref={amountFilterRef}>
              <button
                className={`txn-filter-btn ${isAmountDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsAmountDropdownOpen(!isAmountDropdownOpen)}
              >
                <i className="fa-solid fa-arrows-up-down"></i> {amountFilter}
              </button>
              {isAmountDropdownOpen && (
                <div className="txn-filter-dropdown">
                  {['All Values', 'Under ₱1,000', '₱1,000 – ₱5,000', 'Over ₱5,000'].map(val => (
                    <div
                      key={val}
                      className={`txn-filter-option ${amountFilter === val ? 'selected' : ''}`}
                      onClick={() => { setAmountFilter(val); setIsAmountDropdownOpen(false); }}
                    >
                      {amountFilter === val && <i className="fa-solid fa-check"></i>}
                      <span style={{ marginLeft: amountFilter === val ? 0 : 20 }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Table ── */}
          <div className="txn-table-wrapper">
            {loading ? (
              <div className="txn-loading">
                <i className="fa-solid fa-spinner fa-spin fa-2xl" style={{ color: '#bdbdbd' }}></i>
              </div>
            ) : (
              <>
                <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Store / Amount</th>
                    <th>SI No.</th>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTransactions.length > 0 ? (
                    pagedTransactions.map((txn) => (
                      <tr key={txn.id}>

                        {/* Transaction ID */}
                        <td>
                          <div className="txn-id-cell">
                            <span className="txn-id-short">
                              {txn.transaction_id_short || txn.transaction_id || `TXN-${txn.id}`}
                            </span>
                            <span className="txn-id-full">{txn.transaction_id || ''}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="txn-customer-cell">
                          <div className="user-info">
                            <div className="user-avatar" style={{ backgroundColor: '#555' }}>
                              {getInitials(txn.user_name)}
                            </div>
                            <div className="user-details">
                              <span className="user-name">{txn.user_name || 'Anonymous'}</span>
                              <span className="user-email">{txn.voucher_code ? `Code: ${txn.voucher_code}` : 'Customer'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Store / Amount */}
                        <td>
                          <div className="txn-voucher-cell">
                            <span className="txn-voucher-name">
                              {txn.store_display_name || txn.store_name || '—'}
                            </span>
                            {txn.amount ? (
                              <span style={{ fontSize: '0.75rem', color: '#c50000', fontWeight: 600 }}>
                                {formatAmount(txn.amount)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* SI No. */}
                        <td className="txn-date-cell">
                          {txn.receipt_no || '—'}
                        </td>

                        {/* Timestamp */}
                        <td className="txn-date-cell">{formatTimestamp(txn.created_at)}</td>

                        {/* Status */}
                        <td>
                          <span className={`txn-status-badge ${getStatusClass(txn.status)}`}>
                            {txn.status}
                          </span>
                        </td>

                        {/* Actions — button positioned fixed so it escapes overflow:auto */}
                        <td className="txn-actions-cell">
                          {statusLoading === txn.id ? (
                            <i className="fa-solid fa-spinner fa-spin" style={{ color: '#c50000' }}></i>
                          ) : (
                            <button
                              className="txn-action-dot-btn"
                              onClick={(e) => openActionMenu(e, txn.id)}
                            >
                              <i className="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="txn-empty-row">
                        No transactions found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredTransactions.length}
                pageSize={PAGE_SIZE}
              />
            </>
            )}
          </div>
        </div>
      </div>

      {/* ── Fixed-position action dropdown (portal-like, escapes overflow clip) ── */}
      {activeActions !== null && actionMenuPos && (() => {
        const txn = transactions.find(t => t.id === activeActions);
        if (!txn) return null;
        return (
          <div
            ref={actionsRef}
            className="txn-action-dropdown"
            style={{
              position: 'fixed',
              top:   actionMenuPos.top,
              right: actionMenuPos.right,
              zIndex: 9999,
            }}
          >
            {/* View details — always */}
            <button className="txn-action-item" onClick={() => openViewModal(txn)}>
              <i className="fa-regular fa-eye"></i> View Details
            </button>

            {/* Edit — non-view-only and not customer */}
            {canManage && (
              <button className="txn-action-item" onClick={() => openEditModal(txn)}>
                <i className="fa-regular fa-pen-to-square"></i> Edit Transaction
              </button>
            )}

            {/* Status actions — Pending only */}
            {canManage && txn.status === 'Pending' && (
              <>
                <div className="txn-action-divider"></div>
                <button
                   className="txn-action-item txn-action-redeem"
                   onClick={() => requestApproveConfirm(txn)}
                 >
                   <i className="fa-solid fa-circle-check"></i> Mark as Approved
                 </button>
                <button
                  className="txn-action-item txn-action-reject"
                  onClick={() => openRejectModal(txn)}
                >
                  <i className="fa-solid fa-circle-xmark"></i> Mark as Rejected
                </button>
              </>
            )}

            {/* Delete — Admin/Staff only */}
            {canManage && (
              <>
                <div className="txn-action-divider"></div>
                <button 
                   className="txn-action-item txn-action-reject" 
                   onClick={() => requestDeleteConfirm(txn)}
                   style={{ color: '#c40000' }}
                 >
                   <i className="fa-regular fa-trash-can"></i> Delete Transaction
                 </button>
              </>
            )}
          </div>
        );
      })()}

      {/* ── Reject Reason Modal ── */}
      {showRejectModal && rejectTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Reject Transaction</h2>
              <button className="close-x" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>&times;</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#555' }}>
                Transaction: <strong>{rejectTarget.transaction_id}</strong>
              </p>
              <p style={{ margin: '0 0 1rem', fontSize: '0.87rem', color: '#888' }}>
                Customer: {rejectTarget.user_name || 'Anonymous'}
              </p>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>
                  Rejection Reason <span style={{ color: '#c40000' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this transaction is being rejected…"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1.5px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.25rem' }}>
              <button
                className="cancel-inner-btn"
                onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}
              >
                Cancel
              </button>
              <button
                className="save-btn"
                style={{ background: '#c40000' }}
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
              >
                <i className="fa-solid fa-circle-xmark"></i> Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionDetailsModal
        show={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedTransaction(null); }}
        transaction={selectedTransaction}
      />

      <TransactionModal
        show={showFormModal}
        onClose={() => { setShowFormModal(false); setTransactionToEdit(null); }}
        onSave={requestSaveConfirm}
        transactionToEdit={transactionToEdit}
      />

      <ActionConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(p => ({ ...p, show: false }))}
      />

      <SuccessModal 
        {...successConfig}
        onClose={() => {
          setSuccessConfig(p => ({ ...p, show: false }));
          if (successConfig.onClose) successConfig.onClose();
        }}
      />
    </div>
  );
};

export default Transactions;