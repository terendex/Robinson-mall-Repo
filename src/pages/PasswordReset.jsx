import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import '../css/PasswordReset.css';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';

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
  const navigate = useNavigate();

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
        setErrorConfig({
          show: true,
          title: 'Invalid Link',
          message: err.response?.data?.detail || 'This password reset link is invalid or has expired.'
        });
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
          setErrorConfig({
            show: true,
            title: 'Session Expired',
            message: 'This password reset session has expired for your security. Please request a new link.'
          });
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
    if (!allRulesPassed) {
      setErrorConfig({
        show: true,
        title: 'Security Requirement',
        message: 'Password does not meet the security requirements. Please check the requirements checklist.'
      });
      return;
    }

    if (password !== confirmPassword) {
      setErrorConfig({
        show: true,
        title: 'Password Mismatch',
        message: 'Passwords do not match. Please ensure both fields are identical.'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/password-reset/${uidb64}/${token}/`,
        { password }
      );
      if (response.status === 200) {
        setSuccessConfig({
          show: true,
          title: 'Password Reset!',
          message: 'Your password has been reset successfully! Redirecting you to login…'
        });
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      let msg = 'Unable to reach the server. Please try again later.';
      if (err.response && err.response.data) {
        msg = err.response.data.detail || 'Failed to reset password. The link may be invalid or expired.';
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
    <>
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

          {/* Alerts and errors are handled by Modals */}

          {isValidating ? (
            <div className="pr-loading-state">
              <span className="spinner"></span>
              <p>Verifying reset link...</p>
            </div>
          ) : tokenValid && !successConfig.show ? (
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
    </>
  );
};

export default PasswordReset;
