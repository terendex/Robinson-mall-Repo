import React, { useState, useEffect } from 'react';
import '../css/Modal.css';
import ErrorModal from './ErrorModal';
import { FaCheck, FaTimes } from 'react-icons/fa';

const PASSWORD_RULES = [
  { key: 'length',  label: 'At least 8 characters',                     test: pw => pw.length >= 8 },
  { key: 'upper',   label: 'At least one uppercase letter (A–Z)',        test: pw => /[A-Z]/.test(pw) },
  { key: 'lower',   label: 'At least one lowercase letter (a–z)',        test: pw => /[a-z]/.test(pw) },
  { key: 'special', label: 'At least one special character (!@#$%^&*…)', test: pw => /[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]/.test(pw) },
];

/**
 * UserModal Component
 * Handles the UI and data logic for the UserModal module.
 */
const UserModal = ({ show, onClose, onSave, userToEdit }) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'customer',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  });

  const [errorConfig, setErrorConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        email: userToEdit.email || '',
        role: userToEdit.role || 'customer',
        first_name: userToEdit.first_name || '',
        last_name: userToEdit.last_name || '',
        password: '', 
        confirmPassword: '',
      });
    } else {
      setFormData({
        email: '',
        role: 'customer',
        first_name: '',
        last_name: '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [userToEdit, show]);

  const isDirty = React.useMemo(() => {
    if (!userToEdit) {
      // For NEW user: email, password are required
      return !!(formData.email.trim() && formData.password);
    }
    // For EDIT: compare current state vs initial userToEdit values
    return (
      formData.email !== (userToEdit.email || '') ||
      formData.role !== (userToEdit.role || 'customer') ||
      formData.first_name !== (userToEdit.first_name || '') ||
      formData.last_name !== (userToEdit.last_name || '') ||
      formData.password !== ''
    );
  }, [formData, userToEdit]);

  const newPw = formData.password || '';
  const ruleResults = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(newPw) }));

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.role === 'admin' && formData.password !== formData.confirmPassword) {
      setErrorConfig({
        show: true,
        title: 'Password Mismatch',
        message: 'Admin passwords do not match. Please retype to confirm.'
      });
      return;
    }

    if (!userToEdit && !formData.password) {
      setErrorConfig({
        show: true,
        title: 'Requirement Missing',
        message: 'A password is required when creating a new user account.'
      });
      return;
    }

    if (formData.password) {
      if (formData.password.length < 8) {
        setErrorConfig({ show: true, title: 'Weak Password', message: 'Password must be at least 8 characters long.' });
        return;
      }
      if (!/[A-Z]/.test(formData.password)) {
        setErrorConfig({ show: true, title: 'Weak Password', message: 'Password must contain at least one uppercase letter.' });
        return;
      }
      if (!/[a-z]/.test(formData.password)) {
        setErrorConfig({ show: true, title: 'Weak Password', message: 'Password must contain at least one lowercase letter.' });
        return;
      }
      if (!/[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]/.test(formData.password)) {
        setErrorConfig({ show: true, title: 'Weak Password', message: 'Password must contain at least one special character.' });
        return;
      }
    }

    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{userToEdit ? 'Edit User' : 'Add New User'}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          {formData.role === 'admin' && (
            <div className="admin-warning">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>
                <strong>Warning:</strong> There can only be one Admin. Creating or promoting this user to Admin will remove the current Admin's privileges.
              </span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="First name"
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last name"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="admin">Admin</option>
              <option value="manager">Store Manager</option>
              <option value="staff">Staff Member</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          
          {(formData.role === 'admin' || !userToEdit) && (
            <div className="form-row">
              <div className="form-group">
                <label>{formData.role === 'admin' ? 'Admin Password' : 'Password'}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required={!userToEdit || formData.role === 'admin'}
                />
                {(formData.role === 'admin' || !userToEdit || formData.password.length > 0) && (
                  <ul className="pw-requirements">
                    {ruleResults.map(r => (
                      <li key={r.key} className={r.passed ? 'req-pass' : 'req-fail'}>
                        {r.passed ? <FaCheck className="req-icon" /> : <FaTimes className="req-icon" />}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {formData.role === 'admin' && (
                <div className="form-group">
                  <label>Confirm Admin Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Retype admin password"
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-inner-btn">Cancel</button>
            <button type="submit" className="save-btn" disabled={!isDirty}>
              {formData.role === 'admin' ? 'Confirm Admin Change' : (userToEdit ? 'Save Changes' : 'Add User')}
            </button>
          </div>
        </form>
        <ErrorModal 
          {...errorConfig}
          onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
        />
      </div>
    </div>
  );
};

export default UserModal;
