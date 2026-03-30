import React, { useContext, useState, useMemo } from 'react';
import NotificationContext from '../../context/NotificationContext';
import '../../css/Notifications.css';

const ManagerNotifications = () => {
  const { notifications, removeNotification, markAllAsRead } = useContext(NotificationContext);
  const [activeTab, setActiveTab] = useState('all');

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter(n => n.notification_type === activeTab);
  }, [notifications, activeTab]);

  const formatFullTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return 'fa-circle-check';
      case 'info': return 'fa-circle-info';
      case 'warning': return 'fa-triangle-exclamation';
      case 'error': return 'fa-circle-exclamation';
      default: return 'fa-bell';
    }
  };

  return (
    <div className="notifications-page">
      <div className="claims-container">
        <header className="claims-header">
          <h1>Manager Notifications</h1>
          <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
            {notifications.length > 0 && (
              <button className="view-details-btn-new" onClick={markAllAsRead}>
                <i className="fa-solid fa-check-double"></i> Mark all as read
              </button>
            )}
          </div>
        </header>

        <div className="claim-table-section">
          <div className="notification-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '1px solid #eee' }}>
            {['all', 'info', 'success', 'warning', 'error'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #c50000' : '2px solid transparent',
                  color: activeTab === tab ? '#c50000' : '#757575',
                  fontWeight: activeTab === tab ? '600' : '400',
                  textTransform: 'capitalize',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="notifications-list-manager">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div key={notification.id} className="notification-card-manager" style={{
                  display: 'flex',
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #f0f0f0',
                  marginBottom: '16px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative'
                }}>
                  <div className={`notification-icon-indicator ${notification.notification_type}`} style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '20px',
                    backgroundColor: notification.notification_type === 'error' ? '#fee2e2' : 
                                     notification.notification_type === 'warning' ? '#fef3c7' :
                                     notification.notification_type === 'success' ? '#dcfce7' : '#e0f2fe',
                    color: notification.notification_type === 'error' ? '#dc2626' : 
                           notification.notification_type === 'warning' ? '#d97706' :
                           notification.notification_type === 'success' ? '#16a34a' : '#0284c7'
                  }}>
                    <i className={`fa-solid ${getNotificationIcon(notification.notification_type)}`}></i>
                  </div>
                  <div className="notification-body" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>{notification.title}</h4>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{formatFullTime(notification.created_at)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>{notification.message}</p>
                  </div>
                  <button 
                    onClick={() => removeNotification(notification.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#d1d5db',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      marginLeft: '15px'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                <i className="fa-solid fa-bell-slash" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
                <p>No notifications found in this category.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerNotifications;
