import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Keep Link for consistency
import '../Register.css';
import oasis from "../assets/Images/oasis.png";

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Registration failed');
      }

      localStorage.setItem('token', data.token);

      // Navigate to the home page after successful registration
      navigate('/');
      
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-form-card brand-card-shadow">
        <div className="brand-header">
           <img 
          src={oasis} 
          alt="Groomberg Logo" 
          className="brand-logo" 
        />
          <h1 className="brand-name">Oasis</h1>
        </div>

        <h2 className="auth-title">Create an Account</h2>
        <p className="auth-subtitle">Join us to start shopping!</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">Name</label>
            <input 
              id="name"
              type="text" 
              placeholder="Full Name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              placeholder="example@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input 
              id="username"
              type="text" 
              placeholder="Choose a username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              placeholder="Create a strong password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="auth-button brand-button">Register</button>
        </form>

        {error && <div className="error-message">{error}</div>}
        
        <div className="auth-link-container">
          {/* Use the Link component for better client-side routing */}
          <Link to="/login" className="auth-link">Already have an account?</Link>
        </div>
      </div>
    </div>
  );
}
