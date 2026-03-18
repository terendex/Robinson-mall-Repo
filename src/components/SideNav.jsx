import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/SideNav.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

const SideNav = () => {
  return (
    <div className="sidenav">
      <div className="logo">
        <img src={robinsonsLogo} alt="Robinsons Malls" className="logo-side" />
      </div>
      <ul className="nav-links">
        <li><NavLink to="/admin/dashboard" ><i className="fas fa-th-large"></i> Dashboard</NavLink></li>
        <li><NavLink to="/admin/vouchers" ><i className="fas fa-tags"></i> Vouchers</NavLink></li>
        <li><NavLink to="/admin/campaigns" ><i className="fas fa-bullhorn"></i> Campaigns</NavLink></li>
        <li><NavLink to="/admin/claims" ><i className="fas fa-gift"></i> Claims</NavLink></li>
        <li><NavLink to="/admin/transactions" ><i className="fas fa-history"></i> Transactions</NavLink></li>
        <li><NavLink to="/admin/users" ><i className="fas fa-users"></i> Users</NavLink></li>
        <li><NavLink to="/admin/reports" ><i className="fas fa-chart-bar"></i> Reports</NavLink></li>
        <li><NavLink to="/admin/settings" ><i className="fas fa-cog"></i> Settings</NavLink></li>
      </ul>
      <div className="admin-user">
        <div className="admin-icon"><i className="fas fa-user-circle"></i></div>
        <div className="admin-info">
          <p>Admin User</p>
          <p>admin.user@gmail.com</p>
        </div>
      </div>
    </div>
  );
};

export default SideNav;
