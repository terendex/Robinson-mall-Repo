import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import '../css/PasswordReset.css';

/**
 * Password rules enforced on reset.
 */
const PASSWORD_RULES = [
  { key: 'length',  label: 'At least 8 characters',                      test: pw => pw.length >= 8 },
  { key: 'upper',   label: 'At least one uppercase letter (A–Z)',         test: pw => /[A-Z]/.test(pw) },
  { key: 'lower',   label: 'At least one lowercase letter (a–z)',         test: pw => /[a-z]/.test(pw) },
  { key: 'special', label: 'At least one special character (!@#$%^&*…)',  test: pw => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw) },
];

const PasswordReset = () => {
  const { uidb64, token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const navigate = useNavigate();

  // ── derived state ──
  const ruleResults  = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) }));
  const allRulesPassed = ruleResults.every(r => r.passed);
  const passedCount  = ruleResults.filter(r => r.passed).length;
  const strengthPct  = (passedCount / PASSWORD_RULES.length) * 100;
  const strengthLabel =
    passedCount === 0 ? '' :
    passedCount === 1 ? 'Weak' :
    passedCount === 2 ? 'Fair' :
    passedCount === 3 ? 'Good' : 'Strong';
  const strengthClass =
    passedCount <= 1 ? 'weak' :
    passedCount === 2 ? 'fair' :
    passedCount === 3 ? 'good' : 'strong';

  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        await axios.get(`${import.meta.env.VITE_API_URL}/api/users/password-reset/${uidb64}/${token}/`);
        setTokenValid(true);
      } catch (err) {
        setError(err.response?.data?.detail || 'This password reset link is invalid or has expired.');
        setTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };
    validateToken();
  }, [uidb64, token]);

  // Page Expiration Timer (5 Minutes)
  useEffect(() => {
    if (!tokenValid || message) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTokenValid(false);
          setError('This password reset session has expired for your security. Please request a new link.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenValid, message]);

  // Format time for display (optional, but good for UX)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!allRulesPassed) {
      setError('Password does not meet the security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/password-reset/${uidb64}/${token}/`,
        { password }
      );
      if (response.status === 200) {
        setMessage('Your password has been reset successfully! Redirecting you to login…');
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.detail || 'Failed to reset password. The link may be invalid or expired.');
      } else {
        setError('Unable to reach the server. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-reset-page">
      <div className="password-reset-container">
        <div className="password-reset-card">

          {/* Icon */}
          <div className="pr-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>

          <h2>Reset Your Password</h2>
          <p>Choose a strong new password for your account.</p>

          {tokenValid && !message && (
            <div className={`pr-timer ${timeLeft < 60 ? 'timer-low' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Session expires in: <strong>{formatTime(timeLeft)}</strong></span>
            </div>
          )}

          {message && (
            <div className="pr-success">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p>{message}</p>
            </div>
          )}

          {error && (
            <div className="pr-error">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>{error}</p>
            </div>
          )}

          {isValidating ? (
            <div className="pr-loading-state">
              <span className="spinner"></span>
              <p>Verifying reset link...</p>
            </div>
          ) : tokenValid && !message ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="pr-password">New Password</label>
                <div className="password-wrapper">
                  <input
                    id="pr-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="pw-strength-wrap">
                    <div className="pw-strength-bar">
                      <div className={`pw-strength-fill ${strengthClass}`} style={{ width: `${strengthPct}%` }} />
                    </div>
                    <span className={`pw-strength-label ${strengthClass}`}>{strengthLabel}</span>
                  </div>
                )}

                {/* Requirements checklist */}
                <ul className="pw-requirements" style={{ marginTop: '16px' }}>
                  {ruleResults.map(r => (
                    <li key={r.key} className={r.passed ? 'req-pass' : 'req-fail'}>
                      {r.passed ? <FaCheck className="req-icon" /> : <FaTimes className="req-icon" />}
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="form-group">
                <label htmlFor="pr-confirm">Confirm New Password</label>
                <div className="password-wrapper">
                  <input
                    id="pr-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-btn"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px', display: 'block' }}>
                    <FaTimes /> Passwords do not match.
                  </span>
                )}
              </div>

              <button type="submit" className="submit-btn" disabled={loading || !allRulesPassed}>
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    Resetting…
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          ) : null}

          {!message && (
            <div className="back-link">
              <Link to="/forgot-password">← Request a new link</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
