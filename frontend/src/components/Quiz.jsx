import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Navbar from './Navbar';
import './Quiz.css';

const Quiz = () => {
  const navigate = useNavigate();
  
  // State for quiz setup
  const [step, setStep] = useState('setup'); // setup, quiz, result
  const [examStage, setExamStage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for quiz questions and results
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);
  
  const handleStartQuiz = async () => {
    // Validate selections
    if (!examStage || !subject) {
      setError('Please select both exam stage and subject');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://caprep.onrender.com/api/questions/quiz?examStage=${encodeURIComponent(examStage)}&subject=${encodeURIComponent(subject)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch quiz questions');
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('No MCQ questions available for the selected criteria');
      }
      
      setQuestions(data);
      setCurrentQuestionIndex(0);
      setSelectedOptions({});
      setScore(0);
      setShowResults(false);
      setStep('quiz');
    } catch (error) {
      console.error('Error starting quiz:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOptionSelect = (questionId, subQuestionIndex, optionIndex) => {
    setSelectedOptions(prev => ({
      ...prev,
      [`${questionId}_${subQuestionIndex}`]: optionIndex
    }));
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateScore();
      setStep('result');
    }
  };
  
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const calculateScore = () => {
    let correctAnswers = 0;
    
    // Loop through each question and compare selected options with correct answers
    questions.forEach((question) => {
      question.subQuestions.forEach((subQuestion, subIndex) => {
        const questionKey = `${question._id}_${subIndex}`;
        const selectedOptionIndex = selectedOptions[questionKey];
        
        // If an option was selected for this question
        if (selectedOptionIndex !== undefined) {
          const selectedOption = subQuestion.subOptions[selectedOptionIndex];
          if (selectedOption && selectedOption.isCorrect) {
            correctAnswers++;
          }
        }
      });
    });
    
    setScore(correctAnswers);
  };
  
  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptions({});
    setScore(0);
    setStep('quiz');
  };
  
  const handleSetupNewQuiz = () => {
    setStep('setup');
    setExamStage('');
    setSubject('');
    setQuestions([]);
  };
  
  const renderQuizSetup = () => (
    <div className="quiz-setup">
      <h1>Quiz Setup</h1>
      <p>Select the exam stage and subject to start a quiz with multiple-choice questions.</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="setup-form">
        <div className="form-group">
          <label htmlFor="examStage">Exam Stage:</label>
          <select 
            id="examStage" 
            value={examStage} 
            onChange={(e) => {
              setExamStage(e.target.value);
              setSubject(''); // Reset subject when exam stage changes
            }}
          >
            <option value="">Select Exam Stage</option>
            <option value="Foundation">Foundation</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Final">Final</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="subject">Subject:</label>
          <select 
            id="subject" 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)}
            disabled={!examStage}
          >
            <option value="">Select Subject</option>
            {examStage === 'Foundation' ? (
              // Foundation subjects
              <>
                <option value="Principles and Practices of Accounting">Principles and Practices of Accounting</option>
                <option value="Business Law">Business Law</option>
                <option value="Business Correspondence and Reporting">Business Correspondence and Reporting</option>
                <option value="Business Mathematics">Business Mathematics</option>
                <option value="Logical Reasoning">Logical Reasoning</option>
                <option value="Statistics">Statistics</option>
                <option value="Business Economics">Business Economics</option>
                <option value="Business and Commercial Knowledge">Business and Commercial Knowledge</option>
              </>
            ) : examStage === 'Intermediate' ? (
              // Intermediate subjects
              <>
                <option value="Advanced Accounting">Advanced Accounting</option>
                <option value="Corporate Laws">Corporate Laws</option>
                <option value="Cost and Management Accounting">Cost and Management Accounting</option>
                <option value="Taxation">Taxation</option>
                <option value="Auditing and Code of Ethics">Auditing and Code of Ethics</option>
                <option value="Financial and Strategic Management">Financial and Strategic Management</option>
              </>
            ) : examStage === 'Final' ? (
              // Final subjects
              <>
                <option value="Financial Reporting">Financial Reporting</option>
                <option value="Advanced Financial Management">Advanced Financial Management</option>
                <option value="Advanced Auditing">Advanced Auditing</option>
                <option value="Direct and International Tax Laws">Direct and International Tax Laws</option>
                <option value="Indirect Tax Laws">Indirect Tax Laws</option>
                <option value="Integrated Business Solutions">Integrated Business Solutions</option>
              </>
            ) : null}
          </select>
        </div>
        
        <button 
          className="start-quiz-btn" 
          onClick={handleStartQuiz}
          disabled={loading || !examStage || !subject}
        >
          {loading ? 'Loading...' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
  
  const renderQuiz = () => {
    if (questions.length === 0) return null;
    
    const currentQuestion = questions[currentQuestionIndex];
    const questionNumber = currentQuestionIndex + 1;
    
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>Question {questionNumber} of {questions.length}</h2>
          <div className="quiz-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${(questionNumber / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="quiz-question">
          <div className="question-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentQuestion.questionText) }}></div>
          
          {currentQuestion.subQuestions.map((subQuestion, subIndex) => (
            <div key={subIndex} className="sub-question">
              <h3>{subQuestion.subQuestionNumber}: {subQuestion.subQuestionText}</h3>
              
              <div className="options-list">
                {subQuestion.subOptions.map((option, optIndex) => (
                  <div 
                    key={optIndex}
                    className={`option ${selectedOptions[`${currentQuestion._id}_${subIndex}`] === optIndex ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(currentQuestion._id, subIndex, optIndex)}
                  >
                    <span className="option-marker">{String.fromCharCode(65 + optIndex)}</span>
                    <span className="option-text">{option.optionText}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="quiz-navigation">
          <button 
            className="prev-btn"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </button>
          
          <button 
            className="next-btn"
            onClick={handleNextQuestion}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </button>
        </div>
      </div>
    );
  };
  
  const renderResults = () => {
    const totalQuestions = questions.reduce((count, question) => count + question.subQuestions.length, 0);
    const percentage = Math.round((score / totalQuestions) * 100);
    
    return (
      <div className="quiz-results">
        <h1>Quiz Results</h1>
        
        <div className="score-card">
          <div className="score-header">
            <h2>Your Score</h2>
          </div>
          <div className="score-body">
            <div className="score-circle">
              <span className="score-percentage">{percentage}%</span>
            </div>
            <div className="score-details">
              <p>You got {score} out of {totalQuestions} questions correct.</p>
            </div>
          </div>
        </div>
        
        <div className="result-actions">
          <button className="retake-btn" onClick={handleRetakeQuiz}>
            Retake This Quiz
          </button>
          <button className="new-quiz-btn" onClick={handleSetupNewQuiz}>
            Start New Quiz
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="quiz-page">
      <Navbar />
      <div className="quiz-main-content">
        {step === 'setup' && renderQuizSetup()}
        {step === 'quiz' && renderQuiz()}
        {step === 'result' && renderResults()}
      </div>
    </div>
  );
};

export default Quiz; 