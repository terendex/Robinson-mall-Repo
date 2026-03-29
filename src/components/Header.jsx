import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Header.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith('/admin')) {
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
      {location.pathname === '/privacy-policy' && (
        <button onClick={goBack} className="header-back-button">
          &larr; Back
        </button>
      )}
    </header>
  );
};

export default Header;
