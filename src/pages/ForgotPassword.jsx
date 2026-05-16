import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/ForgotPassword.css';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';

/**
 * ForgotPassword Component
 * Handles the UI and data logic for the ForgotPassword module.
 * Submits the user's email to the backend which dispatches a Gmail reset link.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const [errorConfig, setErrorConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  const [successConfig, setSuccessConfig] = useState({
    show: false,
    title: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorConfig(p => ({ ...p, show: false }));
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/password-reset-request/`,
        { email }
      );
      if (response.status === 200) {
        setSuccessConfig({
          show: true,
          title: 'Link Sent!',
          message: 'A password reset link has been sent to your email. Please check your inbox (and spam folder).'
        });
        setEmail('');
      }
    } catch (err) {
      let msg = 'Unable to reach the server. Please try again later.';
      if (err.response && err.response.data) {
        msg = err.response.data.detail || 'Failed to send reset email. Please check your email address and try again.';
      }
      setErrorConfig({
        show: true,
        title: 'Action Failed',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          {/* Icon */}
          <div className="fp-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2>Forgot Password?</h2>
          <p>Enter the email address linked to your account and we'll send you a secure reset link.</p>

          {/* Feedbacks handled by Modals */}

          {!successConfig.show && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fp-email">Email Address</label>
                <input
                  id="fp-email"
                  type="email"
                  placeholder="yourname@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading || !email}>
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    Sending…
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className="back-link">
            <Link to="/login">← Back to Login</Link>
          </div>
        </div>
      </div>
      <SuccessModal 
        {...successConfig}
        onClose={() => setSuccessConfig(p => ({ ...p, show: false }))}
      />
      <ErrorModal 
        {...errorConfig}
        onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default ForgotPassword;
