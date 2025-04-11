import React, { useState, useRef, useEffect } from 'react';
import './CABot.css';
import axios from 'axios';

const CABot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      type: 'bot', 
      content: 'Hello! I\'m your CA Assistant. Ask me any questions about Chartered Accountancy.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const messageEndRef = useRef(null);
  const menuRef = useRef(null);
  
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
  
  // Auto scroll to bottom of messages without affecting page scroll
  useEffect(() => {
    if (messageEndRef.current) {
      // Use scrollIntoView with a specific configuration
      messageEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end',
        inline: 'nearest'
      });
    }
  }, [messages]);
  
  // Alternative scroll function that doesn't affect page
  const scrollMessagesToBottom = () => {
    const messagesContainer = document.querySelector('.ca-bot-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  // Call this function after messages update
  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages]);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (showHistory) setShowHistory(false);
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    
    const newHistory = [
      { id: Date.now(), title, timestamp, messages: conversation },
      ...chatHistory.slice(0, 9) // Keep only the 10 most recent conversations
    ];
    
    setChatHistory(newHistory);
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
      
      const newMessages = [
        ...messages,
        userMessage,
        {
          type: 'bot',
          content: response.data.answer,
          timestamp: new Date()
        }
      ];
      
      setMessages(prev => [...prev, {
        type: 'bot',
        content: response.data.answer,
        timestamp: new Date()
      }]);
      
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
  
  const clearChat = () => {
    // Save current conversation to history first if it has content
    if (messages.length > 1) {
      saveToHistory([...messages]);
    }
    
    setMessages([{ 
      type: 'bot', 
      content: 'Chat cleared. How can I help you today?',
      timestamp: new Date()
    }]);
    setMenuOpen(false);
  };
  
  const newChat = () => {
    // Save current conversation to history first if it has content
    if (messages.length > 1) {
      saveToHistory([...messages]);
    }
    
    setMessages([{ 
      type: 'bot', 
      content: 'Hello! I\'m your CA Assistant. Ask me any questions about Chartered Accountancy.',
      timestamp: new Date()
    }]);
    setMenuOpen(false);
  };
  
  const deleteChat = () => {
    setIsOpen(false);
    setTimeout(() => {
      setMessages([{ 
        type: 'bot', 
        content: 'Hello! I\'m your CA Assistant. Ask me any questions about Chartered Accountancy.',
        timestamp: new Date()
      }]);
      setMenuOpen(false);
    }, 300);
  };
  
  const toggleHistory = () => {
    setShowHistory(!showHistory);
    setMenuOpen(false);
  };
  
  const loadConversation = (convo) => {
    setMessages(convo.messages);
    setShowHistory(false);
  };
  
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="ca-bot-container">
      <button 
        className="ca-bot-button" 
        onClick={toggleChat}
        aria-label="Toggle chat bot"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        )}
      </button>
      
      {isOpen && (
        <div className="ca-bot-chat">
          <div className="ca-bot-header">
            <h3 className="ca-bot-title">{showHistory ? 'Chat History' : 'CA Assistant'}</h3>
            <div className="ca-bot-menu-container" ref={menuRef}>
              <button onClick={toggleMenu} className="ca-bot-menu-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="6" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="18" r="2" />
                </svg>
              </button>
              {menuOpen && (
                <div className="ca-bot-menu">
                  <button onClick={newChat}>New Chat</button>
                  <button onClick={clearChat}>Clear Chat</button>
                  <button onClick={toggleHistory}>
                    {showHistory ? 'Current Chat' : 'Chat History'}
                  </button>
                  <button onClick={deleteChat}>Delete Chat</button>
                </div>
              )}
              <button onClick={toggleChat} className="ca-bot-close-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {showHistory ? (
            <div className="ca-bot-history">
              {chatHistory.length === 0 ? (
                <div className="ca-bot-history-empty">
                  <p>No chat history available</p>
                </div>
              ) : (
                chatHistory.map(convo => (
                  <div 
                    key={convo.id} 
                    className="ca-bot-history-item"
                    onClick={() => loadConversation(convo)}
                  >
                    <h4>{convo.title}</h4>
                    <p>{formatDate(convo.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="ca-bot-messages">
                {messages.map((message, index) => (
                  <div key={index} className={`ca-bot-message ${message.type}`}>
                    <div className="ca-bot-message-content">{message.content}</div>
                    <div className="ca-bot-message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="ca-bot-message bot">
                    <div className="ca-bot-typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>
              <div className="ca-bot-input">
                <input
                  value={input}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a CA-related question..."
                  disabled={isLoading}
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={isLoading || input.trim() === ''}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CABot; 