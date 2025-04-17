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
    // --- Bookmark Folders State ---
    const [bookmarkFolders, setBookmarkFolders] = useState([]);
    const [folderLoading, setFolderLoading] = useState(false);
    const [folderError, setFolderError] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderType, setNewFolderType] = useState('question');
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [noteEdit, setNoteEdit] = useState({}); // { [itemId]: note }
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
                setError(err.response?.data?.error || "Failed to load profile.");
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

    useEffect(() => {
        const fetchFolders = async () => {
            setFolderLoading(true);
            setFolderError(null);
            try {
                const res = await api.get('/api/users/me/bookmark-folders');
                setBookmarkFolders(res.data.bookmarkFolders || []);
            } catch (err) {
                setFolderError(err.response?.data?.error || 'Failed to load bookmark folders');
            } finally {
                setFolderLoading(false);
            }
        };
        fetchFolders();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
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
            localStorage.removeItem('token');
            navigate('/login', { state: { message: 'Your account has been successfully deleted' } });
        } catch (err) {
            setDeleteError(err.response?.data?.error || 'Failed to delete account. Please try again.');
        }
    };

    // --- Bookmark Folder CRUD ---
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            setFolderLoading(true);
            const res = await api.post('/api/users/me/bookmark-folders', { name: newFolderName, type: newFolderType });
            setBookmarkFolders(res.data.bookmarkFolders);
            setNewFolderName('');
        } catch (err) {
            setFolderError(err.response?.data?.error || 'Failed to create folder');
        } finally {
            setFolderLoading(false);
        }
    };
    const handleRenameFolder = async (folderId) => {
        if (!editingFolderName.trim()) return;
        try {
            setFolderLoading(true);
            const res = await api.put(`/api/users/me/bookmark-folders/${folderId}`, { name: editingFolderName });
            setBookmarkFolders(res.data.bookmarkFolders);
            setEditingFolderId(null);
            setEditingFolderName('');
        } catch (err) {
            setFolderError(err.response?.data?.error || 'Failed to rename folder');
        } finally {
            setFolderLoading(false);
        }
    };
    const handleDeleteFolder = async (folderId) => {
        if (!window.confirm('Delete this folder and all its bookmarks?')) return;
        try {
            setFolderLoading(true);
            const res = await api.delete(`/api/users/me/bookmark-folders/${folderId}`);
            setBookmarkFolders(res.data.bookmarkFolders);
            setSelectedFolder(null);
        } catch (err) {
            setFolderError(err.response?.data?.error || 'Failed to delete folder');
        } finally {
            setFolderLoading(false);
        }
    };
    // --- Bookmark Note Edit ---
    const handleNoteChange = (itemId, note) => {
        setNoteEdit(prev => ({ ...prev, [itemId]: note }));
    };
    const handleSaveNote = async (folderId, itemId) => {
        try {
            setFolderLoading(true);
            const note = noteEdit[itemId] || '';
            const res = await api.put(`/api/users/me/bookmark-folders/${folderId}/items/${itemId}/note`, { note });
            setBookmarkFolders(folders => folders.map(f => f._id === folderId ? res.data.folder : f));
            setNoteEdit(prev => ({ ...prev, [itemId]: undefined }));
        } catch (err) {
            setFolderError(err.response?.data?.error || 'Failed to update note');
        } finally {
            setFolderLoading(false);
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
        return (
             <div className="page-wrapper">
                <Navbar />
                <div className="profile-container error-message">Could not load user data.</div>
            </div>
        )
    }
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
                {/* --- Bookmark Folders Section --- */}
                <div className="profile-bookmark-folders card">
                    <h2>Bookmark Folders</h2>
                    {folderError && <div className="error-message">{folderError}</div>}
                    <div className="bookmark-folder-create">
                        <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="New folder name" maxLength={100} />
                        <select value={newFolderType} onChange={e => setNewFolderType(e.target.value)}>
                            <option value="question">Questions</option>
                            <option value="resource">Resources</option>
                        </select>
                        <button onClick={handleCreateFolder} disabled={folderLoading || !newFolderName.trim()}>Create</button>
                    </div>
                    <div className="bookmark-folder-list">
                        {bookmarkFolders.length === 0 && <div>No bookmark folders yet.</div>}
                        {bookmarkFolders.map(folder => (
                            <div key={folder._id} className={`bookmark-folder-item${selectedFolder && selectedFolder._id === folder._id ? ' selected' : ''}`}> 
                                {editingFolderId === folder._id ? (
                                    <>
                                        <input type="text" value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)} maxLength={100} />
                                        <button onClick={() => handleRenameFolder(folder._id)} disabled={folderLoading || !editingFolderName.trim()}>Save</button>
                                        <button onClick={() => setEditingFolderId(null)}>Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <span className="folder-name" onClick={() => setSelectedFolder(folder)}>{folder.name} ({folder.type})</span>
                                        <button onClick={() => { setEditingFolderId(folder._id); setEditingFolderName(folder.name); }}>Rename</button>
                                        <button onClick={() => handleDeleteFolder(folder._id)}>Delete</button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Folder Details */}
                    {selectedFolder && (
                        <div className="bookmark-folder-details">
                            <h3>Folder: {selectedFolder.name} ({selectedFolder.type})</h3>
                            <button onClick={() => setSelectedFolder(null)}>Close</button>
                            <ul className="bookmark-items-list">
                                {selectedFolder.items.length === 0 && <li>No bookmarks in this folder.</li>}
                                {selectedFolder.items.map(item => (
                                    <li key={item.itemId} className="bookmark-item">
                                        <div className="bookmark-item-header">
                                            <h4>{item.title || 'Bookmarked Item'}</h4>
                                            <span className="bookmark-date">Added: {item.addedAt ? new Date(item.addedAt).toLocaleString() : ''}</span>
                                        </div>
                                        <div className="bookmark-item-actions">
                                            {selectedFolder.type === 'question' && (
                                                <Link to={`/questions?preSelectedQuestion=${item.itemId}`} className="view-bookmark-btn">View Question</Link>
                                            )}
                                            {selectedFolder.type === 'resource' && (
                                                <Link to={`/resources?preSelectedResource=${item.itemId}`} className="view-bookmark-btn">View Resource</Link>
                                            )}
                                        </div>
                                        <div className="bookmark-note-section">
                                            <textarea
                                                value={noteEdit[item.itemId] !== undefined ? noteEdit[item.itemId] : item.note || ''}
                                                onChange={e => handleNoteChange(item.itemId, e.target.value)}
                                                placeholder="Add a note..."
                                                maxLength={1000}
                                            />
                                            <button onClick={() => handleSaveNote(selectedFolder._id, item.itemId)} disabled={folderLoading}>Save Note</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
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
                {/* Delete Account Modal */}
                {showDeleteConfirm && (
                    <div className="modal-overlay">
                        <div className="modal-content delete-confirmation-modal"> {/* Added specific class */}
                            <h2>Confirm Account Deletion</h2>
                            <p>This action is irreversible. Please enter your password to confirm:</p>
                            <input 
                                type="password" 
                                value={deletePassword} 
                                onChange={e => setDeletePassword(e.target.value)} 
                                placeholder="Password" 
                                className="delete-password-input" // Added class
                            />
                            {deleteError && <div className="error-message">{deleteError}</div>}
                            <div className="modal-actions">
                                <button onClick={handleDeleteAccount} className="delete-account-button confirm-delete-btn">Delete</button> {/* Added specific class */}
                                <button onClick={() => setShowDeleteConfirm(false)} className="cancel-delete-button">Cancel</button> {/* Added class */}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;