const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Razorpay with API keys from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a new payment order
 * @param {number} amount - Amount in the smallest currency unit (paise for INR)
 * @param {string} currency - Currency code (default: INR)
 * @param {object} notes - Additional notes for the order
 * @returns {Promise} Razorpay order object
 */
const createOrder = async (amount, currency = 'INR', notes = {}) => {
  try {
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
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
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
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
      
    return generatedSignature === signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  razorpay
}; 