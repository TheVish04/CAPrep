const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

// Enhanced in-memory OTP storage with rate limiting and cleanup
// For production, use Redis or a database
const otpStore = new Map();
const rateLimit = new Map(); // Store attempt counts per email
const verifiedEmails = new Map(); // Store verified emails

// Regularly clean up expired OTPs and verified emails to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  
  // Clean up expired OTPs
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
  
  // Clean up old verified emails (keep for 30 minutes)
  for (const [email, timestamp] of verifiedEmails.entries()) {
    if (now - timestamp > 30 * 60 * 1000) { // 30 minutes
      verifiedEmails.delete(email);
    }
  }
}, 60000); // Clean up every minute

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate OTP and store it
const generateOTP = (email) => {
  // Check if rate limit exceeded (max 3 OTPs in 15 minutes)
  const now = Date.now();
  const recentAttempts = rateLimit.get(email) || [];
  
  // Remove attempts older than 15 minutes
  const recentValidAttempts = recentAttempts.filter(
    timestamp => now - timestamp < 15 * 60 * 1000
  );
  
  if (recentValidAttempts.length >= 3) {
    throw new Error('Rate limit exceeded. Please try again in 15 minutes.');
  }
  
  // Add current attempt and update rate limit
  recentValidAttempts.push(now);
  rateLimit.set(email, recentValidAttempts);
  
  // Generate a secure 6-digit OTP
  const otp = otpGenerator.generate(6, { 
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false
  });
  
  // Hash the OTP for storage (don't store in plain text)
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  
  // Store OTP with expiry time (5 minutes)
  otpStore.set(email, {
    hashedOTP,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    attempts: 0 // Track failed verification attempts
  });
  
  return otp;
};

// Verify OTP
const verifyOTP = (email, otp) => {
  const otpData = otpStore.get(email);
  
  if (!otpData) {
    return { valid: false, message: 'OTP not found. Please request a new OTP.' };
  }
  
  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(email); // Clean up expired OTP
    return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
  }
  
  // Limit attempts to prevent brute force (max 5 attempts)
  if (otpData.attempts >= 5) {
    otpStore.delete(email); // Invalidate after too many attempts
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  // Hash the user-provided OTP to compare
  const hashedInputOTP = crypto.createHash('sha256').update(otp).digest('hex');
  
  if (otpData.hashedOTP !== hashedInputOTP) {
    // Increment failed attempts
    otpData.attempts += 1;
    otpStore.set(email, otpData);
    return { valid: false, message: 'Invalid OTP. Please try again.' };
  }
  
  // OTP is valid, clean up
  otpStore.delete(email);
  
  // Also remove from rate limit after successful verification
  const recentAttempts = rateLimit.get(email) || [];
  if (recentAttempts.length <= 1) {
    rateLimit.delete(email);
  } else {
    rateLimit.set(email, recentAttempts.slice(0, -1));
  }
  
  // Mark this email as verified for future use
  verifiedEmails.set(email.toLowerCase(), Date.now());
  
  return { valid: true, message: 'OTP verified successfully.' };
};

// Check if an email has been verified by OTP
const isEmailVerified = (email) => {
  const lowercaseEmail = email.toLowerCase();
  return verifiedEmails.has(lowercaseEmail);
};

// Mark an email as verified (for testing purposes)
const markEmailAsVerified = (email) => {
  verifiedEmails.set(email.toLowerCase(), Date.now());
};

// Remove email from verified list
const removeVerifiedEmail = (email) => {
  verifiedEmails.delete(email.toLowerCase());
};

// Send OTP via email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for CAprep Registration',
    html: generateEmailTemplate(email, otp)
  };

  try {
    console.log(`Attempting to send OTP email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${email}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', {
      error: error.message,
      stack: error.stack,
      email: email
    });
    return { 
      success: false, 
      error: error.message,
      transportError: error.code || 'UNKNOWN'
    };
  }
};

const generateEmailTemplate = (name, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h2 style="color: #0288d1;">CAprep - Email Verification</h2>
    <p>Hello ${name}, please use the following OTP to verify your email address:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
    <h1 style="color: #03a9f4; letter-spacing: 5px; margin: 0;">${otp}</h1>
    </div>
    <p>This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>
    <p>Thank you for using CA Prep Platform!</p>
    <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message, please do not reply.</p>
    </div>
  `;
};

// Send password reset email with OTP
const sendPasswordResetEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP for CAprep',
    html: generatePasswordResetTemplate(email, otp)
  };

  try {
    console.log(`Attempting to send password reset email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent successfully to ${email}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', {
      error: error.message,
      stack: error.stack,
      email: email
    });
    return { 
      success: false, 
      error: error.message,
      transportError: error.code || 'UNKNOWN'
    };
  }
};

const generatePasswordResetTemplate = (email, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h2 style="color: #0288d1;">CAprep - Password Reset</h2>
    <p>Hello ${email}, we received a request to reset your password. Please use the following OTP to reset your password:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
    <h1 style="color: #03a9f4; letter-spacing: 5px; margin: 0;">${otp}</h1>
    </div>
    <p>This OTP will expire in 5 minutes. If you did not request this password reset, please ignore this email or contact support if you believe this is unauthorized activity.</p>
    <p>Thank you for using CA Prep Platform!</p>
    <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated message, please do not reply.</p>
    </div>
  `;
};

module.exports = {
  generateOTP,
  verifyOTP,
  sendOTPEmail,
  isEmailVerified,
  markEmailAsVerified,
  removeVerifiedEmail,
  sendPasswordResetEmail
};