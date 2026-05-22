import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/AdminHeader.css';
import robinsonsLogo from '../assets/Robinson_logo.png';
import redROB from '../assets/redROB.png';
import NotificationContext from '../context/NotificationContext';
import ActionConfirmModal from './ActionConfirmModal';

/**
 * AdminHeader Component
 * Handles the UI and data logic for the AdminHeader module.
 */
const AdminHeader = ({ toggleSidebar, user, isSidebarOpen, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPages, setFilteredPages] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const { notifications, removeNotification } = useContext(NotificationContext);
  const [confirmConfig, setConfirmConfig] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'primary',
    onConfirm: () => { }
  });

  const role = user?.role || 'admin';
  const pathPrefix = `/${role}`;

  const availablePages = [
    ...(role !== 'staff' ? [{ name: 'Dashboard', path: `${pathPrefix}/dashboard`, icon: 'fa-table-cells-large' }] : []),
    { name: role === 'customer' ? 'Active Campaigns' : 'Campaigns', path: `${pathPrefix}/campaigns`, icon: 'fa-tag' },
    { name: role === 'customer' ? 'My Vouchers' : 'Vouchers', path: `${pathPrefix}/vouchers`, icon: 'fa-ticket-simple' },
    ...(role === 'admin' || role === 'manager' ? [{ name: 'Shops', path: `${pathPrefix}/shops`, icon: 'fa-store' }] : []),
    { name: role === 'customer' ? 'My Claims' : 'Claims', path: `${pathPrefix}/claims`, icon: 'fa-gift' },
    ...(role === 'admin' ? [{ name: 'Users', path: `${pathPrefix}/users`, icon: 'fa-user-group' }] : []),
    { name: 'Transactions', path: `${pathPrefix}/transactions`, icon: 'fa-clock-rotate-left' },
    ...(role !== 'staff' && role !== 'customer' ? [{ name: 'Reports', path: `${pathPrefix}/reports`, icon: 'fa-chart-simple' }] : []),
    { name: 'Settings', path: `${pathPrefix}/settings`, icon: 'fa-gear' },
  ];

  const filteredNotifications = useMemo(() => {
    // Admin sees everything
    if (role === 'admin') return notifications;

    // Customers only see their targeted notifications
    if (role === 'customer') return notifications;

    // Staff and Managers filter based on their use cases to reduce noise
    const staffKeywords = ['voucher', 'campaign', 'claim', 'transaction'];
    const managerKeywords = [...staffKeywords, 'customer', 'approval', 'registration', 'store', 'shop'];

    const keywords = role === 'manager' ? managerKeywords : staffKeywords;

    return notifications.filter(n => {
      const msg = (n.message || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      return keywords.some(k => msg.includes(k) || title.includes(k));
    });
  }, [notifications, role]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPages([]);
      setShowDropdown(false);
    } else {
      const results = availablePages.filter(page =>
        page.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPages(results);
      setShowDropdown(true);
    }
  }, [searchQuery, role]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageSelect = (path) => {
    navigate(path);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
  };

  const closeNotificationDropdown = () => {
    setIsNotificationDropdownOpen(false);
  }

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(prev => !prev);
  };

  const handleLogout = () => {
    setIsProfileDropdownOpen(false);
    setConfirmConfig({
      show: true,
      title: 'Log Out',
      message: 'Are you sure you want to sign out of your account?',
      confirmText: 'Log Out',
      variant: 'danger',
      onConfirm: () => {
        if (onLogout) {
          onLogout();
        }
        navigate('/login');
      }
    });
  };

  return (
    <header className="admin-header">
      <div className={`admin-logo-section${!isSidebarOpen ? ' sidebar-closed' : ''}`}>
        <img src={isSidebarOpen ? robinsonsLogo : redROB} alt="Robinsons" className={`admin-header-logo${!isSidebarOpen ? ' red-logo' : ''}`} />
      </div>

      <div className="admin-header-main">
        <div className="admin-header-left">
          <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
            <i className="fa-solid fa-columns"></i>
          </button>
          <div className="header-separator"></div>
          <div className="header-search-container" ref={dropdownRef}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() !== '' && setShowDropdown(true)}
            />
            {showDropdown && filteredPages.length > 0 && (
              <div className="search-results-dropdown">
                <div className="dropdown-header">Quick Results</div>
                {filteredPages.map((page, index) => (
                  <div
                    key={index}
                    className="search-result-item"
                    onClick={() => handlePageSelect(page.path)}
                  >
                    <i className={`fa-solid ${page.icon}`}></i>
                    <span>{page.name}</span>
                  </div>
                ))}
              </div>
            )}
            {showDropdown && filteredPages.length === 0 && (
              <div className="search-results-dropdown no-results">
                No pages found
              </div>
            )}
          </div>
        </div>

        <div className="admin-header-right">
          <div className="header-icon-btn" onClick={() => navigate('/privacy-policy')}>
            <i className="fa-solid fa-question-circle"></i>
          </div>
          <div className="header-icon-btn" ref={notificationDropdownRef}>
            <button className="notification-button" onClick={toggleNotificationDropdown}>
              <i className="fa-solid fa-bell"></i>
              {filteredNotifications.filter(n => !n.is_read).length > 0 && (
                <span className="notification-badge">{filteredNotifications.filter(n => !n.is_read).length}</span>
              )}
            </button>
            {isNotificationDropdownOpen && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <span>Notifications</span>
                </div>
                <div className="notification-list">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <div key={notification.id} className={`notification-item${!notification.is_read ? ' unread' : ''}`} onClick={() => {
                        setIsNotificationDropdownOpen(false);
                        navigate(`${pathPrefix}/notifications`);
                      }}>
                        <div className="notification-item-main">
                          <div className="notification-item-title-row">
                            <span className="notification-item-title">{notification.title || 'Notification'}</span>
                            <span className="notification-item-time">
                              {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="notification-item-message">{notification.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="notification-empty">
                      <p>No new notifications.</p>
                    </div>
                  )}
                </div>
                <div className="notification-dropdown-footer" onClick={() => {
                  setIsNotificationDropdownOpen(false);
                  navigate(`${pathPrefix}/notifications`);
                }}>
                  <span>View all notifications</span>
                </div>
              </div>
            )}
          </div>

          <div className="header-user-profile" ref={profileDropdownRef}>
            <div onClick={toggleProfileDropdown} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <div className="profile-avatar">
                <i className="fa-solid fa-user-circle"></i>
              </div>
              <i className="fa-solid fa-chevron-down profile-caret hide-mobile"></i>
            </div>
            {isProfileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-item" onClick={() => navigate(`${pathPrefix}/settings`)}>
                  <i className="fa-solid fa-gear"></i>
                  <span>Settings</span>
                </div>
                <div className="profile-dropdown-item" onClick={handleLogout}>
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                  <span>Log Out</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ActionConfirmModal
        {...confirmConfig}
        onClose={() => setConfirmConfig(p => ({ ...p, show: false }))}
      />
    </header>
  );
};

export default AdminHeader;
