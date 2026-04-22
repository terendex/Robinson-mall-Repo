import React from 'react';
import Transactions from '../admin/Transactions';

/**
 * StaffTransactions Component
 * Reuses the Transactions component. 
 * Note: Unlike Managers, Staff currently have full create/edit permissions 
 * to handle on-the-ground transaction recording.
 */
const StaffTransactions = () => {
  return <Transactions />;
};

export default StaffTransactions;
