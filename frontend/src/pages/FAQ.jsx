import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './FAQ.css';

const FAQ = () => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="faq-page">
      <Navbar />

      <div className="faq-container">
        <div className="faq-header">
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about CAprep</p>
        </div>

        <div className="faq-content">
          <div className="faq-category">
            <h2>General Questions</h2>
            
            <div className="faq-item">
              <details>
                <summary>What is CAprep?</summary>
                <div className="faq-answer">
                  <p>CAprep is a comprehensive web application designed to help Chartered Accountancy students prepare for their examinations effectively. Our platform provides practice questions, quizzes, learning resources, discussion forums, and performance analytics to enhance your study experience.</p>
                </div>
              </details>
            </div>

            <div className="faq-item">
              <details>
                <summary>Is CAprep free to use?</summary>
                <div className="faq-answer">
                  <p>Yes, basic access to CAprep is completely free! We offer premium subscription options with additional features, but our core functionality is available at no cost.</p>
                </div>
              </details>
            </div>

            <div className="faq-item">
              <details>
                <summary>How do I create an account?</summary>
                <div className="faq-answer">
                  <p>Creating an account is simple! Click on the "Register" button in the navigation bar, fill out the required information, verify your email address, and you're ready to start using CAprep.</p>
                </div>
              </details>
            </div>
          </div>

          <div className="faq-category">
            <h2>Questions & Quizzes</h2>
            
            <div className="faq-item">
              <details>
                <summary>What types of questions are available?</summary>
                <div className="faq-answer">
                  <p>CAprep provides a variety of question types including multiple choice questions (MCQs), previous years' questions, practice tests, and AI-generated questions covering all topics in the CA curriculum.</p>
                </div>
              </details>
            </div>

            <div className="faq-item">
              <details>
                <summary>How do the quizzes work?</summary>
                <div className="faq-answer">
                  <p>You can customize quizzes based on exam stage, subject, topic, and difficulty level. Select the number of questions and time limit, then take the quiz. After completion, you'll receive immediate feedback with detailed explanations and performance analytics.</p>
                </div>
              </details>
            </div>

            <div className="faq-item">
              <details>
                <summary>Can I track my quiz performance over time?</summary>
                <div className="faq-answer">
                  <p>Absolutely! Your dashboard provides comprehensive analytics of your quiz history, including performance trends, strengths and weaknesses by subject, and recommended focus areas for improvement.</p>
                </div>
              </details>
            </div>
          </div>

          <div className="faq-category">
            <h2>Resources & Study Materials</h2>
            
            <div className="faq-item">
              <details>
                <summary>What study materials are available?</summary>
                <div className="faq-answer">
                  <p>CAprep offers a wide range of study materials including PDF resources, topic notes, reference materials, and curated content organized by subjects, topics, and difficulty levels.</p>
                </div>
              </details>
            </div>

            <div className="faq-item">
              <details>
                <summary>Can I download resources for offline study?</summary>
                <div className="faq-answer">
                  <p>Yes! Most resources are downloadable as PDFs, allowing you to study offline at your convenience.</p>
                </div>
              </details>
            </div>
          </div>

          <div className="faq-category">
            <h2>Account & Technical Support</h2>
            
            <div className="faq-item">
              <details>
                <summary>I forgot my password. How can I reset it?</summary>
                <div className="faq-answer">
                  <p>Click on the "Forgot Password" link on the login page. Enter your registered email address, and we'll send you instructions to reset your password.</p>
                </div>
              </details>
            </div>

            <div className="faq-item">
              <details>
                <summary>How can I contact support?</summary>
                <div className="faq-answer">
                  <p>For any technical issues or queries, you can reach out to our support team through the <Link to="/contactus">Contact Us</Link> page or directly email us at caprep8@gmail.com.</p>
                </div>
              </details>
            </div>

            <div className="faq-item">
              <details>
                <summary>Is my data secure on CAprep?</summary>
                <div className="faq-answer">
                  <p>Yes, we take data security very seriously. All user data is encrypted and stored securely. We never share your personal information with third parties. You can review our <Link to="/privacy">Privacy Policy</Link> for more details.</p>
                </div>
              </details>
            </div>
          </div>
        </div>

        <div className="faq-not-found">
          <h3>Can't find what you're looking for?</h3>
          <p>If you have any other questions or need further assistance, please don't hesitate to contact us.</p>
          <Link to="/contactus" className="cta-btn primary-btn">Contact Us</Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQ; 