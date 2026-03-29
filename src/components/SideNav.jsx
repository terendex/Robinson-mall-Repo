import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/SideNav.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

const SideNav = ({ user, isOpen, closeSidebar }) => {
  // Build display name from user data
  const displayName = user
    ? (user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username)
    : 'Admin User';

  const displayEmail = user?.email || 'admin@example.com';

  const handleNavLinkClick = () => {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Dark overlay behind sidebar on mobile */}
      {isOpen && <div className="sidenav-overlay" onClick={closeSidebar} />}

      <div className={`sidenav${isOpen ? ' open' : ''}`}>
        <ul className="nav-links">
          <li><NavLink to="/admin/dashboard" onClick={handleNavLinkClick}><i className="fa-solid fa-table-cells-large"></i> Dashboard</NavLink></li>
          <li><NavLink to="/admin/vouchers" onClick={handleNavLinkClick}><i className="fa-solid fa-ticket-simple"></i> Vouchers</NavLink></li>
          <li><NavLink to="/admin/campaigns" onClick={handleNavLinkClick}><i className="fa-solid fa-tag"></i> Campaigns</NavLink></li>
          <li><NavLink to="/admin/claims" onClick={handleNavLinkClick}><i className="fa-solid fa-gift"></i> Claims</NavLink></li>
          <li><NavLink to="/admin/transactions" onClick={handleNavLinkClick}><i className="fa-solid fa-clock-rotate-left"></i> Transactions</NavLink></li>
          <li><NavLink to="/admin/users" onClick={handleNavLinkClick}><i className="fa-solid fa-user-group"></i> Users</NavLink></li>
          <li><NavLink to="/admin/reports" onClick={handleNavLinkClick}><i className="fa-solid fa-chart-simple"></i> Reports</NavLink></li>
          <li><NavLink to="/admin/settings" onClick={handleNavLinkClick}><i className="fa-solid fa-gear"></i> Settings</NavLink></li>
        </ul>
        <div className="admin-user">
          <div className="admin-icon"><i className="fa-solid fa-user-circle"></i></div>
          <div className="admin-info">
            <p className="admin-name">{displayName}</p>
            <p className="admin-email">{displayEmail}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideNav;
