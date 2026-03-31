import React from 'react';
import { NavLink } from 'react-router-dom';
import '../css/SideNav.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

const SideNav = ({ user, isOpen, closeSidebar }) => {
  const role = user?.role || 'admin';
  const pathPrefix = `/${role}`;

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

  const navLinks = [
    ...(role !== 'staff' ? [{ to: `${pathPrefix}/dashboard`, icon: 'fa-table-cells-large', label: 'Dashboard' }] : []),
    { to: `${pathPrefix}/vouchers`, icon: 'fa-ticket-simple', label: role === 'customer' ? 'My Vouchers' : 'Vouchers' },
    { to: `${pathPrefix}/campaigns`, icon: 'fa-tag', label: role === 'customer' ? 'Active Campaigns' : 'Campaigns' },
    { to: `${pathPrefix}/claims`, icon: 'fa-gift', label: role === 'customer' ? 'My Claims' : 'Claims' },
    { to: `${pathPrefix}/transactions`, icon: 'fa-clock-rotate-left', label: 'Transactions' },
    ...(role === 'admin' ? [{ to: `${pathPrefix}/users`, icon: 'fa-user-group', label: 'Users' }] : []),
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
