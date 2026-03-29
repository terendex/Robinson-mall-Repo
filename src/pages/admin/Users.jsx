import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import UserModal from '../../components/UserModal';
import ResetPasswordModal from '../../components/ResetPasswordModal';
import '../../styles/Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToReset, setUserToReset] = useState(null);
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

  const handleResetPassword = (user) => {
    setUserToReset(user);
    setShowResetModal(true);
    setActiveActions(null);
  };

  const handleSaveUser = async (formData) => {
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name
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
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user. Please check if username/email already exists.');
    }
  };

  const handleResetPasswordSubmit = async (newPassword) => {
    try {
      await axios.patch(`http://127.0.0.1:8000/api/users/${userToReset.id}/`, {
        password: newPassword
      });
      alert(`Password for ${userToReset.username} has been reset successfully.`);
      setShowResetModal(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password.');
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
    return users.filter(user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.first_name + ' ' + user.last_name).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalCustomers: users.filter(u => u.role === 'customer').length,
      staffMembers: users.filter(u => u.role === 'staff').length,
      storeManagers: users.filter(u => u.role === 'manager').length,
      activeNow: users.filter(u => u.is_active).length,
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

        <div className="users-stats">
          <div className="stat-card">
            <p>Total Customers</p>
            <h2>{stats.totalCustomers}</h2>
          </div>
          <div className="stat-card">
            <p>Staff Members</p>
            <h2>{stats.staffMembers}</h2>
          </div>
          <div className="stat-card">
            <p>Store Managers</p>
            <h2>{stats.storeManagers}</h2>
          </div>
          <div className="stat-card">
            <p>Active Now</p>
            <h2>{stats.activeNow}</h2>
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
                        <div className="user-avatar" style={{ backgroundColor: user.role === 'admin' ? '#c50000' : '#555' }}>
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
                          <button onClick={() => handleResetPassword(user)}>
                            <i className="fa-solid fa-key"></i> Reset Password
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

      <ResetPasswordModal
        show={showResetModal}
        user={userToReset}
        onClose={() => setShowResetModal(false)}
        onSave={handleResetPasswordSubmit}
      />
    </div>
  );
};

export default Users;
