# CA Exam Preparation Platform

## Overview
CA Exam Preparation Platform is a comprehensive web application designed to help Chartered Accountancy students prepare for their examinations effectively. This platform provides practice questions, quizzes, learning resources, discussion forums, and performance analytics to enhance the study experience. Built with a modern tech stack, the platform aims to provide a seamless, responsive user experience across devices.

## Features

### User Authentication and Authorization
- **Secure Registration & Login**: Email verification and secure password management
- **Role-Based Access Control**: Student, Premium User, and Admin roles with appropriate permissions
- **JWT Authentication**: Secure token-based session management
- **Password Reset**: Automated password recovery via email
- **Social Login Integration**: Coming soon

### Learning Resources
- **Categorized Study Materials**: Organized by subjects, topics, and difficulty levels
- **PDF Document Viewer**: In-app PDF reading capability 
- **Resource Management**: Admin-controlled uploading and organization of study materials
- **Search & Filter**: Find relevant resources quickly
- **Downloadable Content**: Save resources for offline study

### Question Bank & Practice
- **Extensive Question Database**: Thousands of practice questions with solutions
- **Topic-Based Categorization**: Questions organized by examination topics
- **Difficulty Levels**: Progressive difficulty settings
- **Bookmarking System**: Save important questions for later review
- **Admin Question Management**: Add, edit, and manage question repository

### Interactive Quizzes
- **Custom Quiz Generation**: Create quizzes based on specific topics and difficulty
- **AI-Powered Quizzes**: Dynamically generated questions using Google's Generative AI
- **Timed Tests**: Simulate exam conditions with timed sessions
- **Instant Feedback**: Immediate scoring and answer explanations
- **Performance Tracking**: Comprehensive statistics on quiz performance

### Performance Analytics
- **Personalized Dashboard**: User-specific performance metrics
- **Progress Tracking**: Visual representation of study progress
- **Strength & Weakness Analysis**: Identify areas needing improvement
- **Study Time Tracking**: Monitor time spent on different topics
- **Performance Trends**: Track improvement over time with historical data

### Discussion Forums
- **Topic-Based Discussions**: Organized conversations by subject area
- **Question & Answer Format**: Ask questions and receive answers from peers and experts
- **Moderation Tools**: Admin controls to maintain quality discussions
- **Notification System**: Stay updated on responses and important discussions
- **User Reputation System**: Recognize helpful community members

### Admin Panel
- **User Management**: Create, edit, suspend user accounts
- **Content Administration**: Manage questions, resources, and discussions
- **Announcement System**: Create and publish important notifications
- **Analytics Dashboard**: Monitor platform usage and performance
- **System Configuration**: Adjust application settings

### Payment Integration
- **Razorpay Integration**: Secure payment processing
- **Subscription Management**: Handle premium subscription lifecycles
- **Payment History**: Track user payment records
- **Invoice Generation**: Automated invoice creation
- **Refund Processing**: Managed refund workflow

## Tech Stack

### Frontend
- **React (v19)**: Core framework for building interactive UI
- **React Router Dom (v7)**: Client-side routing
- **Tailwind CSS (v4)**: Utility-first CSS framework for styling
- **Chart.js / React-Chartjs-2**: Data visualization components
- **Framer Motion / React Spring**: Advanced animations and transitions
- **HTML2PDF / jsPDF**: PDF generation for reports and certificates
- **React Error Boundary**: Graceful error handling
- **React-PDF**: PDF viewing functionality
- **Axios**: Promise-based HTTP client
- **Date-fns**: Modern JavaScript date utility library
- **DOMPurify**: XSS sanitization for user-generated content
- **Vite**: Next-generation frontend build tool

### Backend
- **Node.js with Express**: Server-side JavaScript runtime and framework
- **MongoDB with Mongoose**: NoSQL database with ODM
- **JWT (JSON Web Tokens)**: Stateless authentication mechanism
- **Google Generative AI**: Integration for AI-powered question generation
- **Cloudinary**: Cloud-based image and file management
- **Nodemailer**: Email sending capability for notifications
- **Bcrypt**: Password hashing and security
- **Joi**: Request validation and data sanitization
- **Multer**: Middleware for handling file uploads
- **Razorpay**: Payment gateway integration
- **Express Rate Limit**: API request rate limiting
- **Node-Cache**: Server-side caching for performance
- **OTP Generator**: One-time password functionality
- **UUID**: Unique identifier generation

## Architecture
The application follows a client-server architecture with clear separation of concerns:

### Frontend Architecture
- **Component-Based Structure**: Reusable UI components
- **Custom Hooks**: Encapsulated logic for reusability
- **Context API**: State management across components
- **Lazy Loading**: Optimized bundle loading for performance
- **Error Boundaries**: Fallback UI for component errors

### Backend Architecture
- **RESTful API Design**: Standard HTTP methods and status codes
- **MVC Pattern**: Models, routes, and controllers separation
- **Middleware Pipeline**: Request processing with composable middleware
- **Service Layer**: Business logic encapsulation
- **Repository Pattern**: Data access abstraction
- **Caching Strategy**: Performance optimization with strategic caching

### Database Schema
- **User Collection**: User profiles and authentication data
- **Question Collection**: Practice questions with metadata
- **Resource Collection**: Study materials and reference documents
- **Discussion Collection**: Forum posts and replies
- **Announcement Collection**: System-wide notifications

## Environment Configuration

### Backend Environment Variables (.env)
```
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/ca-exam-platform
MONGODB_URI_PROD=mongodb+srv://...

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=support@caexamplatform.com

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Frontend Environment Variables (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user and get token
- `POST /api/auth/refresh-token` - Refresh authentication token
- `POST /api/auth/forgot-password` - Initiate password reset
- `POST /api/auth/reset-password` - Complete password reset
- `GET /api/auth/verify-email/:token` - Verify user email
- `POST /api/auth/resend-verification` - Resend verification email

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change user password
- `GET /api/users/activity` - Get user activity log
- `DELETE /api/users/account` - Delete user account

### Questions
- `GET /api/questions` - List questions with pagination and filters
- `GET /api/questions/:id` - Get question by ID
- `POST /api/questions` - Create new question (admin)
- `PUT /api/questions/:id` - Update question (admin)
- `DELETE /api/questions/:id` - Delete question (admin)
- `POST /api/questions/bookmark/:id` - Bookmark a question
- `DELETE /api/questions/bookmark/:id` - Remove bookmark

### Quizzes
- `POST /api/questions/quiz/generate` - Generate a quiz based on criteria
- `POST /api/questions/quiz/submit` - Submit quiz answers
- `GET /api/questions/quiz/history` - Get quiz attempt history
- `GET /api/questions/quiz/history/:id` - Get specific quiz attempt
- `POST /api/ai-quiz/generate` - Generate AI-powered quiz

### Resources
- `GET /api/resources` - List resources with pagination and filters
- `GET /api/resources/:id` - Get resource by ID
- `POST /api/resources` - Upload new resource (admin)
- `PUT /api/resources/:id` - Update resource metadata (admin)
- `DELETE /api/resources/:id` - Delete resource (admin)
- `GET /api/resources/download/:id` - Download resource file

### Discussions
- `GET /api/discussions` - List discussion threads
- `GET /api/discussions/:id` - Get discussion thread with replies
- `POST /api/discussions` - Create new discussion thread
- `PUT /api/discussions/:id` - Update discussion thread
- `DELETE /api/discussions/:id` - Delete discussion thread
- `POST /api/discussions/:id/replies` - Add reply to discussion
- `PUT /api/discussions/:id/replies/:replyId` - Update reply
- `DELETE /api/discussions/:id/replies/:replyId` - Delete reply

### Admin
- `GET /api/admin/users` - List all users (admin)
- `PUT /api/admin/users/:id/role` - Update user role (admin)
- `POST /api/admin/announcements` - Create announcement (admin)
- `GET /api/admin/analytics/users` - Get user analytics (admin)
- `GET /api/admin/analytics/quizzes` - Get quiz analytics (admin)
- `GET /api/admin/analytics/resources` - Get resource usage analytics (admin)

### Payments
- `POST /api/payment/create-order` - Create payment order
- `POST /api/payment/verify` - Verify payment
- `GET /api/payment/history` - Get payment history
- `GET /api/payment/subscription` - Get subscription details

### Dashboard
- `GET /api/dashboard/stats` - Get user dashboard statistics
- `GET /api/dashboard/recent-activity` - Get recent user activity
- `GET /api/dashboard/performance` - Get performance metrics
- `GET /api/dashboard/recommended` - Get recommended resources and questions

## Deployment

### Frontend Deployment (Vercel)
1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. Set up environment variables in Vercel dashboard
4. Deploy with Vercel CLI:
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

### Backend Deployment
1. Set up a production MongoDB instance
2. Configure environment variables for production
3. Build the application:
   ```bash
   npm run build
   ```
4. Deploy using PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "ca-exam-platform-api"
   pm2 save
   ```

### Database Migration
1. Create database backup:
   ```bash
   mongodump --uri="mongodb://localhost:27017/ca-exam-platform" --out=./backup
   ```
2. Restore to production:
   ```bash
   mongorestore --uri="mongodb+srv://..." --db=ca-exam-platform ./backup/ca-exam-platform
   ```

## Development Guidelines

### Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ca-exam-platform.git
   cd ca-exam-platform
   ```

2. Install dependencies for both frontend and backend:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update variables with your local configuration

4. Start development servers:
   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend
   cd ../frontend
   npm run dev
   ```

### Code Style and Conventions
- Follow ESLint configuration for code style
- Use meaningful variable and function names
- Write JSDoc comments for functions
- Maintain consistent file and directory naming:
  - React components: PascalCase
  - Utilities and hooks: camelCase
  - API routes: kebab-case

### Pull Request Process
1. Create a feature branch from `develop`
2. Implement changes with appropriate tests
3. Ensure all tests pass
4. Submit PR to `develop` branch
5. Code review and approval required before merge

## Performance Optimization
- Frontend bundle optimization with code splitting
- API response caching strategies
- Database query optimization with indexes
- Image and media optimization with Cloudinary
- CDN integration for static assets

## Security Measures
- **Input Validation**: All user inputs validated with Joi
- **XSS Protection**: DOMPurify for client-side sanitization, xss-clean for server
- **CSRF Protection**: Anti-CSRF tokens
- **Rate Limiting**: Prevent brute force and DoS attacks
- **MongoDB Injection Prevention**: Mongoose schema validation
- **Secure Headers**: Helmet for HTTP header security
- **Authentication Security**: Bcrypt for password hashing, JWT with appropriate expiration
- **Data Encryption**: HTTPS enforcement, sensitive data encryption
- **Error Handling**: Custom error handling without leaking information

## Troubleshooting

### Common Issues
1. **Connection Refused on API Calls**
   - Check if backend server is running
   - Verify API URL in frontend .env file
   - Confirm network connectivity and firewall settings

2. **Authentication Failures**
   - Clear browser localStorage and try again
   - Check JWT expiration and refresh flow
   - Verify user credentials in database

3. **Missing Environment Variables**
   - Ensure all required variables are set in .env files
   - Restart servers after changing environment variables

4. **Database Connection Issues**
   - Verify MongoDB connection string
   - Check MongoDB service status
   - Confirm network access to database server

5. **Build Errors**
   - Clear node_modules and reinstall dependencies
   - Check for version conflicts in package.json
   - Update Node.js to compatible version

## Future Roadmap
- Mobile application with React Native
- Offline study mode
- AI-powered study recommendations
- Live tutoring integration
- Social study groups
- Gamification elements
- Advanced analytics dashboard
- Multi-language support
- Certification programs
- Integration with learning management systems

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contact
For support or inquiries, please contact support@caexamplatform.com
