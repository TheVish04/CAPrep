import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './DiscussionModal.css';

const DiscussionModal = ({ isOpen, onClose, itemType, itemId, itemTitle }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL;
  
  useEffect(() => {
    if (isOpen && itemId) {
      fetchDiscussion();
    }
  }, [isOpen, itemId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('You must be logged in to view discussions');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(
        `${apiUrl}/api/discussions/${itemType}/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
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
      
      const response = await axios.post(
        `${apiUrl}/api/discussions/${itemType}/${itemId}/message`,
        { content: newMessage },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setMessages(response.data.messages);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  if (!isOpen) return null;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="discussion-modal-overlay" onClick={onClose}>
      <div className="discussion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="discussion-modal-header">
          <h3>
            <i className="fas fa-comments"></i> 
            Discussion: {itemTitle}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="discussion-modal-body">
          {loading ? (
            <div className="loading-spinner">
              <i className="fas fa-spinner fa-spin"></i> Loading discussions...
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
              {messages.map((message, index) => (
                <div key={index} className="message">
                  <div className="message-header">
                    <span className="message-author">
                      <i className="fas fa-user-circle"></i> {message.userId?.name || 'Anonymous'}
                    </span>
                    <span className="message-time">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <form className="discussion-modal-footer" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
            autoFocus
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!newMessage.trim()}
          >
            <i className="fas fa-paper-plane"></i> Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default DiscussionModal; 