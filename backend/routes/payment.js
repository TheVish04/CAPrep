const express = require('express');
const router = express.Router();
const { createOrder, verifyPaymentSignature, getPaymentDetails, razorpay } = require('../services/razorpayService');
const User = require('../models/UserModel'); // Import User model
const { authMiddleware } = require('../middleware/authMiddleware'); // Import auth middleware if needed

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
// Add authMiddleware here if not already public
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    console.log('Create order request received:', req.body);
    const { amount, notes } = req.body; // Expect notes from request
    
    // Minimum amount is now 2000 paise (₹20)
    if (!amount || amount < 2000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid amount (minimum 2000 paise / ₹20)' 
      });
    }
    
    // Ensure notes contain userId if required
    if (!notes || !notes.userId) {
        console.warn('Missing userId in order notes from request');
        // Potentially reject if userId is mandatory for tracking
        // return res.status(400).json({ success: false, message: 'User information missing.' });
    }
    
    // Add the specific VPA to use in the notes
    const orderNotes = {
      ...notes,
      purpose: 'donation',
      preferred_vpa: 'caprep548377.rzp@rxairtel',
      description: 'Donationof20tosupportCAprep'
    };
    
    // Pass notes when creating order in the service
    const order = await createOrder(amount, 'INR', orderNotes); 
    
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
// Add authMiddleware if verification requires logged-in user context (recommended)
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    console.log('Verify payment request received:', req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters'
      });
    }
    
    // 1. Verify Signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    
    if (isValid) {
      try {
        // 2. Fetch Payment Details for amount
        const paymentDetails = await getPaymentDetails(razorpay_payment_id);
        
        // 3. Fetch Order Details to get notes (containing userId)
        const orderDetails = await razorpay.orders.fetch(razorpay_order_id);
        
        console.log('Payment verified. Details:', {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          amount: paymentDetails.amount, // Amount in paise
          status: paymentDetails.status,
          userId: orderDetails.notes?.userId,
          method: paymentDetails.method,
          description: paymentDetails.description,
          vpa: paymentDetails.vpa,
          upi: paymentDetails.upi
        });

        // Additional check for QR code UPI payments which might not report 'captured' status immediately
        const isUpiQrScan = 
          paymentDetails.method === 'upi' && 
          paymentDetails.vpa?.includes('qrcode') ||
          paymentDetails.description?.toLowerCase().includes('qr');
        
        if (isUpiQrScan) {
          console.log('UPI QR code payment detected. Adding fallback check for payment status.');
          
          // For QR code payments, we'll double-check by retrieving payment again
          try {
            // Wait a moment for payment to settle
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Re-fetch payment to get latest status
            const refreshedPayment = await getPaymentDetails(razorpay_payment_id);
            console.log('Refreshed payment status:', refreshedPayment.status);
            
            // Update paymentDetails with refreshed data
            if (refreshedPayment.status === 'captured') {
              paymentDetails.status = 'captured';
              console.log('UPI QR payment status updated to captured');
            }
          } catch (refreshError) {
            console.error('Error refreshing payment status:', refreshError);
          }
        }

        // 4. Check payment status and update user contribution
        if (paymentDetails.status === 'captured' && orderDetails.notes?.userId) {
            const userId = orderDetails.notes.userId;
            const amountInPaise = paymentDetails.amount;
            const amountInRupees = amountInPaise / 100;

            // Update user's totalContribution
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { totalContribution: amountInRupees } }, // Increment by amount in Rupees
                { new: true } // Optional: return updated user doc
            );

            if (updatedUser) {
                console.log(`Updated total contribution for user ${userId} by ${amountInRupees}. New total: ${updatedUser.totalContribution}`);
            } else {
                 console.warn(`Could not find user ${userId} to update contribution for order ${razorpay_order_id}`);
            }
        } else {
             console.log(`Payment status is not 'captured' or userId missing in notes for order ${razorpay_order_id}. Status: ${paymentDetails.status}`);
        }

      } catch (detailsError) {
        // Log error but still return success as signature was valid
        console.error('Error fetching details or updating contribution, but payment signature was verified:', detailsError);
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