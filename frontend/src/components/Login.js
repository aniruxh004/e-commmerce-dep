import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../Register.css';
import oasis from "../assets/Images/oasis.png";
import { AuthContext } from '../context/AuthContext';




export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const {login}=useContext(AuthContext)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
       throw new Error(data.msg || 'Login failed');
      }
      
      // localStorage.setItem('token', data.token);
        await login(data.token);
      console.log(data.token);
   
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Brand Name & Logo Section */}
      <div className="brand-header">
        <img
          src={oasis}
          alt="Groomberg Logo"
          className="brand-logo"
        />
        <h1 className="brand-name">Oasis</h1>
      </div>

      {/* Form Card Container */}
      <div className="auth-form-card brand-card-shadow">
        <h2 className="auth-title">Welcome Back!</h2>
        <p className="auth-subtitle">Sign in to continue</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="auth-button brand-button">
            Log In
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        <div className="auth-link-container">
          <Link to="/register" className="auth-link">Don't have an account?</Link>
        </div>
      </div>
    </div>
  );
}

