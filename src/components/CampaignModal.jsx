import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Modal.css';

const CampaignModal = ({ show, onClose, onSave, campaignToEdit }) => {
  const [vouchers, setVouchers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    voucher: '',
    voucher_name: '',
    voucher_discount: '',
    status: 'Active',
    budget: '',
    start_date: '',
    end_date: '',
    reach: '',
    conversions: '',
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  useEffect(() => {
    if (campaignToEdit) {
      setFormData({
        name: campaignToEdit.name || '',
        voucher: campaignToEdit.voucher || '',
        voucher_name: campaignToEdit.voucher_name ? `${campaignToEdit.voucher_name} (${campaignToEdit.voucher_code})` : '',
        voucher_discount: campaignToEdit.voucher_discount !== undefined && campaignToEdit.voucher_discount !== null ? campaignToEdit.voucher_discount : '',
        status: campaignToEdit.status || 'Active',
        budget: campaignToEdit.budget || '',
        start_date: campaignToEdit.start_date || '',
        end_date: campaignToEdit.end_date || '',
        reach: campaignToEdit.reach || '',
        conversions: campaignToEdit.conversions || '',
      });
    } else {
      setFormData({
        name: '',
        voucher: '',
        voucher_name: '',
        voucher_discount: '',
        status: 'Active',
        budget: '',
        start_date: '',
        end_date: '',
        reach: '',
        conversions: '',
      });
    }
  }, [campaignToEdit, show]);

  const fetchVouchers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/vouchers/');
      setVouchers(response.data);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    }
  };

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{campaignToEdit ? 'Edit Campaign' : 'Add New Campaign'}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
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
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Voucher Name</label>
              {campaignToEdit ? (
                <input
                  type="text"
                  name="voucher_name"
                  value={formData.voucher_name || ''}
                  onChange={handleChange}
                />
              ) : (
                <select name="voucher" value={formData.voucher} onChange={handleChange} required>
                  <option value="">Select a voucher</option>
                  {vouchers.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                  ))}
                </select>
              )}
            </div>
            {campaignToEdit && (
              <div className="form-group">
                <label>Discount (%)</label>
                <input
                  type="number"
                  name="voucher_discount"
                  value={formData.voucher_discount !== undefined && formData.voucher_discount !== null ? formData.voucher_discount : ''}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Reach</label>
              <input
                type="number"
                name="reach"
                value={formData.reach}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>
            <div className="form-group">
              <label>Conversions</label>
              <input
                type="number"
                name="conversions"
                value={formData.conversions}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Budget (₱)</label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="50000"
                required
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-inner-btn">Cancel</button>
            <button type="submit" className="save-btn">{campaignToEdit ? 'Save Changes' : 'Create Campaign'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignModal;
