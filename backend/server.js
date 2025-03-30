const express = require('express');
const connectDB = require('./config/database');
const User = require('./models/UserModel');
const Question = require('./models/QuestionModel');
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const { authMiddleware, adminMiddleware } = require('./middleware/authMiddleware');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();

// Create database folder if it doesn't exist
const dbFolder = path.join(__dirname, 'database');
if (!fs.existsSync(dbFolder)) {
  console.log('Creating database folder:', dbFolder);
  fs.mkdirSync(dbFolder, { recursive: true });
}

// Security middleware
app.use(helmet()); // Set security headers
app.use(xss()); // Sanitize user input
app.use(mongoSanitize()); // Prevent MongoDB operator injection

// Global rate limiter - max 100 requests per IP per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', apiLimiter);

// Middleware
app.use(express.json({ limit: '10mb' }));

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://caprep.onrender.com', 'https://ca-prep.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin', 'AccessToken'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
};
app.use(cors(corsOptions));

// Add a middleware to log all requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Add request logging middleware for debugging
app.use((req, res, next) => {
  if (req.path === '/api/auth/register') {
    console.log('💫 Register request received:');
    console.log('💫 Headers:', req.headers);
    console.log('💫 Body:', req.body);
  }
  next();
});

// Initialize database and models before setting up routes
const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    const conn = await connectDB();
    console.log('Database connection established successfully');

    // Verify User model
    if (!User) {
      console.error('User model is undefined. Import path or file issue:', {
        filePath: './models/UserModel',
        cwd: process.cwd(),
      });
      throw new Error('User model not loaded');
    }
    if (typeof User.findOne !== 'function') {
      console.error('User model lacks findOne method:', User);
      throw new Error('User model not initialized');
    }
    console.log('User model loaded successfully');

    // Verify Question model
    if (!Question) {
      console.error('Question model is undefined. Import path or file issue:', {
        filePath: './models/QuestionModel',
        cwd: process.cwd(),
      });
      throw new Error('Question model not loaded');
    }
    if (typeof Question.findOne !== 'function') {
      console.error('Question model lacks findOne method:', Question);
      throw new Error('Question model not initialized');
    }
    console.log('Question model loaded successfully');

    // Check if an admin user exists, create one if not
    await checkAndCreateAdmin();

    // Log total number of users for debugging
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);

    // Log total number of questions for debugging
    const questionCount = await Question.countDocuments();
    console.log(`Total questions in database: ${questionCount}`);

    // Set up routes after successful initialization
    app.use('/api/auth', authRoutes);
    app.use('/api/questions', questionRoutes);
  } catch (err) {
    console.error('Error initializing database or models:', {
      message: err.message,
      stack: err.stack,
    });
    throw err;
  }
};

// Separate function to check and create admin user
const checkAndCreateAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });

    if (adminCount === 0) {
      // Validate admin credentials from env
      const adminFullName = process.env.ADMIN_FULL_NAME || 'Admin User';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
        throw new Error('Invalid admin email format');
      }
      if (!adminPassword || adminPassword.length < 8) {
        throw new Error('Admin password must be at least 8 characters long');
      }

      const admin = await User.create({
        fullName: adminFullName,
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 12),
        role: 'admin'
      });
      console.log('Admin user created:', {
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role
      });
    } else {
      console.log('Admin user already exists, skipping creation.');
      const existingAdmin = await User.findOne({ role: 'admin' });
      console.log('Existing admin details:', {
        fullName: existingAdmin.fullName,
        email: existingAdmin.email,
        role: existingAdmin.role,
      });
    }
  } catch (error) {
    console.error('Admin initialization error:', error);
    throw error;
  }
};

// Example protected admin route
app.get('/api/admin', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ 
    message: 'Welcome to the admin panel', 
    user: req.user.fullName, 
    email: req.user.email,
    role: req.user.role 
  });
});

// Health check endpoint with detailed status
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1, // 1 = connected
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
  res.status(200).json(health);
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', {
    stack: err.stack,
    message: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method,
  });
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
  });
});

// Start server only if database and models initialize successfully
const PORT = process.env.PORT || 5000;
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server due to initialization error:', {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

module.exports = app;