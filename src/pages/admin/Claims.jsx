import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import axios from 'axios';
import ClaimDetailsModal from '../../components/ClaimDetailsModal';
import Pagination from '../../components/Pagination';
import ActionConfirmModal from '../../components/ActionConfirmModal';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import NotificationContext from '../../context/NotificationContext';
import '../../css/Claims.css';
import '../../css/Transactions.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';


/**
 * Claims Component
 * Full CRUD: view details, edit status, approve, reject with reason.
 */
const PAGE_SIZE = 10;

// ISSUE-12 FIX: Format dates in Philippine Standard Time (UTC+8)
const fmtDatePH = (ds) => {
  if (!ds) return '';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ds));
};
const fmtTimePH = (ds) => {
  if (!ds) return '';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(ds));
};

const Claims = () => {
  const { addNotification } = useContext(NotificationContext);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Keys are backend values; labels shown to user are mapped below
  const [statusFilters, setStatusFilters] = useState({ Approved: false, Rejected: false, Pending: false });
  // Display label map
  const STATUS_LABEL = { Pending: 'Not Claimed', Approved: 'Claimed', Rejected: 'Expired' };
  const [amountFilter, setAmountFilter] = useState('All Values');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isAmountDropdownOpen, setIsAmountDropdownOpen] = useState(false);
  const [activeActions, setActiveActions] = useState(null);

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

  const [errorConfig, setErrorConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  // ── Modal state ──────────────────────────────────────────
  const [showViewModal, setShowViewModal]     = useState(false);
  const [selectedClaim, setSelectedClaim]     = useState(null);

  // Edit modal
  const [showEditModal, setShowEditModal]     = useState(false);
  const [editClaim, setEditClaim]             = useState(null);
  const [editStatus, setEditStatus]           = useState('');
  const [editNote, setEditNote]               = useState('');
  const [editLoading, setEditLoading]         = useState(false);

  const [statusLoading, setStatusLoading]     = useState(null);

  // Action menu pos (fixed, escapes overflow clip)
  const [actionMenuPos, setActionMenuPos]     = useState(null);

  const statusFilterRef = useRef(null);
  const amountFilterRef = useRef(null);
  const actionsRef      = useRef(null);

  useEffect(() => { fetchClaims(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(e.target)) setIsStatusDropdownOpen(false);
      if (amountFilterRef.current && !amountFilterRef.current.contains(e.target)) setIsAmountDropdownOpen(false);
      if (actionsRef.current      && !actionsRef.current.contains(e.target))      setActiveActions(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/api/claims/`);
      setClaims(res.data);
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Status helpers ───────────────────────────────────────
  const handleApprove = async (id) => {
    setStatusLoading(id);
    setActiveActions(null);
    try {
      const res = await axios.patch(`${BASE}/api/claims/${id}/`, { status: 'Approved' });
      setClaims(prev => prev.map(c => c.id === id ? res.data : c));
      addNotification({
        title: 'Claim Approved',
        message: 'A voucher has been successfully marked as claimed.',
        type: 'success'
      });
      setSuccessConfig({
        show: true,
        title: 'Claim Confirmed!',
        message: 'The voucher has been successfully marked as claimed.'
      });
    } catch (err) { console.error(err); }
    finally { setStatusLoading(null); }
  };

  const requestApproveConfirm = (claim) => {
    setActiveActions(null);
    setConfirmConfig({
      show: true,
      title: 'Confirm Claim',
      message: `Are you sure you want to mark this voucher as Claimed for ${claim.user_name}?`,
      confirmText: 'Approve',
      variant: 'success',
      onConfirm: () => handleApprove(claim.id)
    });
  };



  // ── View / Edit helpers ──────────────────────────────────
  const openViewModal = (claim) => {
    setSelectedClaim(claim);
    setShowViewModal(true);
    setActiveActions(null);
  };

  const openEditModal = (claim) => {
    setEditClaim(claim);
    setEditStatus(claim.status);
    setEditNote(claim.rejection_reason || '');
    setShowEditModal(true);
    setActiveActions(null);
  };

  const isDirty = useMemo(() => {
    if (!editClaim) return false;
    const currentNote = editNote || '';
    const initialNote = editClaim.rejection_reason || '';
    return editStatus !== editClaim.status || currentNote !== initialNote;
  }, [editClaim, editStatus, editNote]);

  const saveEdit = async () => {
    if (!editClaim) return;
    if (editStatus === 'Rejected' && !editNote.trim()) {
      setErrorConfig({
        show: true,
        title: 'Requirement Missing',
        message: 'Please provide a rejection reason before rejecting this claim.'
      });
      return;
    }
    setEditLoading(true);
    try {
      const payload = { status: editStatus };
      if (editStatus === 'Rejected') payload.rejection_reason = editNote;
      const res = await axios.patch(`${BASE}/api/claims/${editClaim.id}/`, payload);
      setClaims(prev => prev.map(c => c.id === editClaim.id ? res.data : c));
      setShowEditModal(false);
      addNotification({
        title: 'Claim Updated',
        message: 'The claim details have been updated.',
        type: 'info'
      });
      setSuccessConfig({
        show: true,
        title: 'Updated!',
        message: 'The claim details have been updated.'
      });
    } catch (err) { 
      console.error(err); 
      setErrorConfig({
        show: true,
        title: 'Update Failed',
        message: 'The claim record could not be updated. Please try again.'
      });
    }
    finally { setEditLoading(false); }
  };

  const handleDeleteClaim = async (claim) => {
    try {
      await axios.delete(`${BASE}/api/claims/${claim.id}/`);
      setClaims(prev => prev.filter(c => c.id !== claim.id));
      addNotification({
        title: 'Claim Deleted',
        message: 'A claim record has been permanently removed.',
        type: 'warning'
      });
      setSuccessConfig({
        show: true,
        title: 'Claim Deleted',
        message: 'The claim record has been permanently removed.'
      });
    } catch (err) {
      console.error('Error deleting claim:', err);
      setErrorConfig({
        show: true,
        title: 'Action Failed',
        message: 'Failed to delete the claim record. Please check your connection.'
      });
    }
  };

  const requestDeleteClaimConfirm = (claim) => {
    setActiveActions(null);
    setConfirmConfig({
      show: true,
      title: 'Delete Claim Record',
      message: `Are you sure you want to permanently delete this claim record? This action cannot be undone.`,
      confirmText: 'Delete Record',
      variant: 'danger',
      onConfirm: () => handleDeleteClaim(claim)
    });
  };

  const requestEditSaveConfirm = () => {
    setConfirmConfig({
      show: true,
      title: 'Save Changes',
      message: 'Are you sure you want to update this claim record?',
      confirmText: 'Save Changes',
      variant: 'success',
      onConfirm: saveEdit
    });
  };

  // ── Filters ──────────────────────────────────────────────
  const handleFilterToggle = (status) => {
    setStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
    setCurrentPage(1);
  };

  // ISSUE-14 FIX: Remove setCurrentPage side-effect from useMemo
  const filteredClaims = useMemo(() => {
    const anySelected = Object.values(statusFilters).some(v => v);
    return claims.filter(c => {
      const matchesSearch =
        (c.user_name    || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.voucher_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.store_name   || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = anySelected ? statusFilters[c.status] : true;
      const amt = Number(c.amount);
      let matchesAmount = true;
      if      (amountFilter === 'Under P1,000')    matchesAmount = amt < 1000;
      else if (amountFilter === 'P1,000 - P5,000') matchesAmount = amt >= 1000 && amt <= 5000;
      else if (amountFilter === 'Over P5,000')     matchesAmount = amt > 5000;
      return matchesSearch && matchesStatus && matchesAmount;
    });
  }, [claims, searchQuery, statusFilters, amountFilter]);

  // Reset page on filter change (anti-pattern fix: was inside useMemo)
  useEffect(() => { setCurrentPage(1); }, [searchQuery, amountFilter]);

  const totalPages  = Math.ceil(filteredClaims.length / PAGE_SIZE);
  const pagedClaims = filteredClaims.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total:    claims.length,
    claimed:  claims.filter(c => c.status === 'Approved').length,
    notClaimed: claims.filter(c => c.status === 'Pending').length,
  }), [claims]);

  const formatDateTime = (ds) => {
    if (!ds) return '';
    // ISSUE-12 FIX: Use PH timezone (Asia/Manila) instead of raw UTC ISO string
    return <>{fmtDatePH(ds)}<br />{fmtTimePH(ds)}</>;
  };

  // Fixed-position action menu
  const openActionMenu = (e, claimId) => {
    if (activeActions === claimId) { setActiveActions(null); setActionMenuPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });

    setActiveActions(claimId);
  };

  return (
    <div className="claims-page">
      <div className="claims-container">
        <div className="claims-header"><h1>Claims Management</h1></div>

        <div className="txn-stats">
          <div className="txn-stat-card"><div className="stat-title">Total Claims</div><div className="stat-value">{stats.total}</div></div>
          <div className="txn-stat-card"><div className="stat-title">Claimed</div><div className="stat-value">{stats.claimed}</div></div>
          <div className="txn-stat-card"><div className="stat-title">Not Claimed</div><div className="stat-value">{stats.notClaimed}</div></div>
        </div>

        <div className="claim-table-section">
          <div className="claim-table-controls">
            <div className="claim-search-wrapper">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Search by voucher, user, or store"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            <div className="filter-dropdown-container" ref={amountFilterRef}>
              <button className={`filter-button ${isAmountDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsAmountDropdownOpen(!isAmountDropdownOpen)}>
                <i className="fa-solid fa-arrows-up-down"></i> {amountFilter}
              </button>
              {isAmountDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {['All Values', 'Under P1,000', 'P1,000 - P5,000', 'Over P5,000'].map(val => (
                    <div key={val} className="filter-option"
                      onClick={() => { setAmountFilter(val); setIsAmountDropdownOpen(false); setCurrentPage(1); }}>
                      {val === amountFilter && <i className="fa-solid fa-check"></i>}
                      <span style={{ marginLeft: val === amountFilter ? 0 : 28 }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-dropdown-container" ref={statusFilterRef}>
              <button className={`filter-button ${isStatusDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}>
                <i className="fa-solid fa-filter"></i> Filter Status
              </button>
              {isStatusDropdownOpen && (
                <div className="filter-dropdown-menu">
                  {[{ val: 'Approved', lbl: 'Claimed' }, { val: 'Pending', lbl: 'Not Claimed' }, { val: 'Rejected', lbl: 'Expired' }].map(({ val, lbl }) => (
                    <label key={val} className="filter-option">
                      <input type="checkbox" checked={statusFilters[val]}
                        onChange={() => handleFilterToggle(val)} /> {lbl}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="claim-table-wrapper">
            {loading ? (
              <div className="loading-wrap"><i className="fa-solid fa-spinner fa-spin fa-2xl" style={{ color: '#bdbdbd' }}></i></div>
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
                    {pagedClaims.map(claim => (
                      <tr key={claim.id}>
                        <td><span className="receipt-no">{claim.receipt_no || `CLM-${String(claim.id).padStart(4, '0')}`}</span></td>
                        <td>
                          <div className="customer-cell">
                            <span className="customer-name">{claim.user_name || 'Anonymous User'}</span>
                            <span className="customer-phone"><i className="fa-solid fa-phone"></i> {claim.user_phone || 'N/A'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="voucher-cell">
                            <span className="voucher-title">{claim.voucher_name}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                              <span className="voucher-code">{claim.voucher_code}</span>
                              {claim.expiry_date && claim.status !== 'Approved' && (
                                <span style={{ fontSize: '10.5px', color: '#b91c1c', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>
                                  <i className="fa-solid fa-clock" style={{ marginRight: '3px' }}></i>
                                  Expires: {new Date(claim.expiry_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td><span className="store-name">{claim.store_name}</span></td>
                        <td className="amount-cell">
                          ₱{Number(claim.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="date-cell">{formatDateTime(claim.created_at)}</td>
                        <td>
                          <span className={`status-badge ${claim.status === 'Approved' ? 'approved-filled' : claim.status.toLowerCase()}`}>
                            {({ Pending: 'Not Claimed', Approved: 'Claimed', Rejected: 'Expired' })[claim.status] || claim.status}
                          </span>
                        </td>
                        <td className="txn-actions-cell">
                          {statusLoading === claim.id ? (
                            <i className="fa-solid fa-spinner fa-spin" style={{ color: '#c50000' }}></i>
                          ) : (
                            <button className="txn-action-dot-btn" onClick={e => openActionMenu(e, claim.id)}>
                              <i className="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredClaims.length === 0 && (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#9e9e9e' }}>
                        No claims found matching your criteria.
                      </td></tr>
                    )}
                  </tbody>
                </table>
                <Pagination currentPage={currentPage} totalPages={totalPages}
                  onPageChange={setCurrentPage} totalItems={filteredClaims.length} pageSize={PAGE_SIZE} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Fixed action dropdown ── */}
      {activeActions !== null && actionMenuPos && (() => {
        const claim = claims.find(c => c.id === activeActions);
        if (!claim) return null;
        return (
          <div ref={actionsRef} className="txn-action-dropdown"
            style={{ position: 'fixed', top: actionMenuPos.top, right: actionMenuPos.right, zIndex: 9999 }}>
            <button className="txn-action-item" onClick={() => openViewModal(claim)}>
              <i className="fa-regular fa-eye"></i> View Claim Details
            </button>
            <button className="txn-action-item" onClick={() => openEditModal(claim)}>
              <i className="fa-regular fa-pen-to-square"></i> Edit Claim Details
            </button>
            <div className="txn-action-divider"></div>
            {claim.status !== 'Approved' && (
              <button className="txn-action-item txn-action-redeem" onClick={() => requestApproveConfirm(claim)}>
                <i className="fa-solid fa-circle-check"></i> Mark as Claimed
              </button>
            )}

            <div className="txn-action-divider"></div>
            <button 
              className="txn-action-item" 
              onClick={() => requestDeleteClaimConfirm(claim)}
              style={{ color: '#c40000' }}
            >
              <i className="fa-solid fa-trash-can"></i> Delete Claim Record
            </button>
          </div>
        );
      })()}



      {/* ── Edit Claim Modal ── */}
      {showEditModal && editClaim && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Edit Claim</span>
                <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>
                  {editClaim.receipt_no || `CLM-${String(editClaim.id).padStart(4, '0')}`}
                </span>
              </div>
              <button onClick={() => setShowEditModal(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <option value="Pending">Not Claimed</option>
                  <option value="Approved">Claimed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              {editStatus === 'Rejected' && (
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Rejection Reason <span style={{ color: '#c40000' }}>*</span></label>
                  <textarea rows={3} value={editNote} onChange={e => setEditNote(e.target.value)}
                    placeholder="Explain the reason for rejecting this claim…"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #ddd',
                      borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.25rem' }}>
              <button className="cancel-inner-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="save-btn" onClick={requestEditSaveConfirm} disabled={editLoading || !isDirty}>
                {editLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      <ClaimDetailsModal show={showViewModal} onClose={() => setShowViewModal(false)} claim={selectedClaim} />

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
      <ErrorModal 
        {...errorConfig}
        onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default Claims;
