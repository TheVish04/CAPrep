import React from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import './Content.css';
import DonationButton from '../components/DonationButton';

const About = () => {
  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="content-container">
        <section className="hero">
          <div className="hero-content">
            <h1>About Us</h1>
            <p>Learn more about our mission to support CA Aspirants in their exam preparation journey.</p>
          </div>
        </section>

        <section className="content-section">
          <h2>Our Mission</h2>
          <p>
            At CAprep, we are dedicated to providing high-quality resources and tools
            to help Chartered Accountancy aspirants prepare effectively for their exams.
            Our platform offers a comprehensive collection of past question papers, organized
            by subject, exam type, and year to facilitate focused study.
          </p>
          
          <h2>Our Story</h2>
          <p>
            Founded by a team of CA professionals and technology experts, our platform
            was born from the recognition that aspirants needed better access to organized
            study materials. We understand the challenges of CA exam preparation and have
            designed our platform to address these specific needs.
          </p>
          
          <h2>What We Offer</h2>
          <ul>
            <li>Comprehensive database of past question papers</li>
            <li>Organized content by subject, exam type, and year</li>
            <li>User-friendly interface for easy navigation</li>
            <li>Regular updates with the latest exam papers</li>
            <li>Secure and reliable platform for your study needs</li>
          </ul>
          
          <div className="support-section">
            <h2>Support Our Work</h2>
            <p>
              We are committed to keeping our platform accessible to all CA Aspirants. Your support
              helps us maintain and improve our services. Consider making a small donation if you
              find our platform valuable.
            </p>
            <DonationButton buttonText="Buy Us a Coffee ☕" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;