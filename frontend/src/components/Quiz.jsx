import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Navbar from './Navbar';
import './Quiz.css';
import axios from 'axios';

const Quiz = () => {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://caprep.onrender.com';
  
  // State for quiz setup
  const [step, setStep] = useState('setup'); // setup, quiz, result
  const [examStage, setExamStage] = useState('');
  const [subject, setSubject] = useState('');
  const [questionCount, setQuestionCount] = useState(10); // Default to 10 questions
  const [timeLimit, setTimeLimit] = useState(30); // Default to 30 minutes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null); // New state for warnings
  const [availableSubjects, setAvailableSubjects] = useState([]); // State for available subjects
  const [loadingSubjects, setLoadingSubjects] = useState(false); // Loading state for subjects
  
  // State for quiz questions and results
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0); // Time remaining in seconds
  const [timerInterval, setTimerInterval] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false); // Track if results have been calculated
  const [lastQuizAttempt, setLastQuizAttempt] = useState(null); // Store the details of the last attempt for review
  
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);
  
  // Fetch available subjects when exam stage changes
  useEffect(() => {
    if (!examStage) {
      setAvailableSubjects([]);
      return;
    }
    
    const fetchAvailableSubjects = async () => {
      setLoadingSubjects(true);
      setError(null);
      setWarning(null);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/api/questions/available-subjects?examStage=${encodeURIComponent(examStage)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        
        const data = response.data;
        setAvailableSubjects(data);
        
        if (data.length === 0) {
          setWarning(`No subjects with MCQ questions available for ${examStage} exam stage.`);
        } else {
          setWarning(null);
        }
      } catch (error) {
        console.error('Error fetching available subjects:', error);
        setError(`Failed to load subjects: ${error.response?.data?.error || error.message}`);
        setAvailableSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };
    
    fetchAvailableSubjects();
  }, [examStage, API_BASE_URL]);
  
  // Save Quiz History
  const saveQuizHistory = useCallback(async (quizResult) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.post(`${API_BASE_URL}/api/users/me/quiz-history`, quizResult, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Quiz history saved successfully');
    } catch (error) {
      console.error('Error saving quiz history:', error);
    }
  }, [API_BASE_URL]);
  
  // Calculate Score and Prepare Review Data
  const calculateAndFinalizeQuiz = useCallback(() => {
    if (quizCompleted) return;

    let correctAnswers = 0;
    const attemptedQuestionsData = questions.map((question) => {
      // Assuming only one subQuestion for now based on current structure
      const subQuestionIndex = 0;
      const subQuestion = question.subQuestions[subQuestionIndex];
      const questionKey = `${question._id}_${subQuestionIndex}`;
      const selectedOptionIndex = selectedOptions[questionKey]; // Might be undefined
      
      const correctOptionIndex = subQuestion.subOptions.findIndex(opt => opt.isCorrect);
      let isCorrect = false;
      
      if (selectedOptionIndex !== undefined) {
          const selectedOption = subQuestion.subOptions[selectedOptionIndex];
          if (selectedOption && selectedOption.isCorrect) {
              correctAnswers++;
              isCorrect = true;
          }
      }
      
      return {
          questionId: question._id,
          subQuestionIndex,
          selectedOptionIndex, // Can be undefined
          correctOptionIndex,
          isCorrect
          // We can add questionText/options here if needed for immediate review display,
          // but maybe better to fetch full details later from history
      };
    });
    
    const finalScore = correctAnswers;
    setScore(finalScore);
    setQuizCompleted(true);
    setShowResults(true);
    
    const quizResultPayload = {
      subject: subject,
      score: finalScore,
      totalQuestions: questions.length,
      questionsAttempted: attemptedQuestionsData
    };
    
    // Save attempt locally for immediate review button
    setLastQuizAttempt({ 
      ...quizResultPayload, 
      questions: questions // Include the full questions for review 
    }); 
    
    // Save to backend
    if (questions.length > 0) {
      saveQuizHistory(quizResultPayload);
    }

  }, [questions, selectedOptions, quizCompleted, saveQuizHistory, subject]);
  
  // Timer effect
  useEffect(() => {
    let intervalId = null;
    if (step === 'quiz' && timeRemaining > 0 && !quizCompleted) {
      intervalId = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            calculateAndFinalizeQuiz(); // Use the new function
            setStep('result');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(intervalId);
    } else if (step !== 'quiz' || quizCompleted) {
      if (timerInterval) clearInterval(timerInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // Ensure subject is in dependency array if used inside calculateAndFinalizeQuiz indirectly
  }, [step, timeRemaining, quizCompleted, calculateAndFinalizeQuiz]);
  
  const handleStartQuiz = async () => {
    // Validate selections
    if (!examStage || !subject) {
      setError('Please select both exam stage and subject');
      return;
    }
    
    if (questionCount < 1 || questionCount > 50) {
      setError('Please enter a valid number of questions (1-50)');
      return;
    }
    
    if (timeLimit < 1 || timeLimit > 180) {
      setError('Please enter a valid time limit (1-180 minutes)');
      return;
    }
    
    setLoading(true);
    setError(null);
    setWarning(null);
    setQuizCompleted(false);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/questions/quiz?examStage=${encodeURIComponent(examStage)}&subject=${encodeURIComponent(subject)}&limit=${questionCount}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      const data = response.data;
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No MCQ questions available for the selected criteria');
      }
      
      if (data.length < questionCount) {
        setWarning(`Only ${data.length} questions are available for this subject. Quiz will proceed with these.`);
      }
      
      setQuestions(data);
      setCurrentQuestionIndex(0);
      setSelectedOptions({});
      setScore(0);
      setShowResults(false);
      setTimeRemaining(timeLimit * 60);
      setStep('quiz');
    } catch (error) {
      console.error('Error starting quiz:', error);
      setError(error.response?.data?.error || error.message || 'Failed to start quiz');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOptionSelect = (questionId, subQuestionIndex, optionIndex) => {
    if (quizCompleted) return;
    setSelectedOptions(prev => ({
      ...prev,
      [`${questionId}_${subQuestionIndex}`]: optionIndex
    }));
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateAndFinalizeQuiz(); // Use the new function
      if (timerInterval) clearInterval(timerInterval);
      setStep('result');
    }
  };
  
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptions({});
    setScore(0);
    setShowResults(false);
    setQuizCompleted(false);
    setTimeRemaining(timeLimit * 60);
    setStep('quiz');
  };
  
  const handleSetupNewQuiz = () => {
    setStep('setup');
    setExamStage('');
    setSubject('');
    setQuestions([]);
    setQuizCompleted(false);
  };
  
  // Format time from seconds to MM:SS and determine timer class
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Get timer class based on remaining time
  const getTimerClass = () => {
    if (timeLimit <= 0) return 'quiz-timer';
    const totalSeconds = timeLimit * 60;
    const percentage = (timeRemaining / totalSeconds) * 100;
    
    if (percentage <= 10) return 'quiz-timer danger';
    if (percentage <= 25) return 'quiz-timer warning';
    return 'quiz-timer';
  };
  
  // Function to navigate to Quiz Review page (we'll create this page later)
  const handleViewReview = () => {
    if (lastQuizAttempt) {
      // Pass the quiz attempt details to the review page via state
      // Or potentially save to local storage if state gets too large?
      navigate('/quiz-review', { state: { quizAttempt: lastQuizAttempt } });
    }
  };
  
  const renderQuizSetup = () => (
    <div className="quiz-setup">
      <h1>Quiz Setup</h1>
      <p>Select the exam stage and subject to start a quiz with multiple-choice questions.</p>
      
      {error && <div className="error-message">{error}</div>}
      {warning && <div className="warning-message">{warning}</div>}
      
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
            disabled={loading}
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
            disabled={!examStage || loadingSubjects || availableSubjects.length === 0}
          >
            <option value="">
              {loadingSubjects ? 'Loading subjects...' : 
               availableSubjects.length === 0 && examStage ? 'No subjects with MCQs available' : 
               'Select Subject'}
            </option>
            
            {availableSubjects.map(subj => (
              <option key={subj.subject} value={subj.subject}>
                {subj.subject} ({subj.count} MCQs)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="questionCount">Number of Questions:</label>
          <input 
            type="number" 
            id="questionCount" 
            min="1" 
            max="50" 
            value={questionCount} 
            onChange={(e) => {
              const val = e.target.value;
              // Allow empty string during editing
              if (val === '') {
                setQuestionCount('');
              } else {
                const num = parseInt(val);
                // Only apply constraints if it's a valid number
                if (!isNaN(num)) {
                  setQuestionCount(num);
                }
              }
            }}
            onBlur={() => {
              // Apply min constraint when field loses focus
              if (questionCount === '' || questionCount < 1) {
                setQuestionCount(1);
              } else if (questionCount > 50) {
                setQuestionCount(50);
              }
            }}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="timeLimit">Time Limit (minutes):</label>
          <input 
            type="number" 
            id="timeLimit" 
            min="1" 
            max="180" 
            value={timeLimit} 
            onChange={(e) => {
              const val = e.target.value;
              // Allow empty string during editing
              if (val === '') {
                setTimeLimit('');
              } else {
                const num = parseInt(val);
                // Only apply constraints if it's a valid number
                if (!isNaN(num)) {
                  setTimeLimit(num);
                }
              }
            }}
            onBlur={() => {
              // Apply min constraint when field loses focus
              if (timeLimit === '' || timeLimit < 1) {
                setTimeLimit(1);
              } else if (timeLimit > 180) {
                setTimeLimit(180);
              }
            }}
            disabled={loading}
          />
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
        {warning && <div className="warning-message">{warning}</div>}
        <div className="quiz-header">
          <h2>Question {questionNumber} of {questions.length}</h2>
          <div className={getTimerClass()}>Time Remaining: {formatTime(timeRemaining)}</div>
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
              <h3>{subQuestion.subQuestionText}</h3>
              
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
    const totalQs = lastQuizAttempt?.totalQuestions || questions.length;
    const finalScore = lastQuizAttempt?.score ?? score; // Use score from lastAttempt if available
    const percentage = totalQs > 0 ? Math.round((finalScore / totalQs) * 100) : 0;
    
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
              <p>You got {finalScore} out of {totalQs} questions correct.</p>
            </div>
          </div>
        </div>
        
        <div className="result-actions">
          {/* Add Review Button */} 
          {lastQuizAttempt && (
             <button className="review-btn" onClick={handleViewReview}>
                Review Answers
             </button>
          )}
          <button className="retake-btn" onClick={handleRetakeQuiz}>
            Retake This Quiz
          </button>
          <button className="new-quiz-btn" onClick={handleSetupNewQuiz}>
            Start New Quiz
          </button>
          <button className="history-btn" onClick={() => navigate('/quiz-history')}>
            View Quiz History
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