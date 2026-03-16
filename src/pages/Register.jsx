import { useState } from "react";
import { Link } from "react-router-dom";
import "./Register.css";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Register:", {
      firstName,
      lastName,
      email,
      birthday,
      password,
      agreedToTerms,
      agreedToPrivacy,
    });
  };

  return (
    <div className="register-container">
      <div className="header">
        <div className="logo">Robinsin-voucher</div>
      </div>
      <div className="register-form-container">
        <div className="register-form">
          <h2>Create Account</h2>
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
              <div className="birthday-input">
                <input
                  type="text"
                  placeholder="mm/dd/yyyy"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
                <span className="calendar-icon"></span>
              </div>
            </div>
            <div className="form-group">
              <label>Password *</label>
              <div className="password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                ></span>
              </div>
            </div>
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <label htmlFor="terms">
                I agree to receive advertising and promotions from Robinsons Malls
              </label>
            </div>
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="privacy"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
              />
              <label htmlFor="privacy">
                I have read and agree to the Robinsons Malls' Privacy Policy
              </label>
            </div>
            <button type="submit" className="sign-up-btn">
              Sign Up
            </button>
          </form>
          <p className="login-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
