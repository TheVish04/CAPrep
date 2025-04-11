import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios';
import './ChatBotPage.css';

const ChatBotPage = () => {
  const [messages, setMessages] = useState([
    { 
      type: 'bot', 
      content: 'Hello! I\'m your CA Assistant. Ask me any questions about Chartered Accountancy.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const messageEndRef = useRef(null);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('cabot_history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setChatHistory(parsedHistory);
      } catch (e) {
        console.error('Error parsing chat history:', e);
      }
    }
  }, []);
  
  // Auto scroll to bottom of messages
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end',
        inline: 'nearest'
      });
    }
  }, [messages]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const createNewChat = () => {
    setMessages([{ 
      type: 'bot', 
      content: 'Hello! I\'m your CA Assistant. Ask me any questions about Chartered Accountancy.',
      timestamp: new Date()
    }]);
    setSelectedConversation(null);
  };
  
  const saveToHistory = (conversation) => {
    // Only save conversations with more than the initial greeting
    if (conversation.length <= 1) return;
    
    const timestamp = new Date();
    const firstUserMessage = conversation.find(msg => msg.type === 'user');
    const title = firstUserMessage ? 
      (firstUserMessage.content.length > 25 ? 
        firstUserMessage.content.substring(0, 25) + '...' : 
        firstUserMessage.content) : 
      'Conversation ' + timestamp.toLocaleString();
    
    const newConvo = { id: Date.now(), title, timestamp, messages: conversation };
    const newHistory = [
      newConvo,
      ...chatHistory.filter(c => c.id !== selectedConversation?.id).slice(0, 9) // Keep only the 10 most recent conversations
    ];
    
    setChatHistory(newHistory);
    setSelectedConversation(newConvo);
    localStorage.setItem('cabot_history', JSON.stringify(newHistory));
  };
  
  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;
    
    const userMessage = {
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai-quiz/ask`, 
        { question: userMessage.content },
        config
      );
      
      const botMessage = {
        type: 'bot',
        content: response.data.answer,
        timestamp: new Date()
      };
      
      const newMessages = [...messages, userMessage, botMessage];
      setMessages(prev => [...prev, botMessage]);
      
      // Save this conversation to history
      saveToHistory(newMessages);
      
    } catch (error) {
      console.error('Error fetching bot response:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadConversation = (convo) => {
    setMessages(convo.messages);
    setSelectedConversation(convo);
  };
  
  const deleteConversation = (e, historyId) => {
    e.stopPropagation(); // Prevent triggering the loadConversation
    
    const updatedHistory = chatHistory.filter(item => item.id !== historyId);
    setChatHistory(updatedHistory);
    localStorage.setItem('cabot_history', JSON.stringify(updatedHistory));
    
    // If the deleted conversation is the currently selected one, create a new chat
    if (selectedConversation && selectedConversation.id === historyId) {
      createNewChat();
    }
  };
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="chatbot-page">
      <Navbar />
      
      <div className="chatbot-container">
        <div className="chatbot-sidebar">
          <button className="new-chat-button" onClick={createNewChat}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" strokeWidth="2">
              <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeLinecap="round" />
            </svg>
            New chat
          </button>
          
          <div className="history-divider">
            <span>Chat History</span>
          </div>
          
          <div className="chat-history-list">
            {chatHistory.length === 0 ? (
              <div className="empty-history-message">
                No chat history yet
              </div>
            ) : (
              chatHistory.map(convo => (
                <div 
                  key={convo.id} 
                  className={`history-item ${selectedConversation?.id === convo.id ? 'active' : ''}`}
                  onClick={() => loadConversation(convo)}
                >
                  <div className="history-item-title">{convo.title}</div>
                  <button 
                    className="history-delete-btn"
                    onClick={(e) => deleteConversation(e, convo.id)}
                    aria-label="Delete conversation"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="chatbot-main">
          <div className="chatbot-header">
            <h1>CA Assistant</h1>
          </div>
          
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`chat-message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'bot' ? (
                    <div className="bot-avatar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="12" rx="2" ry="2"></rect>
                        <line x1="8" y1="12" x2="8" y2="16"></line>
                        <line x1="16" y1="12" x2="16" y2="16"></line>
                        <rect x="8" y="8" width="2" height="2"></rect>
                        <rect x="14" y="8" width="2" height="2"></rect>
                      </svg>
                    </div>
                  ) : (
                    <div className="user-avatar">You</div>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-message bot">
                <div className="message-avatar">
                  <div className="bot-avatar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="12" rx="2" ry="2"></rect>
                      <line x1="8" y1="12" x2="8" y2="16"></line>
                      <line x1="16" y1="12" x2="16" y2="16"></line>
                      <rect x="8" y="8" width="2" height="2"></rect>
                      <rect x="14" y="8" width="2" height="2"></rect>
                    </svg>
                  </div>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>
          
          <div className="chat-input-container">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
              <div className="chat-input-box">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a CA-related question..."
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  className="send-button"
                  disabled={isLoading || input.trim() === ''}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBotPage; 