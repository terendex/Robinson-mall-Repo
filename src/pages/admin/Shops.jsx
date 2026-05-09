import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Pagination from '../../components/Pagination';
import '../../css/Shops.css';

/**
 * Shops Page — Admin & Manager
 * Full CRUD for the Store model (name, location).
 */
const PAGE_SIZE = 10;

const Shops = () => {
  const [stores, setStores]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [storeToEdit, setStoreToEdit]   = useState(null);
  const [activeMenu, setActiveMenu]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);
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
        setStores(prev => [data, ...prev]);
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
                          {store.created_at ? new Date(store.created_at).toISOString().split('T')[0] : '—'}
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
