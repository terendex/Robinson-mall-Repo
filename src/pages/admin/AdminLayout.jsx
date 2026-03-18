import React from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../../components/SideNav';
import '../../styles/AdminLayout.css';

const AdminLayout = () => {
  return (
    <div>
      <SideNav />
      <main className="admin-layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
