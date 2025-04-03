import { useState } from 'react';
import './DonationButton.css';

const DonationButton = ({ buttonText = 'Support Us' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleDonation = () => {
    try {
      setLoading(true);
      setError(null);
      
      // Direct donation link to the donation page
      // This is the most reliable approach until backend is properly set up
      window.open('https://rzp.io/l/caexamplatform', '_blank');
      
      setLoading(false);
    } catch (error) {
      console.error('Donation error:', error);
      setError(error.message || 'An error occurred while opening donation page');
      setLoading(false);
    }
  };
  
  return (
    <div className="donation-button-container">
      <button 
        className="donation-button" 
        onClick={handleDonation}
        disabled={loading}
      >
        {loading ? 'Processing...' : buttonText}
      </button>
      {error && <div className="donation-error">{error}</div>}
    </div>
  );
};

export default DonationButton; 