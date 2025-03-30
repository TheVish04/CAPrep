import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import apiUtils from '../utils/apiUtils';
import './Register.css';

const Register = () => {
  // Step tracking
  const [step, setStep] = useState(1); // Step 1: Email verification, Step 2: Registration
  
  // Email verification states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Registration form states
  const [formData, setFormData] = useState({ 
    fullName: '', 
    email: '', 
    password: '',
    confirmPassword: '' 
  });
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  
  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  // Handle email input change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setOtpError('');
  };
  
  // Handle OTP input change
  const handleOtpChange = (e) => {
    setOtp(e.target.value);
    setOtpError('');
  };
  
  // Send OTP to email
  const handleSendOtp = async () => {
    // Validate email (must be Gmail)
    if (!email.trim() || !email.trim().toLowerCase().endsWith('@gmail.com')) {
      setOtpError('Please enter a valid Gmail address');
      return;
    }
    
    setSendingOtp(true);
    setOtpError('');
    
    try {
      const response = await apiUtils.post('api/auth/send-otp', { email: email.trim() });
      
      console.log("OTP send response:", response.data);
      
      setOtpSent(true);
      setCountdown(60); // 60 seconds countdown for resend
      
      // Show success message
      setOtpError('');
    } catch (err) {
      console.error('Error sending OTP:', err);
      
      setOtpError(err.message || 'Failed to send OTP. Please try again later.');
      
      // If email already registered, suggest login
      if (err.redirect === '/login') {
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } finally {
      setSendingOtp(false);
    }
  };
  
  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setOtpError('Please enter the OTP');
      return;
    }
    
    setVerifyingOtp(true);
    setOtpError('');
    
    try {
      const response = await apiUtils.post('api/auth/verify-otp', { 
        email: email.trim(),
        otp: otp.trim() 
      });
      
      console.log("OTP verification response:", response.data);
      
      setOtpVerified(true);
      
      // Move to step 2 and pre-fill email
      setStep(2);
      setFormData(prev => ({ ...prev, email: email.trim() }));
      
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setOtpError(err.message || 'Failed to verify OTP. Please try again later.');
    } finally {
      setVerifyingOtp(false);
    }
  };
  
  // Clear error when user starts typing again
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (error) setError('');
    
    // Check password strength when password field changes
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  // Password strength checker remains the same
  const checkPasswordStrength = (password) => {
    // Initialize strength as 0
    let strength = 0;
    let message = '';

    // If password is empty, return
    if (password.length === 0) {
      setPasswordStrength(0);
      setPasswordMessage('');
      return;
    }

    // Check length
    if (password.length >= 8) strength += 20;
    
    // Check for lowercase letters
    if (password.match(/[a-z]+/)) strength += 20;
    
    // Check for uppercase letters
    if (password.match(/[A-Z]+/)) strength += 20;
    
    // Check for numbers
    if (password.match(/[0-9]+/)) strength += 20;
    
    // Check for special characters
    if (password.match(/[^a-zA-Z0-9]+/)) strength += 20;

    // Set message based on strength
    if (strength <= 20) {
      message = 'Very Weak';
    } else if (strength <= 40) {
      message = 'Weak';
    } else if (strength <= 60) {
      message = 'Medium';
    } else if (strength <= 80) {
      message = 'Strong';
    } else {
      message = 'Very Strong';
    }

    setPasswordStrength(strength);
    setPasswordMessage(message);
  };

  // Form validation with added confirm password check
  const validateForm = () => {
    // Full name validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (formData.fullName.trim().length < 3) {
      setError('Full name must be at least 3 characters');
      return false;
    }
    
    // Email validation - should be pre-filled and verified
    if (formData.email !== email) {
      setError('Email mismatch with verified email');
      return false;
    }
    
    // Password validation
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Send registration data without OTP
      const dataToSend = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password
      };
      
      console.log('Sending registration data:', {...dataToSend, password: '***HIDDEN***'});
      
      const response = await apiUtils.post('api/auth/register', dataToSend);
      console.log('Registration response:', response.data);
      
      // Registration successful
      alert('Registration successful! Redirecting to login page...');
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      
      setError(err.message || 'Registration failed. Please try again later.');
      
      // If email verification required, go back to step 1
      if (err.redirect === '/register') {
        setStep(1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get color for password strength bar
  const getStrengthColor = () => {
    if (passwordStrength <= 20) return '#e74c3c'; // Very Weak - Red
    if (passwordStrength <= 40) return '#e67e22'; // Weak - Orange
    if (passwordStrength <= 60) return '#f1c40f'; // Medium - Yellow
    if (passwordStrength <= 80) return '#2ecc71'; // Strong - Light Green
    return '#27ae60'; // Very Strong - Dark Green
  };

  // Render OTP verification step
  const renderOtpStep = () => (
    <div id="register-form" aria-labelledby="register-tab">
      {otpError && <p className="error">{otpError}</p>}
      
      <form>
        <div>
          <label>Gmail Address:</label>
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your Gmail address"
            disabled={otpSent && !otpVerified}
            required
          />
        </div>
        
        {!otpSent ? (
          <div className="otp-form-group">
            <button 
              type="button" 
              onClick={handleSendOtp}
              disabled={sendingOtp || !email.trim()}
              className="otp-button"
            >
              {sendingOtp ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        ) : !otpVerified ? (
          <>
            <div className="otp-form-group">
              <label>Enter OTP:</label>
              <div className="otp-input-container">
                <input
                  type="text"
                  value={otp}
                  onChange={handleOtpChange}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                />
                {countdown === 0 && (
                  <button 
                    type="button" 
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="otp-button resend"
                  >
                    {sendingOtp ? 'Sending...' : 'Resend'}
                  </button>
                )}
              </div>
              {countdown > 0 && (
                <p className="resend-timer">Resend OTP in {countdown}s</p>
              )}
            </div>
            
            <div className="button-group">
              <button 
                type="button" 
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || !otp.trim()}
                className="primary-button"
              >
                {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </>
        ) : (
          <div className="verification-success">
            <p>Email verified successfully! You can now complete your registration.</p>
          </div>
        )}
      </form>
      
      <p className="auth-link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );

  // Render registration form step
  const renderRegistrationStep = () => (
    <div id="register-form" aria-labelledby="register-tab">
      {error && <p className="error">{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Full Name:</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />
        </div>
        
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled={true} // Email is pre-filled and verified
            required
          />
          <p className="verified-email-note">Email verified ✓</p>
        </div>
        
        <div>
          <label>Password:</label>
          <div className="password-container">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              required
            />
            <span 
              className="toggle-password" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </span>
          </div>
          
          {formData.password && (
            <div className="password-strength">
              <div className="strength-bar">
                <div 
                  className="strength-fill" 
                  style={{ 
                    width: `${passwordStrength}%`,
                    backgroundColor: getStrengthColor()
                  }}
                ></div>
              </div>
              <p className="strength-text">{passwordMessage}</p>
            </div>
          )}
        </div>
        
        <div>
          <label>Confirm Password:</label>
          <div className="password-container">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
            <span 
              className="toggle-password" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </span>
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
      </form>
      
      <p className="auth-link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
      
      <button 
        type="button" 
        onClick={() => setStep(1)}
        className="back-button"
      >
        Back to Email Verification
      </button>
    </div>
  );

  // Get title based on current step
  const getStepTitle = () => {
    return step === 1 ? "Email Verification" : "Create Account";
  };

  return (
    <div>
      <Navbar />
      <div className="auth-container">
        <div className="auth-form">
          <h2>{getStepTitle()}</h2>
          {step === 1 ? renderOtpStep() : renderRegistrationStep()}
        </div>
      </div>
    </div>
  );
};

export default Register;
