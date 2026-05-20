import React, { useState } from 'react';
import '../css/Modal.css';

/**
 * ResetPasswordModal Component
 * Handles the UI and data logic for the ResetPasswordModal module.
 */
const ResetPasswordModal = ({ show, user, onClose, onSave }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    onSave(password);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content reset-password-modal">
        <div className="modal-header">
          <h2>Reset Password</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="user-context">
            <p>Resetting password for <strong>{user.first_name || user.email}</strong></p>
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter new password"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              placeholder="Confirm new password"
              required
            />
          </div>
          {error && <p className="error-message" style={{ color: '#c50000', fontSize: '13px', marginTop: '-10px', marginBottom: '10px' }}>{error}</p>}
          <div className="modal-actions">
            <button type="button" className="cancel-inner-btn" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={!password || !confirmPassword || password !== confirmPassword || password.length < 8}
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
