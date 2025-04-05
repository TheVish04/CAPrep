import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import './UserProfile.css'; // Create this CSS file
import DonationButton from './DonationButton';

const UserProfile = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://caprep.onrender.com';

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
                const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setUserData(response.data);
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setError(err.response?.data?.error || "Failed to load profile.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [navigate, API_BASE_URL]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
        // Optionally, add a call to a backend logout endpoint if one exists
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
                    <h2>Account Information</h2>
                    <p><strong>Name:</strong> {userData.fullName}</p>
                    <p><strong>Email:</strong> {userData.email}</p>
                    {/* Add role or registration date if needed */}
                    {/* <p><strong>Role:</strong> {userData.role}</p> */}
                    {/* <p><strong>Member Since:</strong> {new Date(userData.createdAt).toLocaleDateString()}</p> */} 
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
                        <p>
                            Thank you for your generous contribution of 
                            <strong>₹{userData.totalContribution.toFixed(2)}</strong>! 
                            Your support helps keep CAprep running and improving.
                        </p>
                    ) : (
                        <p>
                            Help support CAprep by making a donation. Every contribution makes a difference!
                            <DonationButton buttonText="Donate Now" />
                        </p>
                    )}
                </div>
                
                <div className="profile-actions">
                    {/* Add links to edit profile, change password later if needed */}
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>

            </div>
        </div>
    );
};

export default UserProfile; 