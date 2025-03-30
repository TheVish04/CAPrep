import React from 'react';
import { NavLink } from 'react-router-dom';
import './AuthToggle.css';

const AuthToggle = () => {
  return (
    <div className="auth-toggle">
      <NavLink 
        to="/login" 
        className={({ isActive }) => isActive ? "toggle-btn active" : "toggle-btn"}
      >
        Login
      </NavLink>
      <NavLink 
        to="/register" 
        className={({ isActive }) => isActive ? "toggle-btn active" : "toggle-btn"}
      >
        Register
      </NavLink>
    </div>
  );
};

export default AuthToggle; 