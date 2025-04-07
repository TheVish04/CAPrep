import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';
import './DiscussionModal.css';

const DiscussionModal = ({ isOpen, onClose, itemType, itemId, itemTitle }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'https://caprep.onrender.com';
  
  // Add state variables for editing messages
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const editInputRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && itemId) {
      fetchDiscussion();
      fetchCurrentUser();
    }
  }, [isOpen, itemId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (replyingTo && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [replyingTo]);
  
  useEffect(() => {
    if (editingMessage && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessage]);
  
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setCurrentUser(response.data);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };
  
  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('You must be logged in to view discussions');
        setLoading(false);
        return;
      }
      
      console.log(`Fetching discussion: ${API_URL}/api/discussions/${itemType}/${itemId}`);
      const response = await axios.get(
        `${API_URL}/api/discussions/${itemType}/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('Discussion data:', response.data);
      setMessages(response.data.messages || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching discussion:', err);
      setError('Failed to load discussion. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('You must be logged in to send messages');
        return;
      }
      
      console.log(`Sending message to: ${API_URL}/api/discussions/${itemType}/${itemId}/message`);
      console.log('Message data:', { 
        content: newMessage,
        parentMessageId: replyingTo ? replyingTo._id : null
      });
      
      const response = await axios.post(
        `${API_URL}/api/discussions/${itemType}/${itemId}/message`,
        { 
          content: newMessage,
          parentMessageId: replyingTo ? replyingTo._id : null
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('Response after sending message:', response.data);
      setMessages(response.data.messages);
      setNewMessage('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to send message: ${err.message || 'Unknown error'}`);
    }
  };
  
  const handleLike = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // First get the discussion ID
      const discussionResponse = await axios.get(
        `${API_URL}/api/discussions/${itemType}/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const discussionId = discussionResponse.data._id;
      
      const response = await axios.post(
        `${API_URL}/api/discussions/${discussionId}/message/${messageId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(response.data.messages);
    } catch (err) {
      console.error('Error liking message:', err);
    }
  };
  
  const handleReply = (message) => {
    setReplyingTo(message);
    
    // Get the name in a safe way using our helper function
    const displayName = getUserDisplayName(message.userId);
    const firstName = displayName.split(' ')[0];
    
    setNewMessage(`@${firstName} `);
  };
  
  const cancelReply = () => {
    setReplyingTo(null);
    setNewMessage('');
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Add handlers for edit and delete actions
  const handleEditMessage = async (e) => {
    e.preventDefault();
    if (!editContent.trim() || !editingMessage) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // First get the discussion ID
      const discussionResponse = await axios.get(
        `${API_URL}/api/discussions/${itemType}/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const discussionId = discussionResponse.data._id;
      
      const response = await axios.put(
        `${API_URL}/api/discussions/${discussionId}/message/${editingMessage._id}`,
        { content: editContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(response.data.messages);
      setEditingMessage(null);
      setEditContent('');
    } catch (err) {
      console.error('Error editing message:', err);
      setError(`Failed to edit message: ${err.message || 'Unknown error'}`);
    }
  };
  
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // First get the discussion ID
      const discussionResponse = await axios.get(
        `${API_URL}/api/discussions/${itemType}/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const discussionId = discussionResponse.data._id;
      
      const response = await axios.delete(
        `${API_URL}/api/discussions/${discussionId}/message/${messageId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(response.data.messages);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError(`Failed to delete message: ${err.message || 'Unknown error'}`);
    }
  };
  
  const handleStartEdit = (message) => {
    setEditingMessage(message);
    setEditContent(message.content);
  };
  
  const cancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };
  
  if (!isOpen) return null;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Organize messages into threads (parent messages and their replies)
  const organizeMessages = () => {
    if (!messages || messages.length === 0) return [];
    
    const parentMessages = messages.filter(m => !m.parentMessageId);
    const replies = messages.filter(m => m.parentMessageId);
    
    // Add replies to their parent messages
    const threads = parentMessages.map(parent => {
      const messageReplies = replies.filter(reply => 
        reply.parentMessageId && 
        parent._id && 
        reply.parentMessageId.toString() === parent._id.toString()
      );
      return {
        ...parent,
        replies: messageReplies
      };
    });
    
    return threads;
  };
  
  const threads = organizeMessages();
  const isUserAdmin = currentUser?.role === 'admin';
  
  // Helper function to get the display name from a user object
  const getUserDisplayName = (user) => {
    // Handle different possible user field structures
    if (!user) return 'Anonymous';
    if (typeof user === 'string') return user;
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    return 'Anonymous';
  };

  // Helper function to get the first letter of name for avatar
  const getAvatarInitial = (user) => {
    const name = getUserDisplayName(user);
    return name.charAt(0) || '?';
  };
  
  // Check if current user can edit/delete a message
  const canModifyMessage = (message) => {
    if (!currentUser || !message) return false;
    return isUserAdmin || (message.userId && message.userId._id === currentUser._id);
  };

  // Render message content with edit form if needed
  const renderMessageContent = (message) => {
    if (message.deleted) {
      return <div className="deleted-message">[This message was deleted]</div>;
    }
    
    if (editingMessage && editingMessage._id === message._id) {
      return (
        <form className="edit-form" onSubmit={handleEditMessage}>
          <textarea
            className="edit-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            ref={editInputRef}
          />
          <div className="edit-actions">
            <button type="submit" className="save-button">Save</button>
            <button type="button" className="cancel-button" onClick={cancelEdit}>Cancel</button>
          </div>
        </form>
      );
    }
    
    return (
      <div className="message-content">
        {DOMPurify.sanitize(message.content)}
        {message.edited && <span className="edited-indicator">(edited)</span>}
      </div>
    );
  };

  // Render message actions including like, reply, edit, delete buttons
  const renderMessageActions = (message, isReply = false) => {
    const actionClass = isReply ? 'reply-actions' : 'message-actions';
    
    return (
      <div className={actionClass}>
        <button 
          className={`like-button ${message.likes && currentUser && message.likes.includes(currentUser._id) ? 'liked' : ''}`}
          onClick={() => handleLike(message._id)}
        >
          {message.likes?.length || 0} ♥
        </button>
        
        {!message.deleted && (
          <button className="reply-button" onClick={() => handleReply(message)}>
            Reply
          </button>
        )}
        
        {canModifyMessage(message) && !message.deleted && (
          <>
            <button 
              className="edit-button" 
              onClick={() => handleStartEdit(message)}
              disabled={editingMessage !== null}
            >
              Edit
            </button>
            <button 
              className="delete-button" 
              onClick={() => handleDeleteMessage(message._id)}
            >
              Delete
            </button>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="discussion-modal-overlay" onClick={onClose}>
      <div className="discussion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="discussion-modal-header">
          <h3>
            <i className="fas fa-comments"></i> 
            Discussion: {itemTitle}
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="discussion-modal-body">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div> Loading discussions...
            </div>
          ) : error ? (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-discussion">
              <i className="fas fa-comments"></i>
              <p>No messages yet. Be the first to start the discussion!</p>
            </div>
          ) : (
            <div className="messages-container">
              {threads.map((thread) => (
                <div key={thread._id} className="message-thread">
                  <div className="message">
                    <div className="message-header">
                      <div className="message-author">
                        <span className="user-avatar">{getAvatarInitial(thread.userId)}</span>
                        <span>{getUserDisplayName(thread.userId)}</span>
                        {thread.userId?.role === 'admin' && (
                          <span className="admin-badge">Admin</span>
                        )}
                      </div>
                      <span className="message-time">
                        {formatDate(thread.timestamp)}
                      </span>
                    </div>
                    
                    {renderMessageContent(thread)}
                    
                    {renderMessageActions(thread)}
                    
                    {/* Replies */}
                    {thread.replies && thread.replies.length > 0 && (
                      <div className="replies-container">
                        {thread.replies.map(reply => (
                          <div key={reply._id} className="reply">
                            <div className="reply-header">
                              <div className="reply-author">
                                <span className="user-avatar">{getAvatarInitial(reply.userId)}</span>
                                <span>{getUserDisplayName(reply.userId)}</span>
                                {reply.userId?.role === 'admin' && (
                                  <span className="admin-badge">Admin</span>
                                )}
                              </div>
                              <span className="reply-time">
                                {formatDate(reply.timestamp)}
                              </span>
                            </div>
                            
                            {renderMessageContent(reply)}
                            
                            {renderMessageActions(reply, true)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {replyingTo && (
          <div className="replying-to-bar">
            <span>Replying to: <strong>{getUserDisplayName(replyingTo.userId)}</strong></span>
            <button className="cancel-reply-btn" onClick={cancelReply}>×</button>
          </div>
        )}
        
        <form className="discussion-modal-footer" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={replyingTo ? `Reply to ${getUserDisplayName(replyingTo.userId)}...` : "Type your message..."}
            className="message-input"
            ref={messageInputRef}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default DiscussionModal; 