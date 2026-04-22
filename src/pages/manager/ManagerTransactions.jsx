import React from 'react';
import Transactions from '../admin/Transactions';

/**
 * ManagerTransactions Component
 * Reuses the Transactions component but with view-only logic enabled via role detection.
 */
const ManagerTransactions = () => {
  return <Transactions />;
};

export default ManagerTransactions;
