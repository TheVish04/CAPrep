const express = require('express');
const router = express.Router();
const { createOrder, verifyPaymentSignature, razorpay } = require('../services/razorpayService');

// Create a new donation order
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount < 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid amount (minimum 100 paise / ₹1)' 
      });
    }
    
    const order = await createOrder(amount);
    
    res.status(200).json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error in create-order route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
});

// Verify payment after successful payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters'
      });
    }
    
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    
    if (isValid) {
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Error in verify-payment route:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

module.exports = router; 