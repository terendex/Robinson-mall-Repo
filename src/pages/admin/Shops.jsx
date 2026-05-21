import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import Pagination from '../../components/Pagination';
import ActionConfirmModal from '../../components/ActionConfirmModal';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import NotificationContext from '../../context/NotificationContext';
import '../../css/Shops.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';


/**
 * Shops Page — Admin & Manager
 * Full CRUD for the Store model (name, location).
 */
const PAGE_SIZE = 10;

const Shops = () => {
  const { addNotification } = useContext(NotificationContext);
  const [stores, setStores]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [storeToEdit, setStoreToEdit]   = useState(null);
  const [activeMenu, setActiveMenu]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);
  
  // Confirmation Modal State
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
  const menuRef = useRef(null);

  const [form, setForm] = useState({ name: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const isDirty = React.useMemo(() => {
    if (!storeToEdit) {
      return !!form.name.trim();
    }
    return form.name !== storeToEdit.name || form.location !== (storeToEdit.location || '');
  }, [form, storeToEdit]);

  useEffect(() => { fetchStores(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${BASE}/api/stores/`);
      setStores(data);
    } catch (err) {
      console.error('Failed to fetch stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setStoreToEdit(null);
    setForm({ name: '', location: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (store) => {
    setStoreToEdit(store);
    setForm({ name: store.name, location: store.location || '' });
    setFormError('');
    setShowModal(true);
    setActiveMenu(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Store name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (storeToEdit) {
        const { data } = await axios.patch(
          `${BASE}/api/stores/${storeToEdit.id}/`,
          form
        );
        setStores(prev => prev.map(s => s.id === storeToEdit.id ? data : s));
      } else {
        const { data } = await axios.post(`${BASE}/api/stores/`, form);
        setStores(prev => [data, ...prev]);
      }
      setShowModal(false);
      addNotification({
        title: storeToEdit ? 'Store Updated' : 'Store Added',
        message: `Store "${form.name}" has been ${storeToEdit ? 'updated' : 'added'}.`,
        type: 'success'
      });
      setSuccessConfig({
        show: true,
        title: storeToEdit ? 'Updated!' : 'Created!',
        message: `Store "${form.name}" has been ${storeToEdit ? 'updated' : 'added'} successfully.`
      });
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to save store.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const requestSaveConfirm = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Store name is required.'); return; }
    
    setConfirmConfig({
      show: true,
      title: storeToEdit ? 'Confirm Edit' : 'Confirm Add',
      message: `Are you sure you want to ${storeToEdit ? 'update' : 'add'} this store?`,
      confirmText: storeToEdit ? 'Save Changes' : 'Create Store',
      variant: 'success',
      onConfirm: () => handleSave(e)
    });
  };

  const handleDelete = async (store) => {
    try {
      await axios.delete(`${BASE}/api/stores/${store.id}/`);
      setStores(prev => prev.filter(s => s.id !== store.id));
      addNotification({
        title: 'Store Deleted',
        message: `Store "${store.name}" has been removed.`,
        type: 'warning'
      });
      setSuccessConfig({
        show: true,
        title: 'Deleted!',
        message: `Store "${store.name}" has been removed.`
      });
    } catch (err) {
      console.error('Failed to delete store:', err);
      setErrorConfig({
        show: true,
        title: 'Action Failed',
        message: 'The store could not be deleted. It may be linked to active vouchers or campaigns.'
      });
    }
  };

  const requestDeleteConfirm = (store) => {
    setActiveMenu(null);
    setConfirmConfig({
      show: true,
      title: 'Delete Store',
      message: `Are you sure you want to delete "${store.name}"? This action cannot be undone and will affect associated vouchers.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => handleDelete(store)
    });
  };

  const filtered = stores.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset to page 1 on search
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Pagination
  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedStores  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="shops-page">
      <div className="shops-container">

        {/* ── Header ── */}
        <div className="shops-header">
          <h1>Shops & Stores</h1>
          <button className="add-shop-btn" onClick={openCreate}>
            <i className="fa-solid fa-plus"></i> Add Store
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="shops-stats">
          <div className="shop-stat-card">
            <div className="stat-title">TOTAL STORES</div>
            <div className="stat-value">{stores.length}</div>
          </div>
          <div className="shop-stat-card">
            <div className="stat-title">TOTAL VOUCHERS ASSIGNED</div>
            <div className="stat-value">
              {stores.reduce((sum, s) => sum + (s.voucher_count || 0), 0)}
            </div>
          </div>
        </div>

        {/* ── Table Section ── */}
        <div className="shop-list-section">
          <div className="shop-table-controls">
            <div className="shop-search-wrapper">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                placeholder="Search stores by name or location…"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <div className="shop-table-wrapper">
            {loading ? (
              <div className="shop-loading">
                <i className="fa-solid fa-spinner fa-spin fa-2xl" style={{ color: '#bdbdbd' }}></i>
              </div>
            ) : (
              <>
                <table className="shops-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Store Name</th>
                      <th>Location</th>
                      <th>Vouchers</th>
                      <th>Date Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedStores.length > 0 ? pagedStores.map((store, idx) => (
                      <tr key={store.id}>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="store-name" style={{ textAlign: 'left', color: '#1a1a1a' }}>{store.name}</td>
                        <td style={{ color: '#64748b' }}>{store.location || '—'}</td>
                        <td>
                          <span className="vouchers-badge">{store.voucher_count ?? 0} Vouchers</span>
                        </td>
                        <td>
                          {store.created_at ? (() => {
                            const d = new Date(store.created_at);
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          })() : '—'}
                        </td>
                        <td
                          className="shop-actions-cell"
                          ref={activeMenu === store.id ? menuRef : null}
                        >
                          <button
                            className="shop-action-dot-btn"
                            onClick={() => setActiveMenu(activeMenu === store.id ? null : store.id)}
                          >
                            <i className="fa-solid fa-ellipsis-vertical"></i>
                          </button>
                          {activeMenu === store.id && (
                            <div className="shop-action-dropdown">
                              <button className="shop-action-item" onClick={() => openEdit(store)}>
                                <i className="fa-regular fa-pen-to-square"></i> Edit
                              </button>
                              <div className="shop-action-divider"></div>
                              <button
                                className="shop-action-item delete"
                                onClick={() => requestDeleteConfirm(store)}
                              >
                                <i className="fa-solid fa-trash"></i> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="shop-empty-row">
                          No stores found. Click "Add Store" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filtered.length}
                  pageSize={PAGE_SIZE}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>{storeToEdit ? 'Edit Store' : 'Add New Store'}</h2>
              <button className="close-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={requestSaveConfirm} style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
              {formError && (
                <div style={{
                  padding: '0.6rem 0.9rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  color: '#b91c1c',
                  marginBottom: '1rem',
                }}>
                  {formError}
                </div>
              )}
              <div className="form-group">
                <label>Store Name <span style={{ color: '#c40000' }}>*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Robinsons Department Store – Galleria"
                  required
                />
              </div>
              <div className="form-group">
                <label>Location / Branch</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. 3F, Robinsons Galleria, Ortigas"
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="cancel-inner-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={saving || !isDirty}>
                  {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : null}
                  {storeToEdit ? ' Save Changes' : ' Add Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Action Confirm Modal ── */}
      <ActionConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(p => ({ ...p, show: false }))}
      />

      {/* ── Success Modal ── */}
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

export default Shops;
