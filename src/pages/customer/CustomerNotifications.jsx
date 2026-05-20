import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../css/Customer.css';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const typeConfig = {
  success: { icon: 'fa-circle-check',   color: '#15803d', bg: '#f0fdf4', border: '#22c55e' },
  warning: { icon: 'fa-triangle-exclamation', color: '#b45309', bg: '#fffbeb', border: '#fbbf24' },
  error:   { icon: 'fa-circle-xmark',   color: '#b91c1c', bg: '#fef2f2', border: '#ef4444' },
  info:    { icon: 'fa-circle-info',    color: '#1d4ed8', bg: '#eff6ff', border: '#3b82f6' },
};

/**
 * CustomerNotifications Component
 * Handles the UI and data logic for the CustomerNotifications module.
 */
const CustomerNotifications = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(
          `${BASE}/api/notifications/?user_id=${user.id}`
        );
        setNotifications(response.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user.id]);

  const filteredNotifications = React.useMemo(() => {
    const customerKeywords = ['claim', 'voucher', 'campaign', 'reward', 'win', 'congratulations'];
    return notifications.filter(n => {
      const msg = (n.message || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      return customerKeywords.some(k => msg.includes(k) || title.includes(k));
    });
  }, [notifications]);

  if (loading) return (
    <div className="loading">
      <i className="fa-solid fa-spinner fa-spin"></i> Loading notifications...
    </div>
  );

  return (
    <div className="customer-notifications">
      <div className="customer-dashboard-header">
        <h1>Your Notifications</h1>
        <p>Stay updated on your claims and latest offers.</p>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-bell-slash"></i>
          <h3>All caught up!</h3>
          <p>No notifications for you at the moment.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((n) => {
            const cfg = typeConfig[n.notification_type] || typeConfig.info;
            return (
              <div
                key={n.id}
                className="notification-card"
                style={{ borderLeftColor: cfg.border }}
              >
                <div className="notif-icon-wrap" style={{ background: cfg.bg, color: cfg.color }}>
                  <i className={`fa-solid ${cfg.icon}`}></i>
                </div>
                <div className="notif-body">
                  <div className="notif-title">{n.title}</div>
                  <p className="notif-message">{n.message}</p>
                </div>
                <div className="notif-date">
                  <i className="fa-solid fa-clock"></i>
                  {new Date(n.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerNotifications;
