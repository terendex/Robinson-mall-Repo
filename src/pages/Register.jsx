import '../styles/Register.css'
import Header from '../components/Header';

const Register = ({ onToggle }) => {
  return (
    <div className="register-page">
      <Header />
      <div className="register-container">
        <div className="register-card">
          <h2>Create Account</h2>
          <form>
            <div className="form-group">
              <label>First Name</label>
              <input type="text" placeholder="First Name" />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" placeholder="Last Name" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="Email Address" />
            </div>
            <div className="form-group">
              <label>Birthday</label>
              <input type="text" placeholder="mm/dd/yyyy" />
              <i className="fa-regular fa-calendar"></i>
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input type="password" placeholder="Password" />
              <i className="fa-regular fa-eye-slash"></i>
            </div>
            <div className="form-check">
              <input type="checkbox" id="promotions" />
              <label htmlFor="promotions">I agree to receive advertising and promotions from Robinsons Malls</label>
            </div>
            <div className="form-check">
              <input type="checkbox" id="privacy" />
              <label htmlFor="privacy">I have read and agree to the Robinsons Malls' <a href="#" className="privacy-link">Privacy Policy</a></label>
            </div>
            <button type="submit" className="signup-btn">Sign Up</button>
          </form>
          <p className="login-link">Already have an account? <span onClick={onToggle}>Login</span></p>
        </div>
      </div>
    </div>
  )
}

export default Register