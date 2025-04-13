import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './PolicyPages.css';

const PrivacyPolicy = () => {
  return (
    <div className="page-wrapper policy-page">
      <Helmet>
        <title>Privacy Policy | CAprep</title>
        <meta name="description" content="Privacy policy for CAprep platform" />
      </Helmet>
      
      <Navbar />
      
      <div className="policy-container">
        <h1>Privacy Policy</h1>
        <div className="policy-content">
          <section>
            <h2>1. Introduction</h2>
            <p>This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform. We respect your privacy and are committed to protecting your personal data.</p>
          </section>
          
          <section>
            <h2>2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul>
              <li>Personal information (such as name, email address, phone number)</li>
              <li>Account information (login credentials)</li>
              <li>Usage data (how you interact with our platform)</li>
              <li>Device information (browser type, IP address)</li>
            </ul>
          </section>
          
          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Notify you about changes to our services</li>
              <li>Provide customer support</li>
              <li>Monitor the usage of our services</li>
              <li>Detect, prevent, and address technical issues</li>
            </ul>
          </section>
          
          <section>
          <h3>1.1 Personal Data</h3>
          <p>Personal Data is information that identifies you as an individual. While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you, including but not limited to:</p>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Education details</li>
            <li>Payment information</li>
          </ul>
          
          <h3>1.2 Usage Data</h3>
          <p>We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include:</p>
          <ul>
            <li>Your computer's Internet Protocol address (IP address)</li>
            <li>Browser type and version</li>
            <li>Pages of our Service that you visit</li>
            <li>Time and date of your visit</li>
            <li>Time spent on those pages</li>
            <li>Other diagnostic data</li>
          </ul>
          </section>
          
          <section>
          <h2>2. How We Use Your Information</h2>
          <p>We may use the information we collect about you for various purposes, including to:</p>
          <ul>
            <li>Provide, maintain, and improve our Services</li>
            <li>Process transactions and send related information</li>
            <li>Send administrative information, such as updates or changes to our terms or policies</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our Services</li>
            <li>Personalize your experience with our Services</li>
            <li>Detect, investigate, and prevent fraudulent transactions or unauthorized access to our Services</li>
          </ul>
          </section>
          
          <section>
          <h2>3. Disclosure of Your Information</h2>
          <p>We may share information we collect in the following situations:</p>
          <ul>
            <li><strong>With Service Providers:</strong> We may share your information with third-party vendors who provide services on our behalf.</li>
            <li><strong>For Legal Purposes:</strong> We may disclose your information where required by law or if we believe such action is necessary to comply with legal processes.</li>
            <li><strong>With Your Consent:</strong> We may share your information with your consent or at your direction.</li>
          </ul>
          </section>
          
          <section>
          <h2>4. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information. However, please be aware that no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee the absolute security of your data.</p>
          </section>
          
          <section>
          <h2>5. Your Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul>
            <li>The right to access and receive a copy of your personal data</li>
            <li>The right to rectify or update your personal data</li>
            <li>The right to delete your personal data</li>
            <li>The right to restrict processing of your personal data</li>
            <li>The right to data portability</li>
            <li>The right to object to processing of your personal data</li>
          </ul>
          </section>
          
          <section>
          <h2>6. Children's Privacy</h2>
          <p>Our Services are not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have collected personal information from a child under 16, we will take steps to delete that information.</p>
          </section>
          
          <section>
          <h2>7. Changes to This Privacy Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
          </section>
          
          <section>
          <h2>8. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <p>
            Email: <a href="mailto:caprep8@gmail.com">caprep8@gmail.com</a><br />
            Phone: +91 8591061249
          </p>
          
          <p className="updated-date">Last Updated: April 20, 2024</p>
          </section>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy; 