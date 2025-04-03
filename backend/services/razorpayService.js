const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Razorpay with API keys from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test the connection
(async function testRazorpayConnection() {
  try {
    const response = await razorpay.orders.all({ count: 1 });
    console.log('Razorpay connection successful');
  } catch (error) {
    console.error('Razorpay connection error:', error.message);
    if (error.description) {
      console.error('Error description:', error.description);
    }
  }
})();

/**
 * Create a new payment order
 * @param {number} amount - Amount in the smallest currency unit (paise for INR)
 * @param {string} currency - Currency code (default: INR)
 * @param {object} notes - Additional notes for the order
 * @returns {Promise} Razorpay order object
 */
const createOrder = async (amount, currency = 'INR', notes = {}) => {
  try {
    if (!amount || amount < 100) {
      throw new Error('Amount must be at least 100 paise (₹1)');
    }
    
    console.log(`Creating Razorpay order for amount: ${amount} ${currency}`);
    
    const options = {
      amount: amount, // amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        ...notes,
        purpose: 'donation'
      },
    };
    
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created successfully:', order.id);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    if (error.error && error.error.description) {
      console.error('Razorpay error details:', error.error.description);
      throw new Error(`Failed to create payment order: ${error.error.description}`);
    }
    throw new Error('Failed to create payment order');
  }
};

/**
 * Verify Razorpay payment signature
 * @param {string} razorpayOrderId - Order ID received from Razorpay
 * @param {string} razorpayPaymentId - Payment ID received from Razorpay
 * @param {string} signature - Signature received from Razorpay
 * @returns {boolean} - Whether the signature is valid
 */
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, signature) => {
  try {
    console.log('Verifying payment signature for order:', razorpayOrderId);
    
    if (!razorpayOrderId || !razorpayPaymentId || !signature) {
      console.error('Missing required parameters for signature verification');
      return false;
    }
    
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    const isValid = generatedSignature === signature;
    console.log('Signature verification result:', isValid ? 'Valid' : 'Invalid');
    
    return isValid;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Retrieve payment details by payment ID
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise} Payment details
 */
const getPaymentDetails = async (paymentId) => {
  try {
    console.log('Fetching payment details for ID:', paymentId);
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  razorpay
}; 