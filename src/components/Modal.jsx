import React from 'react';
import '../css/Modal.css';

/**
 * Modal Component
 * Handles the UI and data logic for the Modal module.
 */
const Modal = ({ show, onClose, title, message, children, type = 'default' }) => {
  if (!show) return null;

  return (
    <div className={`modal-overlay ${type}-modal`}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="close-x">&times;</button>
        </div>
        
        <div className="modal-body">
          {message && <p className="modal-message">{message}</p>}
          {children}
          
          <div className="modal-actions">
            <button onClick={onClose} className="save-btn">Understood</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
