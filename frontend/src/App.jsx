import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// Dynamically import page components
const LandingPage = lazy(() => import('./pages/LandingPage'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const Questions = lazy(() => import('./components/Questions'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Quiz = lazy(() => import('./components/Quiz'));
const Resources = lazy(() => import('./components/Resources'));
const ResourceUploader = lazy(() => import('./components/ResourceUploader'));
const QuizHistory = lazy(() => import('./components/QuizHistory'));
const UserProfile = lazy(() => import('./components/UserProfile'));

const ProtectedRoute = ({ element, requireAdmin = false }) => {
  const token = localStorage.getItem('token');
  let isAdmin = false;

  if (token) {
    try {
      // Safely decode JWT token
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === 'admin') {
        isAdmin = true;
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      localStorage.removeItem('token'); // Clear invalid token
    }
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />;
  }

  return element;
};

// Redirect already logged in users away from auth pages
const RedirectIfLoggedIn = ({ element }) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      // Validate token format
      const parts = token.split('.');
      if (parts.length === 3) {
        // Token seems valid, redirect to questions page
        return <Navigate to="/questions" />;
      }
    } catch (error) {
      console.error('Error checking token:', error);
      // If token is invalid, remove it
      localStorage.removeItem('token');
    }
  }
  
  // No valid token, render the requested auth page
  return element;
};

const App = () => {
  return (
    <Router>
      {/* Add Suspense with a fallback UI */}
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<RedirectIfLoggedIn element={<Login />} />} />
          <Route path="/register" element={<RedirectIfLoggedIn element={<Register />} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/questions"
            element={<ProtectedRoute element={<Questions />} />}
          />
          <Route
            path="/quiz"
            element={<ProtectedRoute element={<Quiz />} />}
          />
          <Route
            path="/quiz-history"
            element={<ProtectedRoute element={<QuizHistory />} />}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute element={<UserProfile />} />}
          />
          <Route
            path="/resources"
            element={<ProtectedRoute element={<Resources />} />}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute element={<AdminPanel />} requireAdmin={true} />}
          />
          <Route
            path="/admin/resources"
            element={<ProtectedRoute element={<ResourceUploader />} requireAdmin={true} />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      <Analytics />
    </Router>
  );
};

export default App;