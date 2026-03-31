import React from 'react';

const StaffTransactions = () => {
  return (
    <div className="transactions-page" style={{ padding: '2rem' }}>
      <h1>Transaction Management</h1>
      <p>This is a placeholder for the Transaction Management page. Functional implementation coming soon.</p>
      
      <div style={{
        marginTop: '2rem',
        padding: '3rem',
        background: '#f9f9f9',
        borderRadius: '12px',
        border: '2px dashed #ddd',
        textAlign: 'center',
        color: '#666'
      }}>
        <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ccc' }}></i>
        <h3>Transactions Module Under Development</h3>
        <p>In the next update, you will be able to view and manage all staff-related transactions here.</p>
      </div>
    </div>
  );
};

export default StaffTransactions;
