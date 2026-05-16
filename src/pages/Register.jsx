import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import ErrorModal from '../components/ErrorModal';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/Register.css';

/**
 * Password rules enforced on sign-up (must mirror SettingsPage security tab).
 */
const PASSWORD_RULES = [
  { key: 'length',  label: 'At least 8 characters',                      test: pw => pw.length >= 8 },
  { key: 'upper',   label: 'At least one uppercase letter (A–Z)',         test: pw => /[A-Z]/.test(pw) },
  { key: 'lower',   label: 'At least one lowercase letter (a–z)',         test: pw => /[a-z]/.test(pw) },
  { key: 'special', label: 'At least one special character (!@#$%^&*…)',  test: pw => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(pw) },
];

/** Strict email-format validator. */
const isValidEmailFormat = (email) =>
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());

/**
 * Register Component
 * Handles the UI and data logic for the Register module.
 */
const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [birthday, setBirthday] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreePromotions, setAgreePromotions] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [errorConfig, setErrorConfig] = useState({
    show: false,
    title: '',
    message: ''
  });
  const navigate = useNavigate();
  const datepickerRef = useRef(null);

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

  const emailError =
    emailTouched && email && !isValidEmailFormat(email)
      ? 'Please enter a valid email address (e.g. user@example.com).'
      : '';

  const openDatePicker = () => {
    if (datepickerRef.current) datepickerRef.current.setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailTouched(true);

    // ── client-side guards ──
    if (!isValidEmailFormat(email)) {
      setErrorConfig({
        show: true,
        title: 'Invalid Email',
        message: 'Please enter a valid email address (e.g. user@example.com).'
      });
      return;
    }
    if (!allRulesPassed) {
      setErrorConfig({
        show: true,
        title: 'Security Requirement',
        message: 'Your password does not meet the required criteria. Please follow the checklist provided.'
      });
      return;
    }
    if (password !== confirmPassword) {
      setErrorConfig({
        show: true,
        title: 'Password Mismatch',
        message: 'The confirmation password does not match. Please re-enter your password.'
      });
      return;
    }
    if (!agreePromotions || !agreePrivacy) {
      setErrorConfig({
        show: true,
        title: 'Agreement Required',
        message: "To complete your registration at Robinson Mall, please review and agree to our advertising promotions and privacy policy. This ensures you stay updated on the latest rewards and your data remains protected."
      });
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/users/register/`, {
        first_name: firstName,
        last_name: lastName,
        email: email,
        birthday: birthday ? birthday.toISOString().split('T')[0] : null,
        password: password,
        role: 'customer',
        username: email,
      });

      if (response.status === 201) {
        navigate('/login');
      }
    } catch (err) {
      let msg = 'Failed to create account. Please try again later.';
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.email || errorData.username) {
          msg = "A user with that email already exists. Please try logging in instead.";
        } else {
          const errorMessages = Object.values(errorData).flat();
          msg = errorMessages[0] || msg;
        }
      }
      setErrorConfig({
        show: true,
        title: 'Registration Failed',
        message: msg
      });
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="system-title">
            <p className="system-title-main">VOUCHER GENERATION AND CLAIMING MANAGEMENT</p>
            <p className="system-title-sub">INFORMATION SYSTEM</p>
          </div>
          <h2>Create Account</h2>

          {/* Error display is handled by ErrorModal */}

          <form onSubmit={handleSubmit}>
            {/* First Name */}
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className={`form-group ${emailError ? 'field-error' : ''}`}>
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailTouched(true); }}
                onBlur={() => setEmailTouched(true)}
                required
              />
              {emailError && (
                <span className="field-error-msg">
                  <FaTimes className="field-error-icon" /> {emailError}
                </span>
              )}
            </div>

            {/* Birthday */}
            <div className="form-group birthday-group">
              <label>Birthday</label>
              <div className="datepicker-container">
                <DatePicker
                  ref={datepickerRef}
                  selected={birthday}
                  onChange={(date) => setBirthday(date)}
                  placeholderText="mm/dd/yyyy"
                  showYearDropdown={false}
                  showMonthDropdown={false}
                  maxDate={new Date()}
                  renderCustomHeader={({
                    date, changeYear, changeMonth,
                    decreaseMonth, increaseMonth,
                    prevMonthButtonDisabled, nextMonthButtonDisabled,
                  }) => (
                    <div className="custom-datepicker-header">
                      <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} type="button">{"<"}</button>
                      <select value={date.getFullYear()} onChange={({ target: { value } }) => changeYear(value)}>
                        {Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <select
                        value={new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)}
                        onChange={({ target: { value } }) => changeMonth(new Date(Date.parse(value + " 1, 2012")).getMonth())}
                      >
                        {["January","February","March","April","May","June","July","August","September","October","November","December"]
                          .map((month) => <option key={month} value={month}>{month}</option>)}
                      </select>
                      <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} type="button">{">"}</button>
                    </div>
                  )}
                />
                <i className="fa-regular fa-calendar" onClick={openDatePicker}></i>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label>Password *</label>
              <div className="pw-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowPassword(v => !v)} className="pw-eye-icon" title={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              {/* Strength bar — only shown once user starts typing */}
              {password.length > 0 && (
                <div className="pw-strength-wrap">
                  <div className="pw-strength-bar">
                    <div className={`pw-strength-fill ${strengthClass}`} style={{ width: `${strengthPct}%` }} />
                  </div>
                  <span className={`pw-strength-label ${strengthClass}`}>{strengthLabel}</span>
                </div>
              )}

              {/* Requirements checklist */}
              <ul className="pw-requirements">
                {ruleResults.map(r => (
                  <li key={r.key} className={r.passed ? 'req-pass' : 'req-fail'}>
                    {r.passed ? <FaCheck className="req-icon" /> : <FaTimes className="req-icon" />}
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label>Confirm Password *</label>
              <div className="pw-input-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowConfirm(v => !v)} className="pw-eye-icon" title={showConfirm ? 'Hide' : 'Show'}>
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span className="field-error-msg">
                  <FaTimes className="field-error-icon" /> Passwords do not match.
                </span>
              )}
              {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                <span className="field-success-msg">
                  <FaCheck className="field-success-icon" /> Passwords match.
                </span>
              )}
            </div>

            {/* Checkboxes */}
            <div className="form-check">
              <input type="checkbox" id="promotions" checked={agreePromotions} onChange={() => setAgreePromotions(!agreePromotions)} />
              <label htmlFor="promotions">
                I agree to receive advertising and promotions from Robinsons Malls
              </label>
            </div>
            <div className="form-check">
              <input type="checkbox" id="privacy" checked={agreePrivacy} onChange={() => setAgreePrivacy(!agreePrivacy)} />
              <label htmlFor="privacy">
                I have read and agree to the Robinsons Malls'{' '}
                <Link to="/privacy-policy" className="privacy-link">Privacy Policy</Link>
              </label>
            </div>

            <button type="submit" className="signup-btn">Sign Up</button>
          </form>

          <p className="login-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>

      <ErrorModal 
        {...errorConfig}
        onClose={() => setErrorConfig(p => ({ ...p, show: false }))}
      />
    </div>
  );
};

export default Register;
