import React from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import './Content.css';
import DonationButton from '../components/DonationButton';

const Contact = () => {
  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="content-container">
        <section className="hero">
          <div className="hero-content">
            <h1>Contact Us</h1>
            <p>We're here to help! Reach out to us with any questions or feedback.</p>
          </div>
        </section>

        <section className="content-section">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>
              Have questions about our platform or need assistance? 
              We're always happy to hear from you.
            </p>
            
            <div className="contact-details">
              <div className="contact-item">
                <h3>Email</h3>
                <p><a href="mailto:support@caprep.com">support@caprep.com</a></p>
              </div>
              
              <div className="contact-item">
                <h3>Phone</h3>
                <p>+91 98765 43210</p>
              </div>
              
              <div className="contact-item">
                <h3>Address</h3>
                <p>
                  CAprep<br />
                  123 Education Street<br />
                  Mumbai, Maharashtra 400001<br />
                  India
                </p>
              </div>
            </div>
          </div>
          
          <div className="contact-hours">
            <h3>Hours of Operation</h3>
            <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
            <p>Saturday: 10:00 AM - 2:00 PM</p>
            <p>Sunday: Closed</p>
          </div>
          
          <div className="social-media">
            <h3>Connect With Us</h3>
            <p>Follow us on social media for updates and tips:</p>
            <div className="social-links">
              <a href="#" className="social-link">Facebook</a>
              <a href="#" className="social-link">Twitter</a>
              <a href="#" className="social-link">LinkedIn</a>
              <a href="#" className="social-link">Instagram</a>
            </div>
          </div>
          
          <div className="support-section">
            <h3>Support Our Mission</h3>
            <p>
              If you find our platform helpful, consider supporting us with a small donation.
              Your contribution helps us continue providing quality resources to CA Aspirants.
            </p>
            <DonationButton buttonText="Donate ❤️" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Contact;