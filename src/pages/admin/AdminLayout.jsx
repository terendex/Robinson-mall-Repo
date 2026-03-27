import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import AdminHeader from '../../components/AdminHeader';
import '../../styles/AdminLayout.css';

const AdminLayout = ({ user }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="admin-layout">
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
  );
};

export default AdminLayout;
