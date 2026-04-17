import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import TransactionDetailsModal from '../../components/Transactiondetailsmodal';
import TransactionModal from '../../components/Transactionmodal';
import '../../css/Transactions.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [timeFilter, setTimeFilter] = useState('All Time');
  const [amountFilter, setAmountFilter] = useState('All Values');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isAmountDropdownOpen, setIsAmountDropdownOpen] = useState(false);

  // Modals
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  // Row actions
  const [activeActions, setActiveActions] = useState(null);

  const timeFilterRef = useRef(null);
  const amountFilterRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (timeFilterRef.current && !timeFilterRef.current.contains(e.target))
        setIsTimeDropdownOpen(false);
      if (amountFilterRef.current && !amountFilterRef.current.contains(e.target))
        setIsAmountDropdownOpen(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target))
        setActiveActions(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/transactions/');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransaction = async (formData) => {
    try {
      if (transactionToEdit) {
        const response = await axios.patch(
          `http://127.0.0.1:8000/api/transactions/${transactionToEdit.id}/`,
          formData
        );
        setTransactions(transactions.map(t =>
          t.id === transactionToEdit.id ? response.data : t
        ));
      } else {
        const response = await axios.post('http://127.0.0.1:8000/api/transactions/', formData);
        setTransactions([...transactions, response.data]);
      }
      setShowFormModal(false);
      setTransactionToEdit(null);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error saving transaction.');
    }
  };

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

  // ── Filtering ──
  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter((t) => {
      const matchesSearch =
        (t.transaction_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.receipt_no || '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchesTime = true;
      if (timeFilter !== 'All Time' && t.created_at) {
        const created = new Date(t.created_at);
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        if (timeFilter === 'Today') matchesTime = diffDays < 1;
        else if (timeFilter === 'Last 7 Days') matchesTime = diffDays <= 7;
        else if (timeFilter === 'Last 30 Days') matchesTime = diffDays <= 30;
      }

      let matchesAmount = true;
      const amt = Number(t.amount);
      if (amountFilter === 'Under ₱1,000') matchesAmount = amt < 1000;
      else if (amountFilter === '₱1,000 – ₱5,000') matchesAmount = amt >= 1000 && amt <= 5000;
      else if (amountFilter === 'Over ₱5,000') matchesAmount = amt > 5000;

      return matchesSearch && matchesTime && matchesAmount;
    });
  }, [transactions, searchQuery, timeFilter, amountFilter]);

  // ── Stats ──
  const stats = useMemo(() => ({
    totalQR:  transactions.length,
    redeemed: transactions.filter(t => t.status === 'Redeemed').length,
    pending:  transactions.filter(t => t.status === 'Pending').length,
    expired:  transactions.filter(t => t.status === 'Expired').length,
  }), [transactions]);

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return (
      <>
        {d.toISOString().split('T')[0]}<br />
        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Redeemed': return 'redeemed';
      case 'Pending':  return 'pending';
      case 'Expired':  return 'expired';
      default:         return '';
    }
  };

  return (
    <div className="transactions-page">
      <div className="transactions-container">

        {/* ── Header ── */}
        <div className="transactions-header">
          <h1>Transaction History</h1>
          <div className="txn-header-actions">
            <button className="export-report-btn">
              <i className="fa-solid fa-file-arrow-down"></i> Export Report
            </button>
            <button className="new-transaction-btn" onClick={openNewModal}>
              <i className="fa-solid fa-plus"></i> New Transaction
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="txn-stats">
          <div className="txn-stat-card">
            <div className="stat-title">TOTAL QR GENERATED</div>
            <div className="stat-value">{stats.totalQR}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">REDEEMED VOUCHERS</div>
            <div className="stat-value">{stats.redeemed}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">PENDING</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">EXPIRED VOUCHERS</div>
            <div className="stat-value">{stats.expired}</div>
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
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Voucher</th>
                    <th>Timestamp</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((txn) => (
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
                        <td className="txn-customer-name">
                          {txn.user_name || 'Anonymous'}
                        </td>

                        {/* Voucher */}
                        <td>
                          <div className="txn-voucher-cell">
                            <span className="txn-voucher-name">{txn.voucher_name || '—'}</span>
                            <span className="txn-voucher-code">{txn.voucher_code || ''}</span>
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="txn-date-cell">{formatTimestamp(txn.created_at)}</td>

                        {/* Expiry Date */}
                        <td className="txn-expiry-cell">{formatDate(txn.expiry_date)}</td>

                        {/* Status */}
                        <td>
                          <span className={`txn-status-badge ${getStatusClass(txn.status)}`}>
                            {txn.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="txn-actions-cell"
                          ref={activeActions === txn.id ? actionsRef : null}
                        >
                          <button
                            className="txn-action-dot-btn"
                            onClick={() =>
                              setActiveActions(activeActions === txn.id ? null : txn.id)
                            }
                          >
                            <i className="fa-solid fa-ellipsis"></i>
                          </button>
                          {activeActions === txn.id && (
                            <div className="txn-action-dropdown">
                              <button
                                className="txn-action-item"
                                onClick={() => openViewModal(txn)}
                              >
                                <i className="fa-regular fa-eye"></i> View Transaction Details
                              </button>
                              <button
                                className="txn-action-item"
                                onClick={() => openEditModal(txn)}
                              >
                                <i className="fa-regular fa-pen-to-square"></i> Edit Transaction Details
                              </button>
                            </div>
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
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <TransactionDetailsModal
        show={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedTransaction(null); }}
        transaction={selectedTransaction}
      />

      <TransactionModal
        show={showFormModal}
        onClose={() => { setShowFormModal(false); setTransactionToEdit(null); }}
        onSave={handleSaveTransaction}
        transactionToEdit={transactionToEdit}
      />
    </div>
  );
};

export default Transactions;