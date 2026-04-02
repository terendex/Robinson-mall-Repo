import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import AdminHeader from '../../components/AdminHeader';
import { NotificationProvider } from '../../context/NotificationContext';
import '../../css/AdminLayout.css';

/**
 * CustomerLayout Component
 * Handles the UI and data logic for the CustomerLayout module.
 */
const CustomerLayout = ({ user }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <NotificationProvider user={user}>
      <div className="admin-layout customer-layout">
        <AdminHeader toggleSidebar={toggleSidebar} user={user} isSidebarOpen={isSidebarOpen} />
        <SideNav 
          user={user} 
          isOpen={isSidebarOpen} 
          closeSidebar={closeSidebar} 
        />
        <main className={`admin-layout-main${isSidebarOpen ? ' sidebar-open' : ''}`}>
          <Outlet />
        </main>
      </div>
    </NotificationProvider>
  );
};

export default CustomerLayout;
