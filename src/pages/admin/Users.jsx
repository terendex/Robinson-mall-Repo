import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import UserModal from '../../components/UserModal';
import ResetPasswordModal from '../../components/ResetPasswordModal';
import '../../css/Users.css';
import '../../css/Transactions.css';

/**
 * Users Component
 * Handles the UI and data logic for the Users module.
 */
const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [activeActions, setActiveActions] = useState(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActiveActions(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setUserToEdit(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setShowModal(true);
    setActiveActions(null);
  };

  const handleSaveUser = async (formData) => {
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password
      };

      if (userToEdit) {
        // Update user
        const response = await axios.patch(`http://127.0.0.1:8000/api/users/${userToEdit.id}/`, payload);
        setUsers(users.map(u => u.id === userToEdit.id ? response.data : u));
      } else {
        // Create new user (explicitly set is_active to true)
        const response = await axios.post('http://127.0.0.1:8000/api/users/', { ...payload, is_active: true });
        setUsers([...users, response.data]);
      }
      
      setShowModal(false);

      // If we just created/promoted a new admin, the current admin account is deleted.
      // We must log out the current user.
      if (formData.role === 'admin') {
        alert('A new Admin has been established. This account has been removed. You will now be logged out.');
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user. Please check if username/email already exists.');
    }
  };

  const toggleUserActive = async (user) => {
    try {
      const response = await axios.patch(`http://127.0.0.1:8000/api/users/${user.id}/`, {
        is_active: !user.is_active
      });
      setUsers(users.map(u => u.id === user.id ? response.data : u));
      setActiveActions(null);
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Failed to update user status.');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Exclude admins from the display
      if (user.role === 'admin') return false;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower) ||
        (user.first_name + ' ' + user.last_name).toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchQuery]);

  // Statistics (excluding admins)
  const stats = useMemo(() => {
    const nonAdmins = users.filter(u => u.role !== 'admin');
    return {
      totalCustomers: nonAdmins.filter(u => u.role === 'customer').length,
      staffMembers: nonAdmins.filter(u => u.role === 'staff').length,
      storeManagers: nonAdmins.filter(u => u.role === 'manager').length,
      activeNow: nonAdmins.filter(u => u.is_active).length,
    };
  }, [users]);

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Store Manager';
      case 'staff': return 'Staff Member';
      case 'customer': return 'Customer';
      default: return role;
    }
  };

  const getDisplayName = (user) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name} ${user.last_name}`.trim();
    }
    return user.username;
  };

  const getInitials = (user) => {
    const name = getDisplayName(user);
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="users-page">
      <div className="users-container">
        <div className="users-header">
          <h1>User Directory</h1>
          <button className="add-user-btn" onClick={handleAddUser}>
            <i className="fa-solid fa-user-plus"></i> Add New User
          </button>
        </div>

        <div className="txn-stats">
          <div className="txn-stat-card">
            <div className="stat-title">Total Customers</div>
            <div className="stat-value">{stats.totalCustomers}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">Staff Members</div>
            <div className="stat-value">{stats.staffMembers}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">Store Managers</div>
            <div className="stat-value">{stats.storeManagers}</div>
          </div>
          <div className="txn-stat-card">
            <div className="stat-title">Active Now</div>
            <div className="stat-value">{stats.activeNow}</div>
          </div>
        </div>

        <div className="user-list-section">
          <div className="user-list-header">
            <div className="user-search-pills">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder="Search by name, email, or role" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loader"></div>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Date Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar" style={{ backgroundColor: '#555' }}>
                          {getInitials(user)}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{getDisplayName(user)}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-pill ${user.role}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>{new Date(user.date_joined || Date.now()).toISOString().split('T')[0]}</td>
                    <td>
                      <span className={`status-pill ${user.is_active ? 'active' : 'pending'}`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ position: 'relative' }} ref={activeActions === user.id ? actionsRef : null}>
                      <button 
                        className="action-trigger-btn" 
                        onClick={() => setActiveActions(activeActions === user.id ? null : user.id)}
                      >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                      {activeActions === user.id && (
                        <div className="action-dropdown">
                          <button onClick={() => handleEditUser(user)}>
                            <i className="fa-solid fa-pen-to-square"></i> Edit
                          </button>
                          <button onClick={() => toggleUserActive(user)}>
                            <i className={`fa-solid ${user.is_active ? 'fa-user-slash' : 'fa-user-check'}`}></i> 
                            {user.is_active ? 'Disable Account' : 'Enable Account'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <UserModal 
        show={showModal} 
        userToEdit={userToEdit}
        onClose={() => setShowModal(false)} 
        onSave={handleSaveUser} 
      />
    </div>
  );
};

export default Users;
