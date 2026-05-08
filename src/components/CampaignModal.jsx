import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/Modal.css';

/**
 * CampaignModal Component
 * - On CREATE: status is always forced to Active by the backend; not shown in form
 * - reach is editable; conversions is read-only (auto-computed from transactions)
 * - Shows list of attached vouchers in edit mode
 */
const CampaignModal = ({ show, onClose, onSave, campaignToEdit }) => {
  const today = new Date().toISOString().split('T')[0];  // 'YYYY-MM-DD'

  const [formData, setFormData] = useState({
    name:       '',
    budget:     '',
    start_date: '',
    end_date:   '',
  });

  const [dateError, setDateError] = useState('');
  const [attachedVouchers, setAttachedVouchers] = useState([]);

  useEffect(() => {
    if (campaignToEdit) {
      setFormData({
        name:       campaignToEdit.name       || '',
        budget:     campaignToEdit.budget     || '',
        start_date: campaignToEdit.start_date || '',
        end_date:   campaignToEdit.end_date   || '',
        status:     campaignToEdit.status     || 'Active',
        // reach & conversions are display-only, not in editable payload
        reach:       campaignToEdit.reach       ?? 0,
        conversions: campaignToEdit.conversions ?? 0,
      });
      setAttachedVouchers(campaignToEdit.vouchers || []);
    } else {
      setFormData({
        name:       '',
        budget:     '',
        start_date: '',
        end_date:   '',
      });
      setAttachedVouchers([]);
    }
    setDateError('');
  }, [campaignToEdit, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'start_date') {
      setDateError(value < today ? 'Start date cannot be in the past.' : '');
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.start_date && formData.start_date < today) {
      setDateError('Start date cannot be in the past.');
      return;
    }
    // Strip computed/display-only fields — backend calculates reach & conversions
    const { conversions, reach, status, ...payload } = formData;
    onSave(payload);
  };

  // Derive the status that the backend will assign based on chosen start_date
  const previewStatus = formData.start_date
    ? (formData.start_date <= today ? 'Active' : 'Scheduled')
    : 'Active';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{campaignToEdit ? 'Edit Campaign' : 'Add New Campaign'}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>

          {/* Campaign Name */}
          <div className="form-group">
            <label>Campaign Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Summer Sale 2026"
              required
            />
          </div>

          {/* Dates */}
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                min={today}
                required
              />
              {dateError && (
                <p style={{ color: '#c40000', fontSize: '0.78rem', margin: '0.3rem 0 0' }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.3rem' }}></i>
                  {dateError}
                </p>
              )}
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                min={formData.start_date || today}
                required
              />
            </div>
          </div>

          {/* Reach + Conversions — read-only in edit mode (computed by backend) */}
          {campaignToEdit && (
            <div className="form-row">
              <div className="form-group">
                <label>
                  Reach
                  <span style={{ fontSize: '0.72rem', color: '#15803d', marginLeft: '0.35rem', fontWeight: 600 }}>
                    (auto — total Claims)
                  </span>
                </label>
                <input
                  type="number"
                  value={formData.reach ?? 0}
                  disabled
                  style={{ background: '#f0fdf4', cursor: 'not-allowed', opacity: 0.8, color: '#15803d', fontWeight: 700 }}
                />
              </div>
              <div className="form-group">
                <label>
                  Conversions
                  <span style={{ fontSize: '0.72rem', color: '#888', marginLeft: '0.35rem' }}>
                    (auto — Approved txns)
                  </span>
                </label>
                <input
                  type="number"
                  value={formData.conversions ?? 0}
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed', opacity: 0.7 }}
                />
              </div>
            </div>
          )}

          {/* Budget */}
          <div className="form-group">
            <label>Budget (₱)</label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              placeholder="50000"
              min="0"
              required
            />
          </div>

          {/* Status — only shown on edit (read-only display, not a selector) */}
          {campaignToEdit && (
            <div className="form-group">
              <label>Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`status-badge-new ${(formData.status || 'active').toLowerCase()}`}>
                  {formData.status || 'Active'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#888' }}>
                  (status is managed automatically)
                </span>
              </div>
              {/* Hidden status field so it is included in the patch payload */}
              <input type="hidden" name="status" value={formData.status || 'Active'} />
            </div>
          )}

          {/* Attached vouchers — edit mode only */}
          {campaignToEdit && attachedVouchers.length > 0 && (
            <div className="form-group">
              <label>
                Attached Vouchers
                <span style={{ fontSize: '0.72rem', color: '#888', marginLeft: '0.35rem' }}>
                  ({attachedVouchers.length})
                </span>
              </label>
              <div className="campaign-voucher-list">
                {attachedVouchers.map(v => (
                  <div key={v.id} className="campaign-voucher-item">
                    <span className="campaign-voucher-name">{v.name}</span>
                    <span className="campaign-voucher-code">{v.code}</span>
                    <span className="campaign-voucher-discount">{v.discount_percentage}% off</span>
                    <span className={`campaign-voucher-status ${v.is_active ? 'active' : 'inactive'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {campaignToEdit && attachedVouchers.length === 0 && (
            <div className="form-group">
              <label>Attached Vouchers</label>
              <div style={{
                padding: '0.6rem 0.9rem',
                background: '#f9f9f9',
                border: '1px dashed #ddd',
                borderRadius: '6px',
                fontSize: '0.83rem',
                color: '#aaa',
              }}>
                No vouchers attached yet. Create vouchers and assign them to this campaign.
              </div>
            </div>
          )}

          {/* New campaign: status preview based on start_date */}
          {!campaignToEdit && (
            <div style={{
              padding: '0.6rem 0.9rem',
              background: previewStatus === 'Active' ? '#e8f5e9' : '#eff6ff',
              border: `1px solid ${previewStatus === 'Active' ? '#a5d6a7' : '#bfdbfe'}`,
              borderRadius: '6px',
              fontSize: '0.82rem',
              color: previewStatus === 'Active' ? '#2e7d32' : '#1d4ed8',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <i className={`fa-solid ${previewStatus === 'Active' ? 'fa-circle-check' : 'fa-calendar-days'}`}></i>
              {previewStatus === 'Active'
                ? <>Campaign will launch as <strong>Active</strong> on save (start date is today or not set).</>  
                : <>Campaign will be <strong>Scheduled</strong> — it becomes Active on {formData.start_date}.</>
              }
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-inner-btn">Cancel</button>
            <button type="submit" className="save-btn">
              {campaignToEdit ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignModal;
