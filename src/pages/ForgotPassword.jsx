import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/ForgotPassword.css';

/**
 * ForgotPassword Component
 * Handles the UI and data logic for the ForgotPassword module.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/users/password-reset-request/', { email });
      if (response.status === 200) {
        setMessage('An email with instructions to reset your password has been sent to your email address.');
      } else {
        setError(response.data.detail || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.detail || 'Failed to send reset email. Please check your email address and try again.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <h2>Forgot Your Password?</h2>
          <p>Enter your email address, and we will send you a link to reset your password.</p>
          {message && <p className="message">{message}</p>}
          {error && (
            <div className="error-container">
              <span className="error-icon">ⓘ</span>
              <div className="error-text-container">
                <p className="error-title">Request Failed</p>
                <p className="error-message">{error}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="submit-btn">Send Reset Link</button>
          </form>
          <div className="back-link" style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#C40000', fontWeight: 600, textDecoration: 'none' }}>Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
