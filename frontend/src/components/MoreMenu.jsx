import React, { useState, useRef, useEffect } from 'react';
import './MoreMenu.css';

const MoreMenu = ({ onDiscuss }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  const handleDiscuss = () => {
    setIsOpen(false);
    onDiscuss();
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="more-menu-container" ref={menuRef}>
      <button 
        className="more-button" 
        onClick={toggleMenu}
        aria-label="More options"
        title="More options"
      >
        <i className="fas fa-ellipsis-v"></i>
      </button>
      
      {isOpen && (
        <div className="more-menu">
          <button className="menu-item" onClick={handleDiscuss}>
            <i className="fas fa-comments"></i> Discuss
          </button>
          {/* Add more menu items here as needed */}
        </div>
      )}
    </div>
  );
};

export default MoreMenu; 