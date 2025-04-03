const express = require('express');
const router = express.Router();
const { createOrder, verifyPaymentSignature, getPaymentDetails, razorpay } = require('../services/razorpayService');

// GET /api/payment/health - Check Razorpay connection
router.get('/health', async (req, res) => {
  try {
    // Ping Razorpay API to check connection
    await razorpay.orders.all({ count: 1 });
    
    res.status(200).json({
      success: true,
      message: 'Razorpay connection is healthy',
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Razorpay connection error',
      error: error.message
    });
  }
});

// POST /api/payment/create-order - Create a new donation order
router.post('/create-order', async (req, res) => {
  try {
    console.log('Create order request received:', req.body);
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

// POST /api/payment/verify-payment - Verify payment after successful payment
router.post('/verify-payment', async (req, res) => {
  try {
    console.log('Verify payment request received:', req.body);
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
      try {
        // Get payment details for additional verification and logging
        const paymentDetails = await getPaymentDetails(razorpay_payment_id);
        console.log('Payment successful:', {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          amount: paymentDetails.amount,
          status: paymentDetails.status
        });
      } catch (detailsError) {
        console.error('Error fetching payment details, but payment was verified:', detailsError);
      }
      
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