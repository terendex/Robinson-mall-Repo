import React, { useContext, useMemo } from 'react';
import NotificationContext from '../../context/NotificationContext';
import '../../css/Notifications.css';

/**
 * StaffNotifications Component
 * Handles the UI and data logic for the StaffNotifications module.
 */
const StaffNotifications = () => {
  const { notifications, removeNotification, markAllAsRead } = useContext(NotificationContext);

  // Filter notifications for staff (relevant only to vouchers, campaigns, claims)
  const staffNotifications = useMemo(() => {
    const keywords = ['voucher', 'campaign', 'claim', 'transaction'];
    return notifications.filter(n => {
      const msg = (n.message || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      return keywords.some(k => msg.includes(k) || title.includes(k));
    });
  }, [notifications]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <div className="header-top">
            <h1>Staff Notifications</h1>
            <button className="mark-read-btn" onClick={markAllAsRead}>
              <i className="fa-solid fa-check-double"></i> Mark all as read
            </button>
          </div>
          <p>Stay updated with the latest voucher and claim activity</p>
        </div>

        <div className="notifications-list">
          {staffNotifications.length > 0 ? (
            staffNotifications.map((notification) => (
              <div key={notification.id} className="notification-card">
                <div className="notification-icon">
                  <i className={`fa-solid ${notification.icon || 'fa-bell'}`}></i>
                </div>
                <div className="notification-body">
                  <div className="body-header">
                    <span className="notification-title">{notification.title || 'System Notification'}</span>
                    <span className="notification-time">{formatDate(notification.created_at)}</span>
                  </div>
                  <p className="notification-msg">{notification.message}</p>
                </div>
                <button 
                  className="delete-notification-btn" 
                  onClick={() => removeNotification(notification.id)}
                  title="Remove notification"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))
          ) : (
            <div className="notifications-empty-state">
              <i className="fa-solid fa-bell-slash"></i>
              <h3>No new notifications</h3>
              <p>You're all caught up! We'll notify you when something important happens.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffNotifications;
