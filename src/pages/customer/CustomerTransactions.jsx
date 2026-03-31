import React from 'react';
import '../../css/Customer.css';

const CustomerTransactions = () => {
  return (
    <div className="customer-transactions">
      <div className="customer-dashboard-header">
        <h1>Transactions</h1>
        <p>View your purchase and reward history.</p>
      </div>
      <div className="empty-state">
        <i className="fa-solid fa-clock-rotate-left"></i>
        <h3>Transactions Page Coming Soon</h3>
        <p>We are currently working on this feature to help you track your spending and savings better.</p>
      </div>
    </div>
  );
};

export default CustomerTransactions;
