import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminHeader.css';
import robinsonsLogo from '../assets/Robinson_logo.png';
import NotificationContext from '../context/NotificationContext';

const AdminHeader = ({ toggleSidebar, user, isSidebarOpen }) => {
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

  const role = user?.role || 'admin';
  const pathPrefix = `/${role}`;

  const availablePages = [
    { name: 'Dashboard', path: `${pathPrefix}/dashboard`, icon: 'fa-table-cells-large' },
    { name: 'Vouchers', path: `${pathPrefix}/vouchers`, icon: 'fa-ticket-simple' },
    { name: 'Campaigns', path: `${pathPrefix}/campaigns`, icon: 'fa-tag' },
    { name: 'Claims', path: `${pathPrefix}/claims`, icon: 'fa-gift' },
    { name: 'Transactions', path: `${pathPrefix}/transactions`, icon: 'fa-clock-rotate-left' },
    ...(role === 'admin' ? [{ name: 'Users', path: `${pathPrefix}/users`, icon: 'fa-user-group' }] : []),
    { name: 'Reports', path: `${pathPrefix}/reports`, icon: 'fa-chart-simple' },
    { name: 'Settings', path: `${pathPrefix}/settings`, icon: 'fa-gear' },
  ];

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
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');
    navigate('/login');
  };

  return (
    <header className="admin-header">
      <div className="admin-logo-section">
        <img src={robinsonsLogo} alt="Robinsons" className="admin-header-logo" />
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
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            {isNotificationDropdownOpen && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <span>Notifications</span>
                </div>
                <div className="notification-list">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div key={notification.id} className="notification-item" onClick={() => navigate(`${pathPrefix}/notifications`)}>
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
                <div className="notification-dropdown-footer" onClick={() => navigate(`${pathPrefix}/notifications`)}>
                  <span>View all notifications</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="header-user-profile" ref={profileDropdownRef}>
            <div onClick={toggleProfileDropdown} style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
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
    </header>
  );
};

export default AdminHeader;
