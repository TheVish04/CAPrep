import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DOMPurify from 'dompurify';
import './QuizReview.css'; // Create this CSS file

const QuizReview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const quizAttempt = location.state?.quizAttempt;

    if (!quizAttempt) {
        // If no state is passed, redirect or show an error
        return (
            <div className="page-wrapper">
                <Navbar />
                <div className="quiz-review-container error-message">
                    <h2>Error</h2>
                    <p>No quiz attempt data found. Please go back to the quiz results or history.</p>
                    <Link to="/quiz" className="btn">Take a Quiz</Link>
                    <Link to="/quiz-history" className="btn">View History</Link>
                </div>
            </div>
        );
    }

    const { subject, score, totalQuestions, percentage, date, questionsAttempted, questions } = quizAttempt;

    // Helper to find the full question details using questionId from the attempt
    const getFullQuestion = (questionId) => {
        return questions.find(q => q._id === questionId);
    };

    return (
        <div className="page-wrapper quiz-review-page">
            <Navbar />
            <div className="quiz-review-container">
                <h1>Quiz Review: {subject}</h1>
                <div className="quiz-summary-bar">
                    <span>Score: {score}/{totalQuestions} ({percentage}%)</span>
                    <span>Date: {new Date(date).toLocaleString()}</span>
                </div>

                <div className="review-questions-list">
                    {questionsAttempted.map((attempt, index) => {
                        const fullQuestion = getFullQuestion(attempt.questionId);
                        if (!fullQuestion || !fullQuestion.subQuestions || fullQuestion.subQuestions.length === 0) {
                            return <div key={index} className="review-question-card error">Question data missing for attempt {index + 1}</div>;
                        }
                        
                        // Assuming one sub-question per question structure
                        const subQuestion = fullQuestion.subQuestions[attempt.subQuestionIndex || 0];
                        const selectedOption = attempt.selectedOptionIndex !== undefined ? subQuestion.subOptions[attempt.selectedOptionIndex] : null;
                        const correctOption = subQuestion.subOptions[attempt.correctOptionIndex];

                        return (
                            <div key={fullQuestion._id} className={`review-question-card ${attempt.isCorrect ? 'correct' : 'incorrect'}`}>
                                <h2>Question {index + 1}</h2>
                                <div className="review-question-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullQuestion.questionText) }}></div>
                                {subQuestion.subQuestionText && <h3 className="review-subquestion-text">{subQuestion.subQuestionText}</h3>}
                                
                                <div className="review-options">
                                    <h4>Options:</h4>
                                    <ul>
                                        {subQuestion.subOptions.map((option, optIndex) => (
                                            <li key={optIndex} className={
                                                `review-option 
                                                ${optIndex === attempt.correctOptionIndex ? 'correct-answer' : ''} 
                                                ${optIndex === attempt.selectedOptionIndex ? (attempt.isCorrect ? 'selected-correct' : 'selected-incorrect') : ''}`
                                            }>
                                                <span className="option-marker">{String.fromCharCode(65 + optIndex)}</span>
                                                {option.optionText}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="review-feedback">
                                    {attempt.selectedOptionIndex === undefined ? (
                                        <p className="status unanswered"><strong>Status:</strong> Not Answered</p>
                                    ) : attempt.isCorrect ? (
                                        <p className="status correct"><strong>Status:</strong> Correct!</p>
                                    ) : (
                                        <p className="status incorrect"><strong>Status:</strong> Incorrect</p>
                                    )}
                                    {/* Explanation would go here if we add it later */} 
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="review-actions">
                     <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
                     <Link to="/quiz" className="btn">Take New Quiz</Link>
                </div>
            </div>
        </div>
    );
};

export default QuizReview; 