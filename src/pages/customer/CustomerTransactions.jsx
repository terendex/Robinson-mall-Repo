import React from 'react';
import Transactions from '../admin/Transactions';
import '../../css/Customer.css';

/**
 * CustomerTransactions Component
 * Reuses the standardized Transactions component with customer-specific 
 * filtering and restricted permissions.
 */
const CustomerTransactions = () => {
  return (
    <div className="customer-transactions">
      <Transactions />
    </div>
  );
};

export default CustomerTransactions;
