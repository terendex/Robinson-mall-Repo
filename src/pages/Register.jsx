import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Modal from '../components/Modal'; // Import the Modal component
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/Register.css';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreePromotions, setAgreePromotions] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const navigate = useNavigate();
  const datepickerRef = useRef(null);

  const openDatePicker = () => {
    if (datepickerRef.current) {
      datepickerRef.current.setOpen(true);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreePromotions || !agreePrivacy) {
      setShowModal(true); // Show the modal
      return;
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/users/register/', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        birthday: birthday ? birthday.toISOString().split('T')[0] : null,
        password: password,
        role: 'customer',
        username: `${firstName}${lastName}`,
      });

      if (response.status === 201) {
        navigate('/login');
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        const errorMessages = Object.values(errorData).flat();
        setError(errorMessages[0] || 'Failed to create account. Please try again.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <h2>Create Account</h2>
          {error && <p className="error-message">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Birthday</label>
              <DatePicker
                ref={datepickerRef}
                selected={birthday}
                onChange={(date) => setBirthday(date)}
                placeholderText="mm/dd/yyyy"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={100}
                scrollableYearDropdown
              />
              <i className="fa-regular fa-calendar" onClick={openDatePicker}></i>
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span onClick={togglePasswordVisibility} className="password-toggle-icon">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
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
                <a href="#" className="privacy-link">
                  Privacy Policy
                </a>
              </label>
            </div>
            <button type="submit" className="signup-btn">
              Sign Up
            </button>
          </form>
          <p className="login-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
      <Modal
        show={showModal}
        onClose={closeModal}
        title="Agreement Required"
        message="You must agree to the terms and privacy policy to sign up."
      />
    </div>
  );
};

export default Register;
