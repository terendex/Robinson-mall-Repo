import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { useState } from 'react';
import axios from 'axios';
import Header from './components/Header';
import Register from './pages/Register'
import Log from './pages/Log'
import IdleTimer from './components/IdleTimer';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Vouchers from './pages/admin/Vouchers';
import Campaigns from './pages/admin/Campaigns';
import Claims from './pages/admin/Claims';
import Transactions from './pages/admin/Transactions';
import Users from './pages/admin/Users';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import Shops from './pages/admin/Shops';
import ManagerLayout from './pages/manager/ManagerLayout';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerVouchers from './pages/manager/ManagerVouchers';
import ManagerCampaigns from './pages/manager/ManagerCampaigns';
import ManagerClaims from './pages/manager/ManagerClaims';
import ManagerTransactions from './pages/manager/ManagerTransactions';
import ManagerReports from './pages/manager/ManagerReports';
import ManagerSettings from './pages/manager/ManagerSettings';

import ManagerNotifications from './pages/manager/ManagerNotifications';

import StaffLayout from './pages/staff/StaffLayout';
import StaffVouchers from './pages/staff/StaffVouchers';
import StaffCampaigns from './pages/staff/StaffCampaigns';
import StaffClaims from './pages/staff/StaffClaims';
import StaffTransactions from './pages/staff/StaffTransactions';
import StaffSettings from './pages/staff/StaffSettings';
import StaffNotifications from './pages/staff/StaffNotifications';
import CustomerLayout from './pages/customer/CustomerLayout';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerVouchers from './pages/customer/CustomerVouchers';
import CustomerCampaigns from './pages/customer/CustomerCampaigns';
import CustomerClaims from './pages/customer/CustomerClaims';
import CustomerTransactions from './pages/customer/CustomerTransactions';
import CustomerSettings from './pages/customer/CustomerSettings';
import CustomerNotifications from './pages/customer/CustomerNotifications';
import ForgotPassword from './pages/ForgotPassword';
import PasswordReset from './pages/PasswordReset';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Notifications from './pages/admin/Notifications';
import "./css/App.css"

/**
 * Global Axios Interceptor
 * Automatically attaches the stored JWT Access Token to all outgoing requests.
 * By design, it skips attaching tokens on login/register endpoints to prevent old tokens from triggering a 401.
 */
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && !config.url.includes('/login/') && !config.url.includes('/register/')) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Global Response Interceptor
 * Handles 401 Unauthorized errors by attempting to refresh the token.
 * If refresh succeeds, it retries the original request.
 * If refresh fails, it clears local storage to end the session.
 */
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/token/refresh/')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/token/refresh/`, {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          localStorage.setItem('accessToken', access);
          
          // Update the original request's header and retry
          originalRequest.headers['Authorization'] = `Bearer ${access}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear everything and force re-login
          console.error("Session expired. Please log in again.");
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        // No refresh token available
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Main App Component
 * Serves as the primary orchestrator for Router functionality and global user state.
 */
function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  /**
   * Authenticates the user with the backend, stores their JWT payload, and sets their global active state.
   */
  const handleLogin = async (identifier, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/users/login/`, {
        identifier: identifier,
        password: password,
      });
      const userData = response.data;
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('accessToken', userData.access);
        localStorage.setItem('refreshToken', userData.refresh);
        return userData;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  };

  /**
   * Purges the user state and destroys token cache, effectively ending the active session.
   */
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <Router>
      <div className="App">
        {user && <IdleTimer onLogout={handleLogout} timeout={5 * 60 * 1000} />}
        <Header />
        <Routes>
          <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <Log onLogin={handleLogin} />} />
          <Route path="/login" element={<Log onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/password-reset/:uidb64/:token" element={<PasswordReset />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* Admin Routes */}
          <Route path="/admin" element={user && user.role === 'admin' ? <AdminLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="vouchers" element={<Navigate to="/admin/campaigns" replace />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="claims" element={<Claims />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="users" element={<Users />} />
            <Route path="shops" element={<Shops />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route index element={<Navigate to="dashboard" />} />
          </Route>

          {/* Manager Routes */}
          <Route path="/manager" element={user && user.role === 'manager' ? <ManagerLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="vouchers" element={<Navigate to="/manager/campaigns" replace />} />
            <Route path="campaigns" element={<ManagerCampaigns />} />
            <Route path="claims" element={<ManagerClaims />} />
            <Route path="transactions" element={<ManagerTransactions />} />
            <Route path="shops" element={<Shops />} />
            <Route path="reports" element={<ManagerReports />} />
            <Route path="settings" element={<ManagerSettings />} />
            <Route path="notifications" element={<ManagerNotifications />} />
            <Route index element={<Navigate to="dashboard" />} />
          </Route>
          {/* Staff Routes */}
          <Route path="/staff" element={user && user.role === 'staff' ? <StaffLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route path="vouchers" element={<Navigate to="/staff/campaigns" replace />} />
            <Route path="campaigns" element={<StaffCampaigns />} />
            <Route path="claims" element={<StaffClaims />} />
            <Route path="transactions" element={<StaffTransactions />} />
            <Route path="settings" element={<StaffSettings />} />
            <Route path="notifications" element={<StaffNotifications />} />
            <Route index element={<Navigate to="vouchers" />} />
          </Route>
          {/* Customer Routes */}
          <Route path="/customer" element={user && user.role === 'customer' ? <CustomerLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route path="dashboard" element={<CustomerDashboard user={user} />} />
            <Route path="vouchers" element={<Navigate to="/customer/campaigns" replace />} />
            <Route path="campaigns" element={<CustomerCampaigns user={user} />} />
            <Route path="claims" element={<CustomerClaims user={user} />} />
            <Route path="transactions" element={<CustomerTransactions />} />
            <Route path="settings" element={<CustomerSettings user={user} />} />
            <Route path="notifications" element={<CustomerNotifications user={user} />} />
            <Route index element={<Navigate to="dashboard" />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
