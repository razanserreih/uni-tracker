// src/pages/LoginPage.js
import React, { useState } from 'react';
import './LoginPage.css';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [role, setRole] = useState('teacher');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === 'admin') {
      navigate('/admin-dashboard');
    } else {
      alert('Teacher dashboard not ready yet.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="left-section">
        <div className="logo">University</div>
        <h1>University <br />Track System</h1>
        <p>
          our official system for tracking students grades and attendance, 
          its for teaching staff only to access, go to students university website if you are a student,
          please make sure you input correct data and have a great day!
        </p>
      </div>

      <div className="login-box">
        <div className="role-buttons">
          <button
            className={role === 'teacher' ? 'active' : ''}
            onClick={() => setRole('teacher')}
          >
            Teacher
          </button>
          <button
            className={role === 'admin' ? 'active' : ''}
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>Username</label>
          <input type="text" placeholder="Enter your username" />

          <label>Password</label>
          <input type="password" placeholder="Enter your password" />

          <div className="remember-forgot">
            <label>
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#">Forgot password?</a>
          </div>

          <button type="submit" className="signin-btn">Sign in</button>

          <div className="register">
            Don’t have an account? <a href="#">Register here</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
