import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { useState } from 'react';
import axios from 'axios';
import Header from './components/Header';
import Register from './pages/Register'
import Log from './pages/Log'
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Vouchers from './pages/admin/Vouchers';
import Campaigns from './pages/admin/Campaigns';
import Claims from './pages/admin/Claims';
import Transactions from './pages/admin/Transactions';
import Users from './pages/admin/Users';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import ForgotPassword from './pages/ForgotPassword';
import PasswordReset from './pages/PasswordReset';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Notifications from './pages/admin/Notifications';
import './styles/App.css'

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = async (identifier, password) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/users/login/', {
        identifier: identifier,
        password: password,
      });
      const userData = response.data;
      if (userData) {
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');
  };

  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <Log onLogin={handleLogin} />} />
          <Route path="/login" element={<Log onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/password-reset/:token" element={<PasswordReset />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* Admin Routes */}
          <Route path="/admin" element={user && user.role === 'admin' ? <AdminLayout user={user} /> : <Navigate to="/login" />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="vouchers" element={<Vouchers />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="claims" element={<Claims />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="users" element={<Users />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route index element={<Navigate to="dashboard" />} />
          </Route>

          <Route path="/manager" element={user && user.role === 'manager' ? <ManagerDashboard /> : <Navigate to="/login" />} />
          <Route path="/staff" element={user && user.role === 'staff' ? <StaffDashboard /> : <Navigate to="/login" />} />
          <Route path="/customer" element={user && user.role === 'customer' ? <CustomerDashboard /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
