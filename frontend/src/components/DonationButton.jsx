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
    // Check if input is empty
    if (e.target.value === '') {
      setAmount(''); // Allow empty field temporarily
      return;
    }
    
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
      
      const token = localStorage.getItem('token'); // Get token
      if (!token) {
          throw new Error('User not logged in');
      }
      
      // Decode token to get user ID (simple client-side decode, ensure it matches backend logic)
      let userId = null;
      try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.id;
      } catch (e) {
          console.error('Failed to decode token for user ID');
          throw new Error('Invalid user session');
      }
      if (!userId) {
          throw new Error('Could not extract user ID from token');
      }
      
      // Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }
      
      // Convert rupees to paise for Razorpay
      const amountInPaise = amount * 100;
      
      // Create order via backend API, including userId in notes
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/create-order`, 
        { 
          amount: amountInPaise,
          notes: { userId: userId } // Pass userId here
        },
        {
          headers: { 'Authorization': `Bearer ${token}` } // Pass token for backend auth if needed
        }
      );
      
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
            // Verify payment (backend already has order details)
            const verifyResponse = await axios.post(
              `${import.meta.env.VITE_API_URL}/api/payment/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                // No need to send amount/userId again, backend uses order_id
              },
              {
                 headers: { 'Authorization': `Bearer ${token}` } // Include token if verify endpoint is protected
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
        },
        // Configuration to better handle UPI payments
        config: {
          display: {
            hide: [], // Don't hide any payment methods
            sequence: ['upi', 'card', 'netbanking', 'wallet'], // Prioritize UPI
            preferences: {
              show_default_blocks: true // Show all payment options
            }
          }
        },
        // Specify the correct VPA to use for all UPI payments
        upi: {
          flow: 'collect', // Use collect flow which is more reliable
          vpa: 'caprep548377.rzp@rxairtel', // Force using the working VPA
          description: 'Donationof20tosupportCAprep', // Add description that works
          generateQR: true // Ensure QR code is generated
        },
        // Override Razorpay's default QR code VPA selection
        _: {
          integration: {
            upi: {
              vpa: 'caprep548377.rzp@rxairtel', // Force QR code to use this VPA
              payeeName: 'CAprep',
              mcc: '',
              flow: 'intent'
            }
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
      setError(error.message || 'Donation failed');
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
          {error && <div className="donation-error">{error}</div>}
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
    </div>
  );
};

export default DonationButton; 