import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../css/PasswordReset.css';

/**
 * PasswordReset Component
 * Handles the UI and data logic for the PasswordReset module.
 */
const PasswordReset = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const response = await axios.post(`http://localhost:8000/api/users/password-reset/${token}/`, { password });
      if (response.status === 200) {
        setMessage('Your password has been successfully reset. You can now log in with your new password.');
        setTimeout(() => navigate('/login'), 5000);
      } else {
        setError(response.data.detail || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.detail || 'Failed to reset password. The link may be invalid or expired.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    }
  };

  return (
    <div className="password-reset-page">
      <div className="password-reset-container">
        <div className="password-reset-card">
          <h2>Reset Your Password</h2>
          {message && <p className="message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
          {!message && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="submit-btn">Reset Password</button>
            </form>
          )}
          <div className="back-link" style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link to="/forgot-password" style={{ color: '#C40000', fontWeight: 600, textDecoration: 'none' }}>Back to Forgot Password</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
