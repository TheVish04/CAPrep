import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './PolicyPages.css';

const RefundPolicy = () => {
  return (
    <div className="page-wrapper policy-page">
      <Helmet>
        <title>Refund Policy | CAprep</title>
        <meta name="description" content="Refund policy for CAprep platform" />
      </Helmet>
      
      <Navbar />
      
      <div className="policy-container">
        <h1>Refund Policy</h1>
        
        <div className="policy-content">
          <p className="introduction">
            This Refund Policy outlines the guidelines and procedures for refunds on CAprep platform. We strive to provide the best possible service to our users, but we understand that there may be instances where a refund is appropriate.
          </p>
          
          <h2>1. Donations</h2>
          <p>1.1. Donations made to CAprep are non-refundable as they are considered charitable contributions to support the platform.</p>
          <p>1.2. However, if you believe a donation was made in error or without authorization, please contact us within 48 hours of the transaction, and we will review your case individually.</p>
          
          <h2>2. Premium Subscriptions</h2>
          <p>2.1. <strong>Subscription Cancellation:</strong> You may cancel your premium subscription at any time. However, cancellations will take effect at the end of your current billing cycle.</p>
          <p>2.2. <strong>Eligibility for Refund:</strong> You may be eligible for a refund in the following circumstances:</p>
          <ul>
            <li>If you cancel within 7 days of your initial purchase (for new subscribers)</li>
            <li>If you are unable to access our services due to technical issues on our end</li>
            <li>If you are charged multiple times for the same subscription due to a system error</li>
          </ul>
          
          <h2>3. Refund Process</h2>
          <p>3.1. <strong>How to Request a Refund:</strong> To request a refund, please contact us at <a href="mailto:caprep8@gmail.com">caprep8@gmail.com</a> with the following information:</p>
          <ul>
            <li>Your registered email address</li>
            <li>Date of purchase</li>
            <li>Order/Transaction ID (if available)</li>
            <li>Reason for refund request</li>
          </ul>
          <p>3.2. <strong>Processing Time:</strong> We will respond to your refund request within 7 business days. If approved, the refund will be processed within 14 business days.</p>
          
          <h2>4. Refund Method</h2>
          <p>4.1. Refunds will be issued using the same payment method used for the original transaction.</p>
          <p>4.2. Depending on your payment provider, it may take additional time for the refunded amount to appear in your account.</p>
          
          <h2>5. Non-Refundable Items</h2>
          <p>The following items are non-refundable:</p>
          <ul>
            <li>Donations, as mentioned in Section 1</li>
            <li>Subscription fees after the 7-day cancellation period</li>
            <li>Any transaction where a service has been substantially used</li>
          </ul>
          
          <h2>6. Special Circumstances</h2>
          <p>6.1. In case of unforeseen circumstances, such as prolonged service unavailability or significant changes to our service offerings, we may provide refunds at our discretion.</p>
          <p>6.2. We reserve the right to review each refund request on a case-by-case basis.</p>
          
          <h2>7. Changes to This Policy</h2>
          <p>We may update our Refund Policy from time to time. We will notify you of any changes by posting the new Refund Policy on this page and updating the "Last Updated" date.</p>
          
          <h2>8. Contact Us</h2>
          <p>If you have any questions about this Refund Policy, please contact us at:</p>
          <p>
            Email: <a href="mailto:caprep8@gmail.com">caprep8@gmail.com</a><br />
            Phone: +91 8591061249
          </p>
          
          <p className="updated-date">Last Updated: April 20, 2024</p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default RefundPolicy; 