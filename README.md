# CA Exam Preparation Platform

A comprehensive web application designed to help Chartered Accountancy students prepare for their exams with practice questions, study resources, progress tracking, and personalized analytics.

## 🚀 Features

### For Students
- **Practice Questions**: Access to a vast collection of MCQs and descriptive questions by subject and exam stage
- **Quiz Module**: Take subject-specific quizzes with detailed performance analytics
- **Study Resources**: Download and access PDF materials, organized by subject, paper type, and exam stage
- **Personal Dashboard**: 
  - Recent quiz scores with trend indicators
  - Study hour tracking with visualization
  - Recently viewed content
  - Bookmarked questions and resources
  - Subject-wise strength/weakness analysis
  - Pomodoro timer for study sessions
  - Resource usage statistics
- **User Profiles**: Track and manage individual progress
- **Announcements**: Stay updated with the latest information

### For Administrators
- **Question Management**: Create, edit, and organize questions with rich formatting
- **Resource Management**: Upload, categorize, and manage PDF study materials
- **Announcement System**: Publish and manage site-wide or targeted announcements
- **Analytics Dashboard**: Track user engagement and platform usage

## 🛠️ Technology Stack

### Frontend
- React.js with Vite
- React Router for navigation
- Axios for API communication
- Chart.js for data visualization
- date-fns for date manipulation
- DOMPurify for security

### Backend
- Node.js with Express
- MongoDB for database
- JWT for authentication
- Multer for file uploads
- Cloudinary for file storage
- bcrypt for password hashing
- NodeCache for caching
- Nodemailer for email functionality

## 📋 Project Structure

```
ca-exam-platform/
├── frontend/              # React application
│   ├── src/               # Source files
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   └── App.jsx        # Main application component
│   └── public/            # Static files
└── backend/               # Node.js server
    ├── models/            # Database models
    ├── routes/            # API routes
    ├── middleware/        # Express middleware
    ├── config/            # Configuration files
    └── server.js          # Server entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- MongoDB

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ca-exam-platform.git
   cd ca-exam-platform
   ```

2. Install backend dependencies
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies
   ```bash
   cd ../frontend
   npm install
   ```

4. Set up environment variables
   - Create `.env` file in the backend directory with necessary configuration

5. Start the development servers
   - Backend: `node server.js` (from the backend directory)
   - Frontend: `npm run dev` (from the frontend directory)

## 📝 Usage

### Student User
1. Register or login to access the platform
2. Navigate through the dashboard to track progress
3. Access questions and quizzes to practice for exams
4. Download study resources organized by subject
5. Use the pomodoro timer for focused study sessions

### Admin User
1. Login with admin credentials
2. Manage questions, resources, and announcements
3. Monitor platform analytics
4. Update content as needed

## ⚙️ Configuration

The platform can be configured through environment variables:
- Backend: Database connection, JWT secret, email settings, etc.
- Frontend: API endpoint, analytics settings, etc.

## 📚 Additional Notes

- PDF resources have a size limit of 15MB
- Questions support HTML formatting for rich content including tables and images
- The platform uses caching to optimize performance

## 🔒 Security Features

- JWT authentication with token expiration
- Password hashing with bcrypt
- Input sanitization with DOMPurify
- Role-based access control
