import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/axiosConfig';
import Navbar from './Navbar';
import './UserProfile.css';
import DonationButton from './DonationButton';
import EditProfile from './EditProfile';

const UserProfile = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState(null);
    // API base URL is handled by axiosConfig

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchUserProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get('/api/users/me');
                setUserData(response.data);
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setError(err.response?.data?.error || "Failed to load profile.");
                
                // If token expired, redirect to login
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login', { 
                        state: { 
                            message: 'Your session has expired. Please log in again.',
                            alertType: 'info'
                        } 
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
        // Optionally, add a call to a backend logout endpoint if one exists
    };
    
    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setDeleteError('Password is required to delete your account');
            return;
        }
        
        try {
            await api.delete('/api/users/me', {
                data: { password: deletePassword }
            });
            
            // On successful deletion
            localStorage.removeItem('token');
            navigate('/login', { state: { message: 'Your account has been successfully deleted' } });
        } catch (err) {
            console.error('Error deleting account:', err);
            setDeleteError(err.response?.data?.error || 'Failed to delete account. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <Navbar />
                <div className="profile-container loading-message">Loading profile...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-wrapper">
                <Navbar />
                <div className="profile-container error-message">Error: {error}</div>
            </div>
        );
    }

    if (!userData) {
        // Should ideally not happen if loading and error are handled, but as a fallback
        return (
             <div className="page-wrapper">
                <Navbar />
                <div className="profile-container error-message">Could not load user data.</div>
            </div>
        )
    }

    // Get counts safely
    const bookmarkedQuestionsCount = userData.bookmarkedQuestions?.length || 0;
    const bookmarkedResourcesCount = userData.bookmarkedResources?.length || 0;

    return (
        <div className="page-wrapper user-profile-page">
            <Navbar />
            <div className="profile-container">
                <h1>My Profile</h1>

                <div className="profile-details card">
                    <div className="profile-header">
                        <div className="profile-picture-container">
                            <img 
                                src={userData.profilePicture || 'https://res.cloudinary.com/demo/image/upload/v1/samples/default-avatar.png'} 
                                alt="Profile" 
                                className="profile-picture" 
                            />
                        </div>
                        <div className="profile-info">
                            <h2>Account Information</h2>
                            <p><strong>Name:</strong> {userData.fullName}</p>
                            <p><strong>Email:</strong> {userData.email}</p>
                            <p><strong>Role:</strong> {userData.role}</p>
                            <p><strong>Member Since:</strong> {new Date(userData.createdAt).toLocaleDateString()}</p>
                            <div className="profile-actions-inline">
                                <button className="edit-profile-btn" onClick={() => setShowEditModal(true)}>Edit Profile</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-summary card">
                    <h2>My Content</h2>
                    <div className="summary-item">
                        <p><strong>Bookmarked Questions:</strong> {bookmarkedQuestionsCount}</p>
                        {bookmarkedQuestionsCount > 0 && (
                            <Link to="/questions?bookmarked=true" className="profile-link">View Questions</Link>
                        )}
                    </div>
                    <div className="summary-item">
                        <p><strong>Bookmarked Resources:</strong> {bookmarkedResourcesCount}</p>
                        {bookmarkedResourcesCount > 0 && (
                            <Link to="/resources?bookmarked=true" className="profile-link">View Resources</Link>
                        )}
                    </div>
                    <div className="summary-item">
                         {/* Link directly to Quiz History page */}
                         <Link to="/quiz-history" className="profile-link full-width-link">View My Quiz History</Link>
                    </div>
                </div>

                <div className="profile-contribution card">
                    <h2>My Contribution</h2>
                    {userData.totalContribution > 0 ? (
                        <div className="contribution-prompt">
                            <p>
                                Thank you for your generous contribution of 
                                <strong> ₹{userData.totalContribution.toFixed(2)} </strong>! 
                                Your support helps keep CAprep running and improving.
                            </p>
                            <p className="retention-message">
                                Consistent support helps us enhance our platform with new features and content.
                                Consider becoming a recurring supporter to help us serve the CA community better!
                            </p>
                            <DonationButton buttonText="Support Again ❤️" />
                        </div>
                    ) : (
                        <div className="contribution-prompt">
                            <p>
                                Help support CAprep by making a donation. Every contribution makes a difference!
                            </p>
                            <DonationButton buttonText="Support CAprep" />
                        </div>
                    )}
                </div>
                
                <div className="profile-actions">
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="delete-account-button">Delete Account</button>
                </div>
                
                {showEditModal && (
                    <EditProfile 
                        userData={userData} 
                        onClose={() => setShowEditModal(false)} 
                        onUpdate={(updatedData) => {
                            setUserData(updatedData);
                            setShowEditModal(false);
                        }} 
                    />
                )}
                
                {showDeleteConfirm && (
                    <div className="delete-account-modal">
                        <div className="delete-account-content">
                            <h2>Delete Account</h2>
                            <p className="warning-text">Warning: This action cannot be undone. All your data will be permanently deleted.</p>
                            
                            {deleteError && <div className="error-message">{deleteError}</div>}
                            
                            <div className="form-group">
                                <label htmlFor="password">Enter your password to confirm:</label>
                                <input 
                                    type="password" 
                                    id="password" 
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    required
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="cancel-button" 
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeletePassword('');
                                        setDeleteError(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="delete-button" 
                                    onClick={handleDeleteAccount}
                                >
                                    Delete My Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default UserProfile;