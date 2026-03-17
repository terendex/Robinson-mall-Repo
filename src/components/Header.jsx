
import React from 'react';
import '../styles/Header.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

const Header = () => {
  return (
    <header className="header">
      <div className="logo">
        <img src={robinsonsLogo} alt="Robinsons Malls" className="logo-img" />
      </div>
    </header>
  );
};

export default Header;
