import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { useState } from 'react';
import axios from 'axios';
import Register from './pages/Register'
import Log from './pages/Log'
import Header from './components/Header'
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import StaffDashboard from './pages/StaffDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
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
  };

  return (
    <Router>
      <div className="App">
        <Header user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={user ? <Navigate to={`/${user.role}`} /> : <Log onLogin={handleLogin} />} />
          <Route path="/login" element={<Log onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/manager" element={user && user.role === 'manager' ? <ManagerDashboard /> : <Navigate to="/login" />} />
          <Route path="/staff" element={user && user.role === 'staff' ? <StaffDashboard /> : <Navigate to="/login" />} />
          <Route path="/customer" element={user && user.role === 'customer' ? <CustomerDashboard /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
