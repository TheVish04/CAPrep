const express = require('express');
const router = express.Router();
const User = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/authMiddleware');
const { generateOTP, verifyOTP, sendOTPEmail, isEmailVerified, removeVerifiedEmail, markEmailAsVerified } = require('../services/otpService');
require('dotenv').config();

// Rate limiting for login attempts
const loginAttempts = new Map();

// Cleanup expired login attempts every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now > data.resetTime) {
      loginAttempts.delete(key);
    }
  }
}, 15 * 60 * 1000);

// Helper function to track login attempts
function updateLoginAttempts(key, success) {
  const now = Date.now();
  const data = loginAttempts.get(key) || { 
    attempts: 0, 
    resetTime: now + 15 * 60 * 1000, // Reset after 15 minutes
    blocked: false
  };
  
  if (success) {
    // On successful login, reset attempts
    loginAttempts.delete(key);
    return;
  }
  
  // Increment failed attempts
  data.attempts += 1;
  
  // Block after 5 failed attempts
  if (data.attempts >= 5) {
    data.blocked = true;
    data.resetTime = now + 15 * 60 * 1000; // Block for 15 minutes
  }
  
  loginAttempts.set(key, data);
}

// Send OTP for registration
router.post('/send-otp', async (req, res) => {
  try {
    console.log('Received send-otp request:', {
      body: req.body,
      origin: req.headers.origin,
      contentType: req.headers['content-type']
    });
    
    const { email } = req.body;
    
    // Validate email format and ensure it's a Gmail address
    if (!email || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
      return res.status(400).json({ 
        error: 'Please provide a valid Gmail address',
        field: 'email'
      });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        redirect: '/login'
      });
    }
    
    // Generate OTP
    const otp = generateOTP(email);
    
    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult);
      return res.status(500).json({ 
        error: 'Failed to send OTP email',
        details: emailResult.error
      });
    }
    
    // Set CORS headers explicitly
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    res.json({ 
      message: 'OTP sent successfully',
      email
    });
    
  } catch (error) {
    console.error('Send OTP error:', {
      message: error.message, 
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to send OTP',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        error: 'Email and OTP are required',
        requiredFields: ['email', 'otp']
      });
    }
    
    const verification = verifyOTP(email, otp);
    
    if (verification.valid) {
      // Mark email as verified
      markEmailAsVerified(email);
      
      return res.status(200).json({ 
        success: true,
        message: verification.message
      });
    } else {
      return res.status(400).json({ 
        success: false,
        error: verification.message
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ 
      error: 'OTP verification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// In login route:
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password presence
    if (!password || password.trim().length < 1) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Implement rate limiting
    const clientIP = req.ip || 'unknown';
    const loginKey = `${email.toLowerCase()}:${clientIP}`;
    const now = Date.now();
    
    // Check if this IP+email combo is already blocked
    const attemptData = loginAttempts.get(loginKey);
    if (attemptData && attemptData.blocked && now < attemptData.resetTime) {
      const waitMinutes = Math.ceil((attemptData.resetTime - now) / (60 * 1000));
      return res.status(429).json({ 
        error: `Too many failed login attempts. Please try again in ${waitMinutes} minutes.`
      });
    }

    // Find user by email - use case insensitive search
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Add small delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

    if (!user) {
      // Update failed attempts for this IP and email combination
      updateLoginAttempts(loginKey, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Update failed attempts counter
      updateLoginAttempts(loginKey, false);
      
      // Log suspicious activity if multiple failed attempts
      const updatedAttemptData = loginAttempts.get(loginKey);
      if (updatedAttemptData && updatedAttemptData.attempts >= 3) {
        console.warn('Multiple failed login attempts:', {
          email,
          ip: clientIP,
          attempts: updatedAttemptData.attempts,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    updateLoginAttempts(loginKey, true);

    // Create JWT token with appropriate expiration
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        fullName: user.fullName,
        email: user.email
      },
      process.env.JWT_SECRET,
      { 
        expiresIn,
        algorithm: 'HS256' // Explicitly specify algorithm
      }
    );

    // Log successful login for security auditing
    console.log('Successful login:', {
      userId: user.id,
      email: user.email,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    // Calculate expiry time for client
    const expiry = new Date();
    const expirySeconds = typeof expiresIn === 'string' && expiresIn.endsWith('d')
      ? parseInt(expiresIn) * 24 * 60 * 60 // Convert days to seconds
      : typeof expiresIn === 'string' && expiresIn.endsWith('h')
      ? parseInt(expiresIn) * 60 * 60 // Convert hours to seconds
      : 24 * 60 * 60; // Default 1 day in seconds
    
    expiry.setSeconds(expiry.getSeconds() + expirySeconds);

    // Return sanitized user data with token
    return res.json({
      token,
      expires: expiry.toISOString(),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User registration
router.post('/register', async (req, res) => {
  try {
    console.log('Register request received:', req.body);
    
    const { fullName, email, password } = req.body;
    
    console.log('Fields extracted:', { fullName, email, password: '***HIDDEN***' });
    
    // Validate all required fields
    if (!fullName || !email || !password) {
      console.log('Missing required fields:', { 
        hasFullName: !!fullName, 
        hasEmail: !!email, 
        hasPassword: !!password 
      });
      
      return res.status(400).json({ 
        error: 'All fields are required',
        requiredFields: ['fullName', 'email', 'password']
      });
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        field: 'email'
      });
    }
    
    // Enhanced password validation (min 8 chars, require mix of types)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character',
        field: 'password'
      });
    }
    
    // Verify full name format (letters and spaces only)
    if (!/^[A-Za-z ]+$/.test(fullName)) {
      return res.status(400).json({ 
        error: 'Full name can only contain letters and spaces',
        field: 'fullName'
      });
    }
    
    // Check if the email has been verified with OTP
    const isVerified = isEmailVerified(email);
    if (!isVerified) {
      return res.status(400).json({ 
        error: 'Email verification required. Please verify your email with OTP first.',
        field: 'email',
        redirect: '/register'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already registered',
        redirect: '/login',
        field: 'email'
      });
    }
    
    // Hash password with increased work factor (12 rounds)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user'
    });
    
    // Remove email from verified list now that it's been used
    removeVerifiedEmail(email);
    
    // Log user creation for audit purposes
    console.log('New user registered:', {
      userId: user._id,
      email: email.toLowerCase(),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Create token
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        fullName: user.fullName,
        email: user.email
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
        algorithm: 'HS256'
      }
    );
    
    // Calculate expiry time for client
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const expiry = new Date();
    const expirySeconds = typeof expiresIn === 'string' && expiresIn.endsWith('d')
      ? parseInt(expiresIn) * 24 * 60 * 60 
      : typeof expiresIn === 'string' && expiresIn.endsWith('h')
      ? parseInt(expiresIn) * 60 * 60
      : 24 * 60 * 60; // Default 1 day
    
    expiry.setSeconds(expiry.getSeconds() + expirySeconds);
    
    // Return success with user data
    res.status(201).json({
      token,
      expires: expiry.toISOString(),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      message: 'Registration successful'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// In /me route
router.get('/me', authMiddleware, async (req, res) => {
try {
// Add proper error handling for missing user
if (!req.user?.id) {
return res.status(401).json({ error: 'Invalid authentication' });
}

const user = await User.findById(req.user.id).select('id fullName email role createdAt');

if (!user) {
return res.status(404).json({ error: 'User not found' });
}

res.json(user);
} catch (error) {
console.error('Error in /me route:', {
message: error.message,
stack: error.stack,
});
res.status(500).json({ error: 'Failed to fetch user info', details: error.message });
}
});

/**
 * Refresh token endpoint
 * Issues a new token if the current one is valid but approaching expiration
 */
router.post('/refresh-token', authMiddleware, async (req, res) => {
  try {
    // User is already authenticated via authMiddleware
    const userId = req.user.id;
    
    // Fetch latest user data to ensure it's current
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Create a new token
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        fullName: user.fullName,
        email: user.email
      },
      process.env.JWT_SECRET,
      { 
        expiresIn,
        algorithm: 'HS256'
      }
    );
    
    // Calculate expiry time for client
    const expiry = new Date();
    const expirySeconds = typeof expiresIn === 'string' && expiresIn.endsWith('d')
      ? parseInt(expiresIn) * 24 * 60 * 60
      : typeof expiresIn === 'string' && expiresIn.endsWith('h')
      ? parseInt(expiresIn) * 60 * 60
      : 24 * 60 * 60; // Default 1 day
    
    expiry.setSeconds(expiry.getSeconds() + expirySeconds);
    
    // Log token refresh for security auditing
    console.log('Token refreshed:', {
      userId: user.id,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Return the new token and user information
    return res.json({
      token,
      expires: expiry.toISOString(),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ 
      error: 'Failed to refresh token',
      code: 'REFRESH_ERROR'
    });
  }
});

module.exports = router;