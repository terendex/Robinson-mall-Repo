import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../css/Modal.css';
import ErrorModal from './ErrorModal';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────────────
// Combobox: text input + filtered dropdown
// ─────────────────────────────────────────────────────
const Combobox = ({ value, onChange, options, placeholder, getLabel, getValue, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef(null);

  // Sync external value changes
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    getLabel(o).toLowerCase().includes(query.toLowerCase())
  );

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange({ text: e.target.value, item: null });
    setOpen(true);
  };

  const handleSelect = (item) => {
    const label = getLabel(item);
    setQuery(label);
    onChange({ text: label, item });
    setOpen(false);
  };

  return (
    <div className="combobox-wrapper" ref={ref}>
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && !disabled && (
        <div className="combobox-dropdown">
          {filtered.length === 0 ? (
            <div className="combobox-empty">No matches found</div>
          ) : (
            filtered.slice(0, 20).map(item => (
              <div
                key={getValue(item)}
                className="combobox-option"
                onMouseDown={() => handleSelect(item)}
              >
                {getLabel(item)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────
// Display row helper for read-only view
// ─────────────────────────────────────────────────────
const DisplayRow = ({ label, value, wide, highlight, mono }) => (
  <div style={{
    gridColumn: wide ? 'span 2' : 'span 1',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  }}>
    <span style={{
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: '#9e9e9e',
    }}>
      {label}
    </span>
    <span style={{
      fontSize: '14.5px',
      fontWeight: highlight ? '700' : '500',
      color: highlight ? '#c40000' : '#1e293b',
      fontFamily: mono ? "'Courier New', monospace" : 'inherit',
      letterSpacing: mono ? '0.05em' : 'inherit',
      background: mono ? '#f8fafc' : 'transparent',
      padding: mono ? '4px 8px' : '0',
      borderRadius: mono ? '5px' : '0',
      display: 'inline-block',
    }}>
      {value || '—'}
    </span>
  </div>
);

/**
 * VoucherModal Component
 * - Campaign selector is required (campaign must precede voucher)
 * - Store selector is optional (store can have multiple vouchers)
 * - Predefined quick-select buttons for discount % and usage limit
 * - Voucher Type is a free-text input with preset suggestions
 * - readOnly mode shows a styled display view (not disabled inputs)
 */

const PRESET_DISCOUNTS = [5, 10, 15, 20, 25, 30, 50];
const PRESET_LIMITS = [100, 500, 1000, 5000];
// Must match backend VOUCHER_TYPES choices exactly
const VOUCHER_TYPE_PRESETS = [
  'Fashion', 'Food & Beverage', 'Entertainment',
  'Beauty', 'Electronics', 'Sports & Fitness',
  'Home & Living', 'Travel', 'Health & Wellness',
];

const VoucherModal = ({ show, onClose, onSave, voucherToEdit, readOnly }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [stores, setStores]       = useState([]);

  const [formData, setFormData] = useState({
    name:                '',
    code:                '',
    voucher_type:        'Fashion',
    discount_percentage: '',
    usage_limit:         '',
    campaign:            '',
    store:               '',
    store_name:          '',
  });

  const [errorConfig, setErrorConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  // Load campaigns + stores for selectors
  useEffect(() => {
    if (!show) return;
    axios.get(`${BASE}/api/campaigns/`)
      .then(res => setCampaigns(res.data.filter(c => c.status === 'Active')))
      .catch(err => console.error('Failed to load campaigns:', err));
    axios.get(`${BASE}/api/stores/`)
      .then(res => setStores(res.data))
      .catch(err => console.error('Failed to load stores:', err));
  }, [show]);

  useEffect(() => {
    if (voucherToEdit) {
      setFormData({
        name:                voucherToEdit.name                || '',
        code:                voucherToEdit.code                || '',
        voucher_type:        voucherToEdit.voucher_type        || 'Fashion',
        discount_percentage: voucherToEdit.discount_percentage || '',
        usage_limit:         voucherToEdit.usage_limit         || '',
        campaign:            voucherToEdit.campaign            || '',
        store:               voucherToEdit.store               || '',
        store_name:          voucherToEdit.store_display_name  || voucherToEdit.store_name || '',
      });
    } else {
      setFormData({
        name:                '',
        code:                '',
        voucher_type:        'Fashion',
        discount_percentage: '',
        usage_limit:         '',
        campaign:            '',
        store:               '',
        store_name:          '',
      });
    }
  }, [voucherToEdit, show]);

  const isDirty = React.useMemo(() => {
    if (!voucherToEdit) {
      // For NEW: all required fields must be filled
      return !!(
        formData.campaign &&
        formData.name.trim() &&
        formData.code.trim() &&
        formData.voucher_type &&
        formData.discount_percentage &&
        formData.usage_limit
      );
    }
    // For EDIT: any field differing from the saved values enables save
    return (
      formData.name !== (voucherToEdit.name || '') ||
      formData.code !== (voucherToEdit.code || '') ||
      formData.voucher_type !== (voucherToEdit.voucher_type || 'Fashion') ||
      formData.discount_percentage != (voucherToEdit.discount_percentage || '') ||
      formData.usage_limit != (voucherToEdit.usage_limit || '') ||
      formData.campaign != (voucherToEdit.campaign || '') ||
      formData.store != (voucherToEdit.store || '') ||
      formData.store_name != (voucherToEdit.store_display_name || voucherToEdit.store_name || '')
    );
  }, [formData, voucherToEdit]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePresetDiscount = (val) => {
    if (readOnly) return;
    setFormData(prev => ({ ...prev, discount_percentage: val }));
  };

  const handlePresetLimit = (val) => {
    if (readOnly) return;
    setFormData(prev => ({ ...prev, usage_limit: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.campaign && !voucherToEdit) {
      setErrorConfig({
        show: true,
        title: 'Requirement Missing',
        message: 'Please select a Campaign before creating a voucher. Campaigns must be created first.'
      });
      return;
    }
    onSave(formData);
  };

  // ── Read-Only Display View ──────────────────────────
  if (readOnly && voucherToEdit) {
    const storeName = voucherToEdit.store_display_name || voucherToEdit.store_name || '—';
    const campaignName = voucherToEdit.campaign_name || '—';
    const voucherId = `VCH-${String(voucherToEdit.id).padStart(4, '0')}`;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Voucher Details</h2>
            <button className="close-x" onClick={onClose}>&times;</button>
          </div>

          {/* ID banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid #e2e8f0',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voucher ID</span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff', fontFamily: "'Courier New', monospace", letterSpacing: '0.08em' }}>{voucherId}</span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '700',
                background: voucherToEdit.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                color: voucherToEdit.is_active ? '#4ade80' : '#f87171',
                border: `1px solid ${voucherToEdit.is_active ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              }}>
                {voucherToEdit.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <DisplayRow label="Voucher Name" value={voucherToEdit.name} wide />
            <DisplayRow label="Voucher Code" value={voucherToEdit.code} mono />
            <DisplayRow label="Voucher Type" value={voucherToEdit.voucher_type} />
            <DisplayRow label="Campaign" value={campaignName} />
            <DisplayRow label="Store / Branch" value={storeName} />
            <DisplayRow label="Discount" value={`${voucherToEdit.discount_percentage}%`} highlight />
            <DisplayRow
              label="Usage"
              value={`${voucherToEdit.usage_count} used / ${voucherToEdit.usage_limit} limit`}
            />
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', padding: '0 24px 20px' }}>
            <button className="cancel-inner-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create / Edit Form View ─────────────────────────
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{voucherToEdit ? 'Edit Voucher' : 'Add New Voucher'}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>

        {/* Voucher ID display when editing */}
        {voucherToEdit && (
          <div style={{
            margin: '0 0 4px',
            padding: '8px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <i className="fa-solid fa-hashtag" style={{ fontSize: '10px' }}></i>
            Voucher ID:&nbsp;
            <strong style={{ color: '#1e293b', fontFamily: 'monospace' }}>
              VCH-{String(voucherToEdit.id).padStart(4, '0')}
            </strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Campaign selector — required on create */}
          <div className="form-group">
            <label>
              Campaign <span style={{ color: '#c40000' }}>*</span>
              <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '0.4rem' }}>
                (Campaign must exist first)
              </span>
            </label>
            {voucherToEdit ? (
              <input
                type="text"
                value={
                  campaigns.find(c => c.id === Number(formData.campaign))?.name ||
                  formData.campaign || '—'
                }
                disabled
              />
            ) : campaigns.length === 0 ? (
              <div style={{
                padding: '0.6rem 0.9rem',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '6px',
                fontSize: '0.83rem',
                color: '#856404',
              }}>
                ⚠ No active campaigns found. Please create a campaign first.
              </div>
            ) : (
              <select name="campaign" value={formData.campaign} onChange={handleChange} required>
                <option value="">Select a Campaign…</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Store selector — combobox (type + dropdown) */}
          <div className="form-group">
            <label>Store / Branch <span style={{ fontSize: '0.75rem', color: '#888' }}>(optional)</span></label>
            <Combobox
              value={formData.store_name}
              onChange={({ text, item }) =>
                setFormData(prev => ({
                  ...prev,
                  store:      item ? String(item.id) : '',
                  store_name: item ? item.name : text,
                }))
              }
              options={stores}
              placeholder="Type or search store…"
              getLabel={s => s.name}
              getValue={s => s.id}
              disabled={false}
            />
          </div>

          {/* Voucher Name */}
          <div className="form-group">
            <label>Voucher Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. 20% Off Fashion"
              required
            />
          </div>

          {/* Voucher Code */}
          <div className="form-group">
            <label>Voucher Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. DISCOUNT20"
              required
            />
          </div>

          {/* Voucher Type — fixed choices matching backend model */}
          <div className="form-group">
            <label>Voucher Type</label>
            <select
              name="voucher_type"
              value={formData.voucher_type}
              onChange={handleChange}
              required
            >
              {VOUCHER_TYPE_PRESETS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Discount % with quick-select presets */}
          <div className="form-group">
            <label>Discount (%)</label>
            <div className="preset-btn-row">
              {PRESET_DISCOUNTS.map(v => (
                <button
                  key={v}
                  type="button"
                  className={`preset-btn ${Number(formData.discount_percentage) === v ? 'active' : ''}`}
                  onClick={() => handlePresetDiscount(v)}
                >
                  {v}%
                </button>
              ))}
            </div>
            <input
              type="number"
              name="discount_percentage"
              value={formData.discount_percentage}
              onChange={handleChange}
              placeholder="or enter custom %"
              min="0"
              max="100"
              required
            />
          </div>

          {/* Usage Limit with quick-select presets */}
          <div className="form-group">
            <label>Usage Limit</label>
            <div className="preset-btn-row">
              {PRESET_LIMITS.map(v => (
                <button
                  key={v}
                  type="button"
                  className={`preset-btn ${Number(formData.usage_limit) === v ? 'active' : ''}`}
                  onClick={() => handlePresetLimit(v)}
                >
                  {v.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              name="usage_limit"
              value={formData.usage_limit}
              onChange={handleChange}
              placeholder="or enter custom limit"
              min="1"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-inner-btn">Cancel</button>
            <button
              type="submit"
              className="save-btn"
              disabled={!isDirty}
            >
              {voucherToEdit ? 'Save Changes' : 'Create Voucher'}
            </button>
          </div>
        </form>
      </div>
      <ErrorModal 
        {...errorConfig}
        onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default VoucherModal;
