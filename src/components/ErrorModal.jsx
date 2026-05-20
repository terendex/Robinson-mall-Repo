import React from 'react';
import '../css/Modal.css';

/**
 * ErrorModal Component
 * Shows a premium error message or validation failure alert.
 * Optimized for mobile bottom sheets and high-fidelity desktop feedback.
 */
const ErrorModal = ({ 
  show, 
  onClose, 
  title = "Error", 
  message = "An unexpected error occurred. Please try again.", 
  buttonText = "Got it" 
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay error-modal-overlay">
      <div className="modal-content error-modal-content" style={{ maxWidth: 400 }}>
        <div className="modal-header error-header">
          <div className="error-icon-wrap">
            <i className="fa-solid fa-circle-exclamation"></i>
          </div>
          <h2>{title}</h2>
        </div>
        <div className="modal-body error-body" style={{ padding: '1rem 2rem 2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '1.05rem', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {message}
          </p>
        </div>
        <div className="modal-actions error-actions" style={{ padding: '0 2rem 2rem', justifyContent: 'center' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="save-btn btn-error" 
            style={{ width: '100%', padding: '0.8rem' }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
