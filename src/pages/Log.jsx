import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../css/Log.css";
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Log({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    if (rememberedEmail && rememberedPassword) {
      setEmail(rememberedEmail);
      setPassword(rememberedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const user = await onLogin(email, password);
      if (user) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }
        switch (user.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'manager':
            navigate('/manager');
            break;
          case 'staff':
            navigate('/staff');
            break;
          case 'customer':
            navigate('/customer');
            break;
          default:
            navigate('/login');
        }
      } else {
        setError('Invalid username or password. Please check your credentials and try again.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again later.');
    }
  };

  return (
    <div className="log-page">
      <div className="log-container">
        <div className="log-card">
          <h2>Account Login</h2>
          {error && (
            <div className="error-container">
              <span className="error-icon">ⓘ</span>
              <div className="error-text-container">
                <p className="error-title">Login Failed</p>
                <p className="error-message">{error}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email or Username *</label>
              <input
                type="text"
                id="email"
                placeholder="adminuser@gmail.com or adminuser"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group password-container">
              <label htmlFor="password">Password *</label>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">Remember Me</label>
            </div>
            <div className="forgot-password">
                <Link to="/forgot-password">Forgot Password</Link>
            </div>
            <button type="submit" className="login-btn">Login</button>
          </form>
          <div className="signup-link">
            <p>Don't have an account? <Link to="/register">Sign up</Link></p>
          </div>
          <div className="terms-policy">
            <p>Terms | <Link to="/privacy-policy">Policy</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
