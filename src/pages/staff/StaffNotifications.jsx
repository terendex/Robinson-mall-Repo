import React, { useContext, useMemo } from 'react';
import NotificationContext from '../../context/NotificationContext';
import '../../css/Notifications.css';

/**
 * StaffNotifications Component
 * Uses the same layout/style as Admin Notifications,
 * but filters to staff-relevant notifications only.
 */
const StaffNotifications = () => {
  const { notifications, removeNotification, markAsRead, markAllAsRead } = useContext(NotificationContext);

  // Filter notifications relevant to staff
  const staffNotifications = useMemo(() => {
    const keywords = ['voucher', 'campaign', 'claim', 'transaction'];
    return notifications.filter(n => {
      const msg = (n.message || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      return keywords.some(k => msg.includes(k) || title.includes(k));
    });
  }, [notifications]);

  const unreadCount = staffNotifications.filter(n => !n.is_read).length;

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
    staffNotifications.forEach(n => removeNotification(n.id));
  };

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <h1>Staff Notifications</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button className="mark-read-btn" onClick={markAllAsRead}>
              <i className="fa-solid fa-check-double"></i> Mark all as read
            </button>
          )}
          {staffNotifications.length > 0 && (
            <button className="clear-all-btn" onClick={clearAllNotifications}>
              Clear All
            </button>
          )}
        </div>
      </header>

      <div className="notifications-container">
        {staffNotifications.length > 0 ? (
          staffNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-full-item${!notification.is_read ? ' unread' : ''}`}
              style={{ cursor: !notification.is_read ? 'pointer' : 'default' }}
              onClick={() => { if (!notification.is_read) markAsRead(notification.id); }}
            >
              <div className="notification-icon-wrapper">
                <i className={`fa-solid ${getNotificationIcon(notification.notification_type)}`}></i>
              </div>
              <div className="notification-full-content">
                <div className="notification-full-header">
                  <span className="notification-full-title">
                    {notification.title || 'Notification'}
                    {!notification.is_read && <span className="unread-badge">New</span>}
                  </span>
                  <span className="notification-full-time">{formatFullTime(notification.created_at)}</span>
                </div>
                <p className="notification-full-message">{notification.message}</p>
              </div>
              <div className="notification-full-actions">
                <button 
                  className="notification-delete-btn" 
                  onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
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

export default StaffNotifications;
