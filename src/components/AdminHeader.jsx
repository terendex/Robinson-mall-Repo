import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminHeader.css';
import robinsonsLogo from '../assets/Robinson_logo.png';

const AdminHeader = ({ toggleSidebar, user, isSidebarOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPages, setFilteredPages] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const adminPages = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'fa-table-cells-large' },
    { name: 'Vouchers', path: '/admin/vouchers', icon: 'fa-ticket-simple' },
    { name: 'Campaigns', path: '/admin/campaigns', icon: 'fa-tag' },
    { name: 'Claims', path: '/admin/claims', icon: 'fa-gift' },
    { name: 'Transactions', path: '/admin/transactions', icon: 'fa-clock-rotate-left' },
    { name: 'Users', path: '/admin/users', icon: 'fa-user-group' },
    { name: 'Reports', path: '/admin/reports', icon: 'fa-chart-simple' },
    { name: 'Settings', path: '/admin/settings', icon: 'fa-gear' },
  ];

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPages([]);
      setShowDropdown(false);
    } else {
      const results = adminPages.filter(page =>
        page.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPages(results);
      setShowDropdown(true);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
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
          <div className="header-icon-btn">
            <i className="fa-solid fa-envelope"></i>
            <span className="notification-dot"></span>
          </div>
          <div className="header-icon-btn">
            <i className="fa-solid fa-question-circle"></i>
          </div>
          <div className="header-icon-btn">
            <i className="fa-solid fa-bell"></i>
            <span className="notification-dot"></span>
          </div>
          
          <div className="header-user-profile">
            <div className="profile-avatar">
              <i className="fa-solid fa-user-circle"></i>
            </div>
            <i className="fa-solid fa-chevron-down profile-caret hide-mobile"></i>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
