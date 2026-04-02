import React from 'react';
import SideNav from '../../components/SideNav';

/**
 * Reports Component
 * Handles the UI and data logic for the Reports module.
 */
const Reports = () => {
  return (
    <div style={{ display: 'flex' }}>
      <SideNav />
      <div style={{ marginLeft: '250px', padding: '20px' }}>
        <h1>Reports</h1>
      </div>
    </div>
  );
};

export default Reports;
