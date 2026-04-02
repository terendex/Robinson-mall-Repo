import React from 'react';
import SideNav from '../../components/SideNav';

/**
 * Settings Component
 * Handles the UI and data logic for the Settings module.
 */
const Settings = () => {
  return (
    <div style={{ display: 'flex' }}>
      <SideNav />
      <div style={{ marginLeft: '250px', padding: '20px' }}>
        <h1>Settings</h1>
      </div>
    </div>
  );
};

export default Settings;
