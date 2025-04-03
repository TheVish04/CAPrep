import { useState } from 'react';
import axios from 'axios';
import './DonationButton.css';

const DonationButton = ({ buttonText = 'Support Us' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState(100); // Default amount in rupees
  const [showAmountInput, setShowAmountInput] = useState(false);
  
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
  
  const handleAmountChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      setAmount(20); // Set to minimum if not a valid number
    } else {
      setAmount(value);
    }
  };
  
  const toggleAmountInput = () => {
    setShowAmountInput(!showAmountInput);
  };
  
  const handleDonation = async () => {
    try {
      // Validate amount (minimum ₹20)
      if (amount < 20) {
        setError('Minimum donation amount is ₹20');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }
      
      // Convert rupees to paise for Razorpay
      const amountInPaise = amount * 100;
      
      // Create order via backend API
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/create-order`, { 
        amount: amountInPaise 
      });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Failed to create payment order');
      }
      
      const { order, key_id } = response.data;
      
      // Open Razorpay checkout
      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'CAprep',
        description: `Donation of ₹${amount} to support CAprep`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await axios.post(
              `${import.meta.env.VITE_API_URL}/api/payment/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            );
            
            if (verifyResponse.data && verifyResponse.data.success) {
              alert('Thank you for your donation! Your support helps us continue improving our platform.');
              // Reset the UI
              setShowAmountInput(false);
            } else {
              alert('Payment verification failed. Please contact support if the amount was deducted.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('An error occurred during payment verification. If your payment was successful, please contact support.');
          } finally {
            setLoading(false);
          }
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
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      
    } catch (error) {
      console.error('Donation error:', error);
      setError(error.message || 'An error occurred while processing your donation');
      setLoading(false);
    }
  };
  
  return (
    <div className="donation-button-container">
      {showAmountInput ? (
        <div className="donation-amount-container">
          <label className="donation-amount-label">
            Enter amount (min ₹20):
            <input 
              type="number" 
              min="20"
              value={amount}
              onChange={handleAmountChange}
              className="donation-amount-input"
            />
          </label>
          <div className="donation-actions">
            <button 
              className="donation-button proceed-button" 
              onClick={handleDonation}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Proceed'}
            </button>
            <button 
              className="donation-button cancel-button" 
              onClick={toggleAmountInput}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button 
          className="donation-button" 
          onClick={toggleAmountInput}
          disabled={loading}
        >
          {loading ? 'Processing...' : buttonText}
        </button>
      )}
      {error && <div className="donation-error">{error}</div>}
    </div>
  );
};

export default DonationButton; 