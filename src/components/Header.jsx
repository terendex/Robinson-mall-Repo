import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/Header.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

/**
 * Header Component
 * Handles the UI and data logic for the Header module.
 */
const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPaths = ['/admin', '/manager', '/staff', '/customer'];
  if (dashboardPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  const goBack = () => {
    navigate(-1);
  };

  return (
    <header className="header">
      <div className="logo">
        <img src={robinsonsLogo} alt="Robinsons Malls" className="logo-img" />
      </div>
      {location.pathname.startsWith('/privacy-policy') && (
        <button onClick={goBack} className="header-back-button">
          &larr; Back
        </button>
      )}
    </header>
  );
};

export default Header;
