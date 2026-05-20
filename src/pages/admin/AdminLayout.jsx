import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import AdminHeader from '../../components/AdminHeader';
import { NotificationProvider } from '../../context/NotificationContext';
import '../../css/AdminLayout.css';

/**
 * AdminLayout Component
 * Handles the UI and data logic for the AdminLayout module.
 */
const AdminLayout = ({ user, onLogout }) => {
  // On tablets/desktop (≥768px) sidebar is open by default; on phones it's closed
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <NotificationProvider user={user}>
      <div className="admin-layout">
        <AdminHeader toggleSidebar={toggleSidebar} user={user} isSidebarOpen={isSidebarOpen} onLogout={onLogout} />
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

export default AdminLayout;
