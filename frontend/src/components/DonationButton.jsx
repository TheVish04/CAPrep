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
              <div className="donation-description">
                <h3>Support Our Mission</h3>
                <p>
                  Your donations help us provide a better experience for CA aspirants across India. With your support, we can:
                </p>
                <ul>
                  <li>Improve server infrastructure for faster page loading and response times</li>
                  <li>Maintain and expand our database of exam resources</li>
                  <li>Cover hosting costs to keep the platform accessible 24/7</li>
                  <li>Develop new features to enhance your exam preparation</li>
                  <li>Keep our content up-to-date with the latest exam patterns</li>
                </ul>
                <p>Every contribution, no matter how small, makes a difference in our ability to support CA students. 
                  Please be advised that in the absence of adequate financial support, the continued operation and availability
                   of this educational platform may be compromised in the foreseeable future.</p>
              </div>
              <img src={gpyImage} alt="Donation QR Code" className="donation-image" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationButton;