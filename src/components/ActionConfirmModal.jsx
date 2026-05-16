import React from 'react';
import '../css/Modal.css';

/**
 * ActionConfirmModal Component
 * A generic confirmation modal for Add, Edit, and Delete actions.
 */
const ActionConfirmModal = ({ 
  show, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary" // 'primary' | 'danger' | 'success'
}) => {
  if (!show) return null;

  const getVariantClass = () => {
    switch (variant) {
      case 'danger': return 'btn-danger';
      case 'success': return 'btn-success';
      default: return 'btn-primary';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger': return 'fa-triangle-exclamation';
      case 'success': return 'fa-circle-check';
      default: return 'fa-circle-question';
    }
  };

  return (
    <div className="modal-overlay action-confirm-overlay">
      <div className="modal-content action-confirm-content" style={{ maxWidth: 400 }}>
        <div className={`modal-header confirm-header ${variant}`}>
          <h2>
            <i className={`fa-solid ${getIcon()}`} style={{ marginRight: '0.75rem' }}></i>
            {title}
          </h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body confirm-body" style={{ padding: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '1rem', color: '#334155', lineHeight: '1.5' }}>
            {message}
          </p>
        </div>
        <div className="modal-actions confirm-actions" style={{ padding: '0 1.5rem 1.5rem' }}>
          <button type="button" onClick={onClose} className="cancel-inner-btn">
            {cancelText}
          </button>
          <button 
            type="button" 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={`save-btn ${getVariantClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionConfirmModal;
