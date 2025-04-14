import { useState } from 'react';
import './DonationButton.css';
import gpyImage from '../assets/gpy.jpg';

const DonationButton = ({ buttonText = 'Support Us' }) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };
  
  return (
    <div className="donation-button-container">
      <button 
        className="donation-button"
        onClick={handleClick}
      >
        {buttonText}
      </button>

      {showModal && (
        <div className="donation-modal-overlay" onClick={closeModal}>
          <div className="donation-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={closeModal}>×</button>
            <div className="modal-content">
              <img src={gpyImage} alt="Donation Image" className="donation-image" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationButton;