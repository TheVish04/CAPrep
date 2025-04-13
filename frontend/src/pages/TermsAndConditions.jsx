import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './PolicyPages.css';

const TermsAndConditions = () => {
  return (
    <div className="page-wrapper policy-page">
      <Helmet>
        <title>Terms and Conditions | CAprep</title>
        <meta name="description" content="Terms and conditions for using the CAprep platform" />
      </Helmet>
      
      <Navbar />
      
      <div className="policy-container">
        <h1>Terms and Conditions</h1>
        
        <div className="policy-content">
          <section>
            <h2>1. Introduction</h2>
            <p>Welcome to our platform. These Terms and Conditions govern your use of our website and services. By accessing or using our platform, you agree to be bound by these Terms.</p>
          </section>
          
          <section>
            <h2>2. Definitions</h2>
            <p>"Company" refers to CAprep.</p>
            <p>"Platform" refers to our website and services.</p>
            <p>"User" refers to individuals who access or use our Platform.</p>
          </section>
          
          <section>
            <h2>3. Account Registration</h2>
            <p>Users may be required to create an account to access certain features of our Platform.</p>
            <p>Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account.</p>
          </section>
          
          <section>
            <h2>4. User Conduct</h2>
            <p>Users agree not to use the Platform for any illegal or unauthorized purpose.</p>
            <p>Users agree not to modify, adapt, or hack the Platform or modify another website to falsely imply that it is associated with the Platform.</p>
          </section>
          
          <section>
            <h2>5. Intellectual Property</h2>
            <p>All content on the Platform, including but not limited to text, graphics, logos, and software, is the property of the Company and is protected by copyright and other intellectual property laws.</p>
          </section>
          
          <section>
            <h2>6. Limitation of Liability</h2>
            <p>The Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Platform.</p>
          </section>
          
          <section>
            <h2>7. Changes to Terms</h2>
            <p>The Company reserves the right to modify these Terms at any time. We will provide notice of any material changes through the Platform.</p>
          </section>
          
          <section>
            <h2>8. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.</p>
          </section>
          
          <section>
            <h2>9. Contact Information</h2>
            <p>If you have any questions about these Terms, please contact us at <a href="mailto:caprep8@gmail.com">caprep8@gmail.com</a> or call us at +91 8591061249.</p>
          </section>
          
          <p className="updated-date">Last Updated: April 20, 2024</p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default TermsAndConditions; 