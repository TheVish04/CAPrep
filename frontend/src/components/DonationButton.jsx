import { useState } from 'react';
import axios from 'axios';
import './DonationButton.css';

const DonationButton = ({ buttonText = 'Support Us' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };
  
  const handleDonation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }
      
      // Temporary direct implementation until backend API is deployed
      // In production, this should come from your backend
      const amount = 10000; // ₹100
      const currency = 'INR';
      const receipt = `receipt_${Date.now()}`;
      
      // Use test key directly - replace with your test key
      // In production, this should be sent from the backend
      const key_id = 'rzp_test_CBzKjbXtksqg4U';
      
      // Open Razorpay checkout with temporary order details
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'CA Exam Platform',
        description: 'Donation to support CA Exam Platform',
        order_id: receipt, // This is not a real order ID from Razorpay
        handler: function (response) {
          // Simulate success
          alert('Thank you for your donation!');
          console.log('Payment successful', response);
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#03a9f4'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
      razorpay.on('payment.failed', function (response) {
        setError('Payment failed. Please try again.');
        console.error('Payment failed:', response.error);
        setLoading(false);
      });
      
    } catch (error) {
      console.error('Donation error:', error);
      setError(error.message || 'An error occurred while processing your donation');
    } finally {
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