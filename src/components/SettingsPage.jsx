import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/Settings.css';

/**
 * SettingsPage — shared across admin, manager, and staff layouts.
 * Tabs: General (profile info) | Security (password change) | Notifications (toggles)
 */
const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  // ── General tab state ──
  const [profile, setProfile] = useState({
    first_name: storedUser.first_name || '',
    last_name:  storedUser.last_name  || '',
    email:      storedUser.email      || '',
    username:   storedUser.username   || '',
    phone_number: '',
  });
  const [profileStatus, setProfileStatus] = useState({ type: '', msg: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Security tab state ──
  const [security, setSecurity] = useState({
    current_password: '',
    new_password:     '',
    confirm_password: '',
  });
  const [securityStatus, setSecurityStatus] = useState({ type: '', msg: '' });
  const [securitySaving, setSecuritySaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // ── Notifications tab state ──
  const [notifPrefs, setNotifPrefs] = useState({
    email_notifications: true,
    push_notifications:  true,
    sms_notifications:   false,
  });

  // Load full profile from API on mount
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/users/me/`)
      .then(res => {
        setProfile({
          first_name:   res.data.first_name   || '',
          last_name:    res.data.last_name    || '',
          email:        res.data.email        || '',
          username:     res.data.username     || '',
          phone_number: res.data.phone_number || '',
        });
      })
      .catch(err => console.error('Failed to load profile:', err));
  }, []);

  // ── Save profile ──
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileStatus({ type: '', msg: '' });
    try {
      const res = await axios.patch(`${import.meta.env.VITE_API_URL}/api/users/me/`, {
        first_name:   profile.first_name,
        last_name:    profile.last_name,
        email:        profile.email,
        phone_number: profile.phone_number,
      });
      // Update localStorage so other parts of the app reflect the change
      const updated = { ...storedUser, ...res.data };
      localStorage.setItem('user', JSON.stringify(updated));
      setProfileStatus({ type: 'success', msg: 'Profile updated successfully.' });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to save changes.';
      setProfileStatus({ type: 'error', msg: detail });
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Save password ──
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (security.new_password !== security.confirm_password) {
      setSecurityStatus({ type: 'error', msg: 'New passwords do not match.' });
      return;
    }
    if (security.new_password.length < 8) {
      setSecurityStatus({ type: 'error', msg: 'Password must be at least 8 characters.' });
      return;
    }
    setSecuritySaving(true);
    setSecurityStatus({ type: '', msg: '' });
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/users/me/`, {
        old_password: security.current_password,
        new_password: security.new_password,
      });
      setSecurity({ current_password: '', new_password: '', confirm_password: '' });
      setSecurityStatus({ type: 'success', msg: 'Password updated successfully.' });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to update password.';
      setSecurityStatus({ type: 'error', msg: detail });
    } finally {
      setSecuritySaving(false);
    }
  };

  const roleLabel = {
    admin:    'Administrator',
    manager:  'Manager',
    staff:    'Staff',
    customer: 'Customer',
  }[storedUser.role] || storedUser.role;

  const tabs = [
    { id: 'general',       label: 'General',       icon: 'fa-user' },
    { id: 'security',      label: 'Security',      icon: 'fa-shield-halved' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1>System Settings</h1>
          <p>Manage your account information, security, and notification preferences.</p>
        </div>

        <div className="settings-content">
          {/* ── Sidebar tabs ── */}
          <div className="settings-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <i className={`fa-solid ${t.icon}`}></i>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Pane ── */}
          <div className="settings-pane">

            {/* ── General Tab ── */}
            {activeTab === 'general' && (
              <div className="settings-section">
                <h3>Profile Information</h3>

                {/* Avatar area */}
                <div className="profile-avatar-large">
                  <div className="settings-avatar-circle">
                    {profile.first_name
                      ? profile.first_name.charAt(0).toUpperCase() + (profile.last_name?.charAt(0) || '').toUpperCase()
                      : <i className="fa-solid fa-user"></i>
                    }
                  </div>
                  <div>
                    <div className="settings-avatar-name">
                      {profile.first_name} {profile.last_name}
                    </div>
                    <div className="settings-avatar-role">{roleLabel}</div>
                  </div>
                </div>

                <form className="settings-form" onSubmit={handleProfileSave}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        value={profile.first_name}
                        onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                        placeholder="First name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        value={profile.last_name}
                        onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@robinsonsmalls.com"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Username</label>
                      <input
                        type="text"
                        value={profile.username}
                        readOnly
                        className="settings-input-readonly"
                        title="Username cannot be changed"
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={profile.phone_number}
                        onChange={e => setProfile(p => ({ ...p, phone_number: e.target.value }))}
                        placeholder="+63 917 000 0000"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <input
                      type="text"
                      value={roleLabel}
                      readOnly
                      className="settings-input-readonly role-input"
                    />
                  </div>

                  {profileStatus.msg && (
                    <div className={`settings-status-msg ${profileStatus.type}`}>
                      <i className={`fa-solid ${profileStatus.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                      {profileStatus.msg}
                    </div>
                  )}

                  <div className="settings-form-actions">
                    <button type="button" className="settings-cancel-btn" onClick={() => setProfileStatus({ type: '', msg: '' })}>
                      Cancel
                    </button>
                    <button type="submit" className="settings-save-btn" disabled={profileSaving}>
                      {profileSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : 'Save All Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Security Tab ── */}
            {activeTab === 'security' && (
              <div className="settings-section">
                <h3>Change Password</h3>
                <form className="settings-form" onSubmit={handlePasswordSave}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <div className="settings-input-wrap">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={security.current_password}
                        onChange={e => setSecurity(s => ({ ...s, current_password: e.target.value }))}
                        placeholder="Enter current password"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <div className="settings-input-wrap">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={security.new_password}
                        onChange={e => setSecurity(s => ({ ...s, new_password: e.target.value }))}
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <div className="settings-input-wrap">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={security.confirm_password}
                        onChange={e => setSecurity(s => ({ ...s, confirm_password: e.target.value }))}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                  </div>

                  <label className="settings-show-password">
                    <input
                      type="checkbox"
                      checked={showPasswords}
                      onChange={e => setShowPasswords(e.target.checked)}
                    />
                    Show passwords
                  </label>

                  {securityStatus.msg && (
                    <div className={`settings-status-msg ${securityStatus.type}`}>
                      <i className={`fa-solid ${securityStatus.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                      {securityStatus.msg}
                    </div>
                  )}

                  <div className="settings-form-actions">
                    <button
                      type="button"
                      className="settings-cancel-btn"
                      onClick={() => {
                        setSecurity({ current_password: '', new_password: '', confirm_password: '' });
                        setSecurityStatus({ type: '', msg: '' });
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="settings-save-btn" disabled={securitySaving}>
                      {securitySaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Updating…</> : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Notifications Tab ── */}
            {activeTab === 'notifications' && (
              <div className="settings-section">
                <h3>Notification Preferences</h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  Choose how you'd like to be notified about activity.
                </p>

                <div className="toggle-list">
                  {[
                    {
                      key: 'email_notifications',
                      label: 'Email Notifications',
                      desc: 'Receive updates and alerts to your email address',
                    },
                    {
                      key: 'push_notifications',
                      label: 'Push Notifications',
                      desc: 'Receive in-app and browser push notifications',
                    },
                    {
                      key: 'sms_notifications',
                      label: 'SMS Notifications',
                      desc: 'Receive important alerts via text message',
                    },
                  ].map(item => (
                    <div key={item.key} className="toggle-item">
                      <div className="toggle-info">
                        <span className="toggle-label">{item.label}</span>
                        <span className="toggle-desc">{item.desc}</span>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={notifPrefs[item.key]}
                          onChange={e => setNotifPrefs(p => ({ ...p, [item.key]: e.target.checked }))}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="settings-form-actions" style={{ marginTop: '2rem' }}>
                  <button type="button" className="settings-cancel-btn">Cancel</button>
                  <button
                    type="button"
                    className="settings-save-btn"
                    onClick={() => alert('Notification preferences saved (UI only).')}
                  >
                    Save All Changes
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
