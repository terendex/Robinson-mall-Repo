import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import axios from 'axios';
import UserModal from '../../components/UserModal';
import ResetPasswordModal from '../../components/ResetPasswordModal';
import Pagination from '../../components/Pagination';
import ActionConfirmModal from '../../components/ActionConfirmModal';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import '../../css/Users.css';
import NotificationContext from '../../context/NotificationContext';
import '../../css/Claims.css';
import '../../css/Transactions.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Users Component
 * Handles the UI and data logic for the Users module.
 */
const PAGE_SIZE = 10;

const Users = () => {
  const { addNotification } = useContext(NotificationContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilters, setRoleFilters] = useState({ manager: false, staff: false, customer: false });
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleFilterRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [activeActions, setActiveActions] = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const actionsRef = useRef(null);

  const [confirmConfig, setConfirmConfig] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'primary',
    onConfirm: () => {}
  });

  const [successConfig, setSuccessConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  const [errorConfig, setErrorConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchUsers();
    
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActiveActions(null);
      }
      if (roleFilterRef.current && !roleFilterRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE}/api/users/`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      // M-12 FIX: Surface the error to the admin instead of silently keeping stale data.
      const code = error?.response?.status;
      setErrorConfig({
        show: true,
        title: code === 401 || code === 403 ? 'Session Expired' : 'Failed to Load Users',
        message:
          code === 401 || code === 403
            ? 'Your session has expired. Please log out and log back in to view current user data.'
            : 'Could not retrieve the user list. The data shown may be outdated. Please refresh the page.',
      });
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
        email: formData.email,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password
      };

      if (!payload.password) {
        delete payload.password;
      }

      if (userToEdit) {
        // Update user
        const response = await axios.patch(`${BASE}/api/users/${userToEdit.id}/`, payload);
        setUsers(users.map(u => u.id === userToEdit.id ? response.data : u));
      } else {
        // Create new user (explicitly set is_active to true)
        const response = await axios.post(`${BASE}/api/users/`, { ...payload, is_active: true });
        setUsers([response.data, ...users]);
      }
      
      setShowModal(false);

      // If we just created/promoted a new admin, the current admin account is demoted in backend.
      // We must log out the current user to reflect their new manager status.
      if (formData.role === 'admin') {
        setSuccessConfig({
          show: true,
          title: 'Admin Replacement Active',
          message: 'A new Admin has been established. For security, your session will now end as you have been reassigned to Manager status.',
          onClose: () => {
            ['user', 'accessToken', 'refreshToken'].forEach(k => {
              localStorage.removeItem(k);
              sessionStorage.removeItem(k);
            });
            window.location.href = '/login';
          }
        });
      } else {
        addNotification({
          title: userToEdit ? 'User Updated' : 'User Created',
          message: `The account for ${formData.email} has been ${userToEdit ? 'updated' : 'created'}.`,
          type: 'success'
        });
        setSuccessConfig({
          show: true,
          title: userToEdit ? 'User Updated!' : 'User Created!',
          message: `The account for ${formData.email} has been ${userToEdit ? 'updated' : 'created'} successfully.`
        });
      }
    } catch (error) {
      console.error('Error saving user:', error);
      // Extract specific error message from backend (e.g. "email already exists")
      const errorData = error.response?.data;
      let errorMessage = 'Failed to save user.';
      
      if (errorData) {
        if (typeof errorData === 'object') {
          errorMessage = Object.entries(errorData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`)
            .join('\n');
        } else {
          errorMessage = errorData;
        }
      }
      
      setErrorConfig({
        show: true,
        title: 'Save Failed',
        message: errorMessage
      });
    }
  };

  const requestSaveUserConfirm = (formData) => {
    setConfirmConfig({
      show: true,
      title: userToEdit ? 'Confirm Edit' : 'Confirm Add',
      message: `Are you sure you want to ${userToEdit ? 'update' : 'create'} this user account?`,
      confirmText: userToEdit ? 'Save Changes' : 'Create User',
      variant: 'success',
      onConfirm: () => handleSaveUser(formData)
    });
  };

  const toggleUserActive = async (user) => {
    try {
      const response = await axios.patch(`${BASE}/api/users/${user.id}/`, {
        is_active: !user.is_active
      });
      setUsers(users.map(u => u.id === user.id ? response.data : u));
      setActiveActions(null);
      addNotification({
        title: response.data.is_active ? 'Account Enabled' : 'Account Disabled',
        message: `The account for ${user.email} is now ${response.data.is_active ? 'active' : 'inactive'}.`,
        type: 'info'
      });
      setSuccessConfig({
        show: true,
        title: response.data.is_active ? 'Account Enabled' : 'Account Disabled',
        message: `The user account for ${user.email} is now ${response.data.is_active ? 'active' : 'inactive'}.`
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      setErrorConfig({
        show: true,
        title: 'Update Failed',
        message: 'Failed to update user status. Please try again.'
      });
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await axios.delete(`${BASE}/api/users/${user.id}/`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      addNotification({
        title: 'User Deleted',
        message: `The account for ${user.email} has been permanently removed.`,
        type: 'warning'
      });
      setSuccessConfig({
        show: true,
        title: 'User Deleted',
        message: `The account for ${user.email} has been permanently removed.`
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrorConfig({
        show: true,
        title: 'Delete Failed',
        message: 'The user account could not be removed. They may have active claims or transactions.'
      });
    }
  };

  const requestDeleteConfirm = (user) => {
    setActiveActions(null);
    setConfirmConfig({
      show: true,
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete the account for "${user.email}"? This action cannot be undone.`,
      confirmText: 'Delete Account',
      variant: 'danger',
      onConfirm: () => handleDeleteUser(user)
    });
  };

  const requestToggleActiveConfirm = (user) => {
    setActiveActions(null);
    setConfirmConfig({
      show: true,
      title: user.is_active ? 'Disable Account' : 'Enable Account',
      message: `Are you sure you want to ${user.is_active ? 'disable' : 'enable'} the account for ${user.email}?`,
      confirmText: user.is_active ? 'Disable' : 'Enable',
      variant: user.is_active ? 'danger' : 'success',
      onConfirm: () => toggleUserActive(user)
    });
  };

  const handleRoleFilterToggle = (role) => {
    setRoleFilters(prev => ({ ...prev, [role]: !prev[role] }));
    setCurrentPage(1);
  };

  // ISSUE-14 FIX: Remove setCurrentPage side-effect from useMemo
  const filteredUsers = useMemo(() => {
    const anyRoleSelected = Object.values(roleFilters).some(v => v);
    return users.filter(user => {
      // Exclude admins from the display
      if (user.role === 'admin') return false;
      
      const matchesRole = anyRoleSelected ? roleFilters[user.role] : true;
      if (!matchesRole) return false;

      const searchLower = searchQuery.toLowerCase();
      return (
        user.email.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower) ||
        (user.first_name + ' ' + user.last_name).toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchQuery, roleFilters]);

  // Reset to page 1 when search or filter changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // Pagination slice
  const totalPages  = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const pagedUsers  = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
    return user.email;
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
            <div className="claim-table-controls">
              <div className="claim-search-wrapper" style={{ flex: 1 }}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input 
                  type="text" 
                  placeholder="Search by name, email, or role" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-dropdown-container" ref={roleFilterRef}>
                <button 
                  className={`filter-button ${isRoleDropdownOpen ? 'active' : ''}`}
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                >
                  <i className="fa-solid fa-filter"></i> Filter Role
                </button>
                {isRoleDropdownOpen && (
                  <div className="filter-dropdown-menu">
                    {[
                      { val: 'manager', lbl: 'Store Manager' },
                      { val: 'staff', lbl: 'Staff Member' },
                      { val: 'customer', lbl: 'Customer' }
                    ].map(({ val, lbl }) => (
                      <label key={val} className="filter-option">
                        <input 
                          type="checkbox" 
                          checked={roleFilters[val]}
                          onChange={() => handleRoleFilterToggle(val)} 
                        /> {lbl}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loader"></div>
            </div>
          ) : (
            <>
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
                  {pagedUsers.length > 0 ? pagedUsers.map((user) => (
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
                      <td>
                        {(() => {
                          const d = new Date(user.date_joined || Date.now());
                          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        })()}
                      </td>
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
                            <button onClick={() => requestToggleActiveConfirm(user)}>
                              <i className={`fa-solid ${user.is_active ? 'fa-user-slash' : 'fa-user-check'}`}></i> 
                              {user.is_active ? 'Disable Account' : 'Enable Account'}
                            </button>
                            <div className="action-divider"></div>
                            <button 
                              onClick={() => requestDeleteConfirm(user)}
                              style={{ color: '#c40000' }}
                            >
                              <i className="fa-solid fa-trash-can"></i> Delete Account
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#9e9e9e' }}>
                        No users found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredUsers.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </div>
      </div>

      <UserModal 
        show={showModal} 
        userToEdit={userToEdit}
        onClose={() => setShowModal(false)} 
        onSave={requestSaveUserConfirm} 
      />

      <ActionConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(p => ({ ...p, show: false }))}
      />

      <SuccessModal 
        {...successConfig}
        onClose={() => {
          setSuccessConfig(p => ({ ...p, show: false }));
          if (successConfig.onClose) successConfig.onClose();
        }}
      />
      <ErrorModal 
        {...errorConfig}
        onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default Users;
