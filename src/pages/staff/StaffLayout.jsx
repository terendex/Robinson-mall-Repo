import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import AdminHeader from '../../components/AdminHeader';
import { NotificationProvider } from '../../context/NotificationContext';
import '../../css/AdminLayout.css';

const StaffLayout = ({ user }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <NotificationProvider>
      <div className="admin-layout">
        <AdminHeader toggleSidebar={toggleSidebar} user={user} isSidebarOpen={isSidebarOpen} />
        <SideNav 
          user={user} 
          isOpen={isSidebarOpen} 
          closeSidebar={closeSidebar} 
        />
        <main className={`admin-layout-main${isSidebarOpen ? ' sidebar-open' : ''}`}>
          <div className="manager-content-wrapper">
            <Outlet />
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
};

export default StaffLayout;
