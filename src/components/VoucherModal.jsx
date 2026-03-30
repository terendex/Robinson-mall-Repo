import React, { useState, useEffect } from 'react';
import '../styles/Modal.css';

const VoucherModal = ({ show, onClose, onSave, voucherToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    voucher_type: 'Fashion',
    discount_percentage: '',
    usage_limit: '',
  });

  useEffect(() => {
    if (voucherToEdit) {
      setFormData({
        name: voucherToEdit.name || '',
        code: voucherToEdit.code || '',
        voucher_type: voucherToEdit.voucher_type || 'Fashion',
        discount_percentage: voucherToEdit.discount_percentage || '',
        usage_limit: voucherToEdit.usage_limit || '',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        voucher_type: 'Fashion',
        discount_percentage: '',
        usage_limit: '',
      });
    }
  }, [voucherToEdit, show]);

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
          <h2>{voucherToEdit ? 'Edit Voucher' : 'Add New Voucher'}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
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
          <div className="form-group">
            <label>Voucher Type</label>
            <select name="voucher_type" value={formData.voucher_type} onChange={handleChange}>
              <option value="Fashion">Fashion</option>
              <option value="Food & Beverage">Food & Beverage</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Beauty">Beauty</option>
              <option value="Electronics">Electronics</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Discount (%)</label>
              <input
                type="number"
                name="discount_percentage"
                value={formData.discount_percentage}
                onChange={handleChange}
                placeholder="20"
                min="0"
                max="100"
                required
              />
            </div>
            <div className="form-group">
              <label>Usage Limit</label>
              <input
                type="number"
                name="usage_limit"
                value={formData.usage_limit}
                onChange={handleChange}
                placeholder="1000"
                required
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-inner-btn">Cancel</button>
            <button type="submit" className="save-btn">{voucherToEdit ? 'Save Changes' : 'Create Voucher'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoucherModal;
