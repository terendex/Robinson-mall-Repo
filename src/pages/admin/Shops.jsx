import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../css/Transactions.css';
import '../../css/Vouchers.css';

/**
 * Shops Page — Admin & Manager
 * Full CRUD for the Store model (name, location).
 */
const Shops = () => {
  const [stores, setStores]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [storeToEdit, setStoreToEdit]   = useState(null);
  const [activeMenu, setActiveMenu]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const menuRef = useRef(null);

  const [form, setForm] = useState({ name: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
      const { data } = await axios.get('http://127.0.0.1:8000/api/stores/');
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
          `http://127.0.0.1:8000/api/stores/${storeToEdit.id}/`,
          form
        );
        setStores(prev => prev.map(s => s.id === storeToEdit.id ? data : s));
      } else {
        const { data } = await axios.post('http://127.0.0.1:8000/api/stores/', form);
        setStores(prev => [...prev, data]);
      }
      setShowModal(false);
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to save store.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/stores/${deleteTarget.id}/`);
      setStores(prev => prev.filter(s => s.id !== deleteTarget.id));
    } catch (err) {
      alert('Failed to delete store.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = stores.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="transactions-page">
      <div className="transactions-container">

        {/* ── Header ── */}
        <div className="transactions-header">
          <h1>Shops &amp; Stores</h1>
          <button className="new-transaction-btn" onClick={openCreate}>
            <i className="fa-solid fa-plus"></i> Add Store
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="txn-stats">
          <div className="txn-stat-card">
            <div className="stat-title">TOTAL STORES</div>
            <div className="stat-value">{stores.length}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">TOTAL VOUCHERS ASSIGNED</div>
            <div className="stat-value">
              {stores.reduce((sum, s) => sum + (s.voucher_count || 0), 0)}
            </div>
          </div>
        </div>

        {/* ── Table Section ── */}
        <div className="txn-table-section">
          <div className="txn-table-controls">
            <div className="txn-search-wrapper">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                placeholder="Search stores by name or location…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="txn-table-wrapper">
            {loading ? (
              <div className="txn-loading">
                <i className="fa-solid fa-spinner fa-spin fa-2xl" style={{ color: '#bdbdbd' }}></i>
              </div>
            ) : (
              <table className="transactions-table">
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
                  {filtered.length > 0 ? filtered.map((store, idx) => (
                    <tr key={store.id}>
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td className="txn-customer-name">{store.name}</td>
                      <td style={{ color: '#64748b' }}>{store.location || '—'}</td>
                      <td>
                        <span className="voucher-count-badge">{store.voucher_count ?? 0}</span>
                      </td>
                      <td className="txn-date-cell">
                        {store.created_at ? new Date(store.created_at).toISOString().split('T')[0] : '—'}
                      </td>
                      <td
                        className="txn-actions-cell"
                        ref={activeMenu === store.id ? menuRef : null}
                      >
                        <button
                          className="txn-action-dot-btn"
                          onClick={() => setActiveMenu(activeMenu === store.id ? null : store.id)}
                        >
                          <i className="fa-solid fa-ellipsis"></i>
                        </button>
                        {activeMenu === store.id && (
                          <div className="txn-action-dropdown">
                            <button className="txn-action-item" onClick={() => openEdit(store)}>
                              <i className="fa-regular fa-pen-to-square"></i> Edit
                            </button>
                            <div className="txn-action-divider"></div>
                            <button
                              className="txn-action-item txn-action-reject"
                              onClick={() => { setDeleteTarget(store); setActiveMenu(null); }}
                            >
                              <i className="fa-solid fa-trash"></i> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="txn-empty-row">
                        No stores found. Click "Add Store" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
            <form onSubmit={handleSave} style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
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
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : null}
                  {storeToEdit ? ' Save Changes' : ' Add Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Delete Store</h2>
              <button className="close-x" onClick={() => setDeleteTarget(null)}>&times;</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ margin: '0 0 0.5rem', color: '#334155' }}>
                Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '0.83rem', color: '#94a3b8' }}>
                This will unlink it from any associated vouchers and transactions.
              </p>
            </div>
            <div className="modal-actions" style={{ padding: '0 1.5rem 1.25rem' }}>
              <button className="cancel-inner-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="save-btn"
                style={{ background: '#c40000' }}
                onClick={handleDelete}
              >
                <i className="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shops;
