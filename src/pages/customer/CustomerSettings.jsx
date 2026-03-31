import React from 'react';
import '../../css/Customer.css';

const CustomerSettings = ({ user }) => {
  return (
    <div className="customer-settings">
      <div className="customer-dashboard-header">
        <h1>Settings & Profile</h1>
        <p>Manage your account and preferences.</p>
      </div>
      <div className="empty-state">
        <i className="fa-solid fa-user-gear"></i>
        <h3>Settings Page WIP</h3>
        <p>Configure your profile, update your password, and set notification preferences here soon.</p>
      </div>
    </div>
  );
};

export default CustomerSettings;
