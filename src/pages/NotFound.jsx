import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/NotFound.css';

/**
 * NotFound Component
 * Displays a premium 404 error page.
 * Logic:
 * - If user is NOT logged in: Provide a button to return to the Login page.
 * - If user IS logged in: Provide a button to return to their role-specific Dashboard.
 */
const NotFound = ({ user }) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (!user) {
      navigate('/login');
    } else {
      // Return to previous page as requested
      navigate(-1);
    }
  };

  const handleDashboard = () => {
    if (user) {
      navigate(`/${user.role}/dashboard`);
    }
  };

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-error-code">404</div>
        <div className="not-found-content">
          <h1>Oops! Page Not Found</h1>
          <p>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="not-found-actions">
            <button className="not-found-btn" onClick={handleAction}>
              <i className={`fa-solid ${!user ? 'fa-right-to-bracket' : 'fa-arrow-left'}`}></i>
              {!user ? 'Back to Login' : 'Go Back Previous'}
            </button>
            {user && (
              <button className="not-found-btn secondary" onClick={handleDashboard}>
                <i className="fa-solid fa-house"></i>
                Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
