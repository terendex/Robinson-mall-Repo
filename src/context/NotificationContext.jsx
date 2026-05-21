import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

// BUG-01 FIX: Use environment variable instead of hardcoded localhost URL
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * NotificationContext Component
 * Handles the UI and data logic for the NotificationContext module.
 */
const NotificationContext = createContext();

export const NotificationProvider = ({ children, user }) => {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const url = user
        ? `${BASE}/api/notifications/?user_id=${user.id}`
        : `${BASE}/api/notifications/`;
      const response = await axios.get(url);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const addNotification = useCallback(async (notification) => {
    try {
      const response = await axios.post(`${BASE}/api/notifications/`, {
        ...notification,
        notification_type: notification.type || 'info',
      });
      setNotifications(prev => [response.data, ...prev]);
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  }, []);

  const removeNotification = useCallback(async (id) => {
    try {
      await axios.delete(`${BASE}/api/notifications/${id}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await axios.patch(`${BASE}/api/notifications/${id}/`, { is_read: true });
      // Optimistically update local state immediately
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.post(`${BASE}/api/notifications/mark_all_as_read/`);
      // Optimistically update local state immediately — don't wait for next poll
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      addNotification, 
      removeNotification, 
      fetchNotifications,
      markAsRead,
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
