import React from 'react';
import { NavLink } from 'react-router-dom';
import '../css/SideNav.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

/**
 * SideNav Component
 * Handles the UI and data logic for the SideNav module.
 */
const SideNav = ({ user, isOpen, closeSidebar }) => {
  const role = user?.role || 'admin';
  const pathPrefix = `/${role}`;

  // Build display name from user data
  const displayName = user
    ? (user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email)
    : 'Admin User';

  const displayEmail = user?.email || 'admin@example.com';

  const handleNavLinkClick = () => {
    // Close the sidebar drawer on phones (≤767px) after navigation
    if (window.innerWidth <= 767) {
      closeSidebar();
    }
  };

  const navLinks = [
    { to: `${pathPrefix}/dashboard`, icon: 'fa-table-cells-large', label: 'Dashboard' },
    { to: `${pathPrefix}/campaigns`, icon: 'fa-tag', label: role === 'customer' ? 'Active Campaigns' : 'Campaigns' },
    ...(role === 'admin' || role === 'manager' ? [{ to: `${pathPrefix}/shops`, icon: 'fa-store', label: 'Shops' }] : []),
    { to: `${pathPrefix}/claims`, icon: 'fa-gift', label: role === 'customer' ? 'My Claims' : 'Claims' },
    ...(role === 'admin' ? [{ to: `${pathPrefix}/users`, icon: 'fa-user-group', label: 'Users' }] : []),
    { to: `${pathPrefix}/transactions`, icon: 'fa-clock-rotate-left', label: 'Transactions' },
    ...(role !== 'staff' && role !== 'customer' ? [{ to: `${pathPrefix}/reports`, icon: 'fa-chart-simple', label: 'Reports' }] : []),
    { to: `${pathPrefix}/settings`, icon: 'fa-gear', label: 'Settings' },
  ];

  return (
    <>
      {/* Dark overlay behind sidebar on mobile */}
      {isOpen && <div className="sidenav-overlay" onClick={closeSidebar} />}

      <div className={`sidenav${isOpen ? ' open' : ''}`}>
        <ul className="nav-links">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} onClick={handleNavLinkClick}>
                <i className={`fa-solid ${link.icon}`}></i> {link.label}
              </NavLink>
            </li>
          ))}
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
