import React from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/Header.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

const Header = () => {
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="header">
      <div className="logo">
        <img src={robinsonsLogo} alt="Robinsons Malls" className="logo-img" />
      </div>
    </header>
  );
};

export default Header;
