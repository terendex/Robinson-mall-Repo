import React, { useState, useEffect } from 'react';
import '../css/Modal.css';

/**
 * UserModal Component
 * Handles the UI and data logic for the UserModal module.
 */
const UserModal = ({ show, onClose, onSave, userToEdit }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'customer',
    password: '',
  });

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        username: userToEdit.username || '',
        email: userToEdit.email || '',
        role: userToEdit.role || 'customer',
        first_name: userToEdit.first_name || '',
        last_name: userToEdit.last_name || '',
        password: '', // Don't show password for editing
      });
    } else {
      setFormData({
        username: '',
        email: '',
        role: 'customer',
        first_name: '',
        last_name: '',
        password: '',
      });
    }
  }, [userToEdit, show]);

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
          <h2>{userToEdit ? 'Edit User' : 'Add New User'}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
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
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              required
            />
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
          {!userToEdit && (
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
              />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-inner-btn">Cancel</button>
            <button type="submit" className="save-btn">{userToEdit ? 'Save Changes' : 'Add User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
