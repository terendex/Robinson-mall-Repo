
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Log() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    if (email === 'Admin' && password === 'Admin') {
      navigate('/admin');
    } else if (email === 'Manager' && password === 'Manager') {
      navigate('/manager');
    } else if (email === 'Staff' && password === 'Staff') {
      navigate('/staff');
    } else if (email === 'Customer' && password === 'Customer') {
      navigate('/customer');
    } else {
      // Handle incorrect login
      console.log('Incorrect email or password');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type={showPassword ? 'text' : 'password'}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? 'Hide' : 'Show'}
      </button>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Log;
