import React from 'react';
import '../css/Modal.css';

/**
 * SuccessModal Component
 * Shows a premium success message after an action is completed.
 */
const SuccessModal = ({ 
  show, 
  onClose, 
  title = "Success!", 
  message = "Action completed successfully.", 
  buttonText = "Got it" 
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay success-modal-overlay">
      <div className="modal-content success-modal-content" style={{ maxWidth: 400 }}>
        <div className="modal-header success-header">
          <div className="success-icon-wrap">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <h2>{title}</h2>
        </div>
        <div className="modal-body success-body" style={{ padding: '1rem 2rem 2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '1.05rem', color: '#475569', lineHeight: '1.6' }}>
            {message}
          </p>
        </div>
        <div className="modal-actions success-actions" style={{ padding: '0 2rem 2rem', justifyContent: 'center' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="save-btn btn-success" 
            style={{ width: '100%', padding: '0.8rem' }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
