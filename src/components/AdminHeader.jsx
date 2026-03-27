import React from 'react';
import '../styles/AdminHeader.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

const AdminHeader = ({ toggleSidebar, user, isSidebarOpen }) => {
  return (
    <header className="admin-header">
      <div className="admin-logo-section">
        <img src={robinsonsLogo} alt="Robinsons" className="admin-header-logo" />
      </div>
      
      <div className="admin-header-main">
        <div className="admin-header-left">
          <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
            <i className="fa-solid fa-columns"></i>
          </button>
          <div className="header-separator"></div>
          <div className="header-search-container">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Search" />
          </div>
        </div>
        
        <div className="admin-header-right">
          <div className="header-icon-btn">
            <i className="fa-solid fa-envelope"></i>
            <span className="notification-dot"></span>
          </div>
          <div className="header-icon-btn">
            <i className="fa-solid fa-question-circle"></i>
          </div>
          <div className="header-icon-btn">
            <i className="fa-solid fa-bell"></i>
            <span className="notification-dot"></span>
          </div>
          
          <div className="header-user-profile">
            <div className="profile-avatar">
              <i className="fa-solid fa-user-circle"></i>
            </div>
            <i className="fa-solid fa-chevron-down profile-caret hide-mobile"></i>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
