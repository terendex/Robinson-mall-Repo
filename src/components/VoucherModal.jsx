import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/Modal.css';

/**
 * VoucherModal Component
 * - Campaign selector is required (campaign must precede voucher)
 * - Store selector is optional (store can have multiple vouchers)
 * - Predefined quick-select buttons for discount % and usage limit
 */

const PRESET_DISCOUNTS = [5, 10, 15, 20, 25, 30, 50];
const PRESET_LIMITS    = [100, 500, 1000, 5000];

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
  });

  // Load campaigns + stores for selectors
  useEffect(() => {
    if (!show) return;
    axios.get('http://127.0.0.1:8000/api/campaigns/')
      .then(res => setCampaigns(res.data.filter(c => c.status === 'Active')))
      .catch(err => console.error('Failed to load campaigns:', err));
    axios.get('http://127.0.0.1:8000/api/stores/')
      .then(res => setStores(res.data))
      .catch(err => console.error('Failed to load stores:', err));
  }, [show]);

  useEffect(() => {
    if (voucherToEdit) {
      setFormData({
        name:                voucherToEdit.name || '',
        code:                voucherToEdit.code || '',
        voucher_type:        voucherToEdit.voucher_type || 'Fashion',
        discount_percentage: voucherToEdit.discount_percentage || '',
        usage_limit:         voucherToEdit.usage_limit || '',
        campaign:            voucherToEdit.campaign || '',
        store:               voucherToEdit.store || '',
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
      });
    }
  }, [voucherToEdit, show]);

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
      alert('Please select a Campaign before creating a voucher. Campaigns must be created first.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{readOnly ? 'Voucher Details' : (voucherToEdit ? 'Edit Voucher' : 'Add New Voucher')}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>

          {/* Campaign selector — required on create */}
          {!readOnly && (
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
          )}

          {/* Store selector — optional */}
          <div className="form-group">
            <label>Store (optional)</label>
            {readOnly ? (
              <input
                type="text"
                value={
                  stores.find(s => s.id === Number(formData.store))?.name ||
                  formData.store || '—'
                }
                disabled
              />
            ) : (
              <select name="store" value={formData.store} onChange={handleChange} disabled={readOnly}>
                <option value="">— No specific store —</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
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
              disabled={readOnly}
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
              disabled={readOnly}
            />
          </div>

          {/* Voucher Type */}
          <div className="form-group">
            <label>Voucher Type</label>
            <select name="voucher_type" value={formData.voucher_type} onChange={handleChange} disabled={readOnly}>
              <option value="Fashion">Fashion</option>
              <option value="Food & Beverage">Food &amp; Beverage</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Beauty">Beauty</option>
              <option value="Electronics">Electronics</option>
            </select>
          </div>

          {/* Discount % with quick-select presets */}
          <div className="form-group">
            <label>Discount (%)</label>
            {!readOnly && (
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
            )}
            <input
              type="number"
              name="discount_percentage"
              value={formData.discount_percentage}
              onChange={handleChange}
              placeholder="or enter custom %"
              min="0"
              max="100"
              required
              disabled={readOnly}
            />
          </div>

          {/* Usage Limit with quick-select presets */}
          <div className="form-group">
            <label>Usage Limit</label>
            {!readOnly && (
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
            )}
            <input
              type="number"
              name="usage_limit"
              value={formData.usage_limit}
              onChange={handleChange}
              placeholder="or enter custom limit"
              min="1"
              required
              disabled={readOnly}
            />
          </div>

          {!readOnly && (
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="cancel-inner-btn">Cancel</button>
              <button
                type="submit"
                className="save-btn"
                disabled={!voucherToEdit && campaigns.length === 0}
              >
                {voucherToEdit ? 'Save Changes' : 'Create Voucher'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default VoucherModal;
