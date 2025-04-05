const express = require('express');
const connectDB = require('./config/database');
const User = require('./models/UserModel');
const Question = require('./models/QuestionModel');
const Resource = require('./models/ResourceModel');
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const paymentRoutes = require('./routes/payment');
const resourceRoutes = require('./routes/resources');
const userRoutes = require('./routes/users');
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

// Enhanced CORS configuration with more permissive settings
const corsOptions = {
  origin: ['https://caprep.onrender.com', 'https://caprep.vercel.app', 'http://localhost:5173', 'https://ca-exam-platform.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'Access-Control-Allow-Origin', 
    'AccessToken', 'Origin', 'Accept', 'X-Requested-With',
    'Cache-Control', 'Pragma', 'Expires'
  ],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false,
  maxAge: 86400 // 24 hours
};

// Add CORS preflight handling for all routes
app.options('*', cors(corsOptions));

// Special handler for verify-otp which seems to have issues
app.options('/api/auth/verify-otp', (req, res) => {
  console.log('Handling OPTIONS preflight for verify-otp specifically');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With, Cache-Control, Pragma, Expires');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

app.use(cors(corsOptions));

// Add a manual CORS middleware as backup for handling preflight requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Log all requests to help debug CORS issues
  console.log(`[CORS] ${req.method} ${req.path} - Origin: ${origin || 'No origin'}`);
  
  if (
    origin === 'https://caprep.onrender.com' || 
    origin === 'https://caprep.vercel.app' || 
    origin === 'http://localhost:5173' ||
    origin === 'https://ca-exam-platform.vercel.app'
  ) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control, Pragma, Expires');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Preflight request handling
    if (req.method === 'OPTIONS') {
      console.log(`Handling OPTIONS preflight for ${req.path} in backup middleware`);
      return res.status(204).end();
    }
  }
  next();
});

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

    // Verify models (with more detailed logging)
    let modelsValid = true;

    // Verify User model
    if (!User) {
      console.error('User model is undefined. Import path or file issue:', {
        filePath: './models/UserModel',
        cwd: process.cwd(),
      });
      modelsValid = false;
    } else if (typeof User.findOne !== 'function') {
      console.error('User model lacks findOne method:', User);
      modelsValid = false;
    } else {
      console.log('User model loaded successfully');
    }

    // Verify Question model
    if (!Question) {
      console.error('Question model is undefined. Import path or file issue:', {
        filePath: './models/QuestionModel',
        cwd: process.cwd(),
      });
      modelsValid = false;
    } else if (typeof Question.findOne !== 'function') {
      console.error('Question model lacks findOne method:', Question);
      modelsValid = false;
    } else {
      console.log('Question model loaded successfully');
    }
    
    // Verify Resource model
    if (!Resource) {
      console.error('Resource model is undefined. Import path or file issue:', {
        filePath: './models/ResourceModel',
        cwd: process.cwd(),
      });
      modelsValid = false;
    } else if (typeof Resource.findOne !== 'function') {
      console.error('Resource model lacks findOne method:', Resource);
      modelsValid = false;
    } else {
      console.log('Resource model loaded successfully');
    }

    if (!modelsValid) {
      throw new Error('One or more required models failed to initialize');
    }

    // Check if an admin user exists, create one if not
    try {
      await checkAndCreateAdmin();
    } catch (adminError) {
      console.error('Admin creation failed but server initialization will continue:', adminError.message);
      // Continue with server initialization despite admin creation failure
    }

    // Log total number of users for debugging
    try {
      const userCount = await User.countDocuments();
      console.log(`Total users in database: ${userCount}`);
    } catch (err) {
      console.error('Error counting users:', err.message);
    }

    // Log total number of questions for debugging
    try {
      const questionCount = await Question.countDocuments();
      console.log(`Total questions in database: ${questionCount}`);
    } catch (err) {
      console.error('Error counting questions:', err.message);
    }
    
    // Log total number of resources for debugging
    try {
      const resourceCount = await Resource.countDocuments();
      console.log(`Total resources in database: ${resourceCount}`);
    } catch (err) {
      console.error('Error counting resources:', err.message);
    }

    console.log('Setting up API routes...');
    // Set up routes after successful initialization
    app.use('/api/auth', authRoutes);
    app.use('/api/questions', questionRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/resources', resourceRoutes);
    app.use('/api/users', userRoutes);
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads folder:', uploadsDir);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Serve uploaded files statically
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    
    console.log('API routes initialized successfully');

    return true; // Signal successful initialization
  } catch (err) {
    console.error('Error initializing database or models:', {
      message: err.message,
      stack: err.stack,
    });
    
    // Continue server initialization if possible
    if (mongoose.connection.readyState === 1) {
      console.warn('Attempting to continue server initialization despite errors');
      app.use('/api/auth', authRoutes);
      app.use('/api/questions', questionRoutes);
      app.use('/api/payment', paymentRoutes);
      app.use('/api/resources', resourceRoutes);
      app.use('/api/users', userRoutes);
      return true;
    }
    
    return false; // Signal failed initialization
  }
};

// Separate function to check and create admin user
const checkAndCreateAdmin = async () => {
  try {
    console.log('Checking for existing admin users...');
    
    // Handle possible model initialization issues
    if (!User || typeof User.countDocuments !== 'function') {
      throw new Error('User model not properly initialized');
    }
    
    // Check database connection first
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Cannot create admin user: Database not connected');
    }
    
    // Count existing admins with retry logic
    let adminCount = 0;
    let retries = 3;
    
    while (retries > 0) {
      try {
        adminCount = await User.countDocuments({ role: 'admin' });
        console.log(`Found ${adminCount} admin users in database`);
        break;
      } catch (err) {
        retries--;
        console.error(`Error counting admin users (retries left: ${retries}):`, err.message);
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }

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

      console.log('No admin user found. Creating default admin account...');
      
      // Hash password with proper error handling
      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(adminPassword, 12);
      } catch (err) {
        console.error('Failed to hash admin password:', err);
        throw new Error('Admin creation failed: Password hashing error');
      }
      
      // Create the admin user with retry logic
      let admin = null;
      retries = 3;
      
      while (retries > 0 && !admin) {
        try {
          admin = await User.create({
            fullName: adminFullName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin'
          });
          break;
        } catch (err) {
          retries--;
          if (err.code === 11000) {
            // Duplicate key error - admin might exist but query failed earlier
            console.warn('Admin user appears to exist (duplicate key error). Rechecking...');
            const existingAdmin = await User.findOne({ email: adminEmail });
            if (existingAdmin) {
              console.log('Admin user found on recheck:', {
                fullName: existingAdmin.fullName,
                email: existingAdmin.email,
                role: existingAdmin.role
              });
              return; // Exit function if admin exists
            }
          }
          
          console.error(`Failed to create admin user (retries left: ${retries}):`, err.message);
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
      
      if (admin) {
        console.log('✅ Admin user created successfully:', {
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role
        });
      } else {
        throw new Error('Failed to create admin user after multiple attempts');
      }
    } else {
      console.log('Admin user already exists, skipping creation.');
      try {
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
          console.log('Existing admin details:', {
            fullName: existingAdmin.fullName,
            email: existingAdmin.email,
            role: existingAdmin.role,
          });
        } else {
          console.warn('Admin count is non-zero but findOne returned no results. This is unexpected.');
        }
      } catch (err) {
        console.error('Error fetching existing admin details:', err.message);
        // Don't throw here, as admin exists and this is just informational
      }
    }
  } catch (error) {
    console.error('⚠️ Admin initialization error:', error.message);
    console.error(error.stack);
    // Don't throw the error, but log that server will continue without admin
    console.warn('Server continuing without admin initialization. Admin features may not work correctly.');
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

// Start server function with error handling
const startServer = async () => {
  try {
    // Initialize database and models
    const dbInitialized = await initializeDatabase();
    
    if (!dbInitialized) {
      console.error('Database initialization failed. Starting server with limited functionality.');
    }
    
    // Define port (with fallback)
    const PORT = process.env.PORT || 5000;
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`Health check available at: http://localhost:${PORT}/health`);
      
      if (dbInitialized) {
        console.log('✅ Server started successfully with database connection');
      } else {
        console.log('⚠️ Server started with limited functionality (database connection issues)');
      }
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message, err.stack);
      
      // Close server & exit process
      server.close(() => {
        process.exit(1);
      });
    });
    
    // Handle SIGTERM signal (e.g. Heroku shutdown)
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully...');
      server.close(() => {
        console.log('💥 Process terminated!');
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;