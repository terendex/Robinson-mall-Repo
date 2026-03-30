import React, { useContext } from 'react';
import NotificationContext from '../../context/NotificationContext';
import './Notifications.css';

const Notifications = () => {
  const { notifications, removeNotification } = useContext(NotificationContext);

  const formatFullTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'info': return 'fa-info-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-exclamation-circle';
      default: return 'fa-bell';
    }
  };

  const clearAllNotifications = () => {
    notifications.forEach(n => removeNotification(n.id));
  };

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <h1>Notifications</h1>
        {notifications.length > 0 && (
          <button className="clear-all-btn" onClick={clearAllNotifications}>
            Clear All
          </button>
        )}
      </header>

      <div className="notifications-container">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div key={notification.id} className="notification-full-item">
              <div className="notification-icon-wrapper">
                <i className={`fa-solid ${getNotificationIcon(notification.notification_type)}`}></i>
              </div>
              <div className="notification-full-content">
                <div className="notification-full-header">
                  <span className="notification-full-title">{notification.title || 'Notification'}</span>
                  <span className="notification-full-time">{formatFullTime(notification.created_at)}</span>
                </div>
                <p className="notification-full-message">{notification.message}</p>
              </div>
              <div className="notification-full-actions">
                <button 
                  className="notification-delete-btn" 
                  onClick={() => removeNotification(notification.id)}
                  title="Remove"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="notifications-empty-state">
            <i className="fa-solid fa-bell-slash"></i>
            <p>You're all caught up! No recent notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
