import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

/**
 * NotificationContext Component
 * Handles the UI and data logic for the NotificationContext module.
 */
const NotificationContext = createContext();

export const NotificationProvider = ({ children, user }) => {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const url = user ? `http://127.0.0.1:8000/api/notifications/?user_id=${user.id}` : 'http://127.0.0.1:8000/api/notifications/';
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
      const response = await axios.post('http://127.0.0.1:8000/api/notifications/', {
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
      await axios.delete(`http://127.0.0.1:8000/api/notifications/${id}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.post('http://127.0.0.1:8000/api/notifications/mark_all_as_read/');
      fetchNotifications();
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
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
