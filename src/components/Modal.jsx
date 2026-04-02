import React from 'react';
import '../css/Modal.css';

/**
 * Modal Component
 * Handles the UI and data logic for the Modal module.
 */
const Modal = ({ show, onClose, title, message }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onClose} className="modal-close-btn">Close</button>
      </div>
    </div>
  );
};

export default Modal;
