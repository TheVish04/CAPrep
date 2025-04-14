import './DonationButton.css';

const DonationButton = ({ buttonText = 'Support Us' }) => {
  const handleClick = () => {
    // Display a simple message instead of payment functionality
    alert('Thank you for your interest in supporting us!');
  };
  
  return (
    <div className="donation-button-container">
      <button 
        className="donation-button"
        onClick={handleClick}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default DonationButton;