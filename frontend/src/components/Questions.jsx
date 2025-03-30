import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Navbar from './Navbar';
import PreviewPanel from './PreviewPanel'; // We'll keep this import for now
import { generateQuestionsPDF, savePDF } from '../utils/pdfGenerator';
import './Questions.css';

const Questions = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  // Updated filters state with new criteria
  const [filters, setFilters] = useState({
    subject: '',
    paperType: '',
    questionNumber: '',
    month: '',
    examStage: '',
    paperNo: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAnswers, setShowAnswers] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false); // State for modal visibility
  const [selectedQuestion, setSelectedQuestion] = useState(null); // State for selected question
  const [individualShowAnswers, setIndividualShowAnswers] = useState({}); // Track individual question answer visibility
  const questionsPerPage = 5;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    } else {
      const fetchQuestions = async () => {
        try {
          const response = await fetch('https://ca-project-new.onrender.com/api/questions', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch questions: Status ${response.status} - ${response.statusText}`);
          }
          const data = await response.json();
          console.log('Fetched questions:', data);
          setQuestions(data);
        } catch (error) {
          console.error('Error fetching questions:', error);
          setError(error.message);
        }
      };
      fetchQuestions();
    }
  }, [navigate]);

  const handlePreview = (questionId) => {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      setSelectedQuestion(question);
      setPreviewOpen(true);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedQuestion(null);
  };

  // Generate unique question numbers for the current subject
  const getUniqueQuestionNumbers = () => {
    const subjectFiltered = questions.filter((q) => !filters.subject || q.subject === filters.subject);
    const uniqueQuestionNumbers = [...new Set(subjectFiltered.map((q) => q.questionNumber))];
    return uniqueQuestionNumbers.sort(); // Sort for better UX
  };

  // Updated filtering logic to include new criteria and search keyword (case-insensitive)
  const filteredQuestions = questions.filter((q) => {
    return (
      (!filters.subject || q.subject === filters.subject) &&
      (!filters.paperType || q.paperType === filters.paperType) &&
      (!filters.questionNumber || q.questionNumber === filters.questionNumber) &&
      (!filters.month || q.month === filters.month) &&
      (!filters.examStage || q.examStage === filters.examStage) &&
      (!filters.paperNo || q.paperNo === filters.paperNo) &&
      (!filters.search || (q.questionText && q.questionText.toLowerCase().includes(filters.search.toLowerCase())))
    );
  });

  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle individual question answer visibility toggle
  const toggleIndividualAnswer = (questionId) => {
    setIndividualShowAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };
  
  // Handle PDF export
  const handleExportPDF = () => {
    if (filteredQuestions.length === 0) {
      alert('No questions to export. Please adjust your filters.');
      return;
    }
    
    // Generate the PDF document
    const doc = generateQuestionsPDF(filteredQuestions, filters, showAnswers, individualShowAnswers);
    
    // Save the PDF
    savePDF(doc);
  };

  // We'll modify the rendering of question cards to remove the preview button
  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="questions-section">
        <div className="questions-container">
          <h1>Question Papers</h1>
          
          {error && (
            <div className="error">
              <p>Error: {error}</p>
            </div>
          )}

          {/* Filters Section */}
          <div className="filters">
            <div className="filter-group">
              <label>Filter by Exam Stage:</label>
              <select
                value={filters.examStage}
                onChange={(e) => {
                  // Reset subject and paperNo when exam stage changes
                  setFilters({ 
                    ...filters, 
                    examStage: e.target.value, 
                    subject: '',
                    paperNo: '',
                    questionNumber: '' 
                  });
                }}
              >
                <option value="">All</option>
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Filter by Subject:</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value, questionNumber: '' })}
              >
                <option value="">All</option>
                {filters.examStage === 'Foundation' ? (
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
                ) : filters.examStage === 'Intermediate' ? (
                  // Intermediate subjects
                  <>
                    <option value="Advanced Accounting">Advanced Accounting</option>
                    <option value="Corporate Laws">Corporate Laws</option>
                    <option value="Cost and Management Accounting">Cost and Management Accounting</option>
                    <option value="Taxation">Taxation</option>
                    <option value="Auditing and Code of Ethics">Auditing and Code of Ethics</option>
                    <option value="Financial and Strategic Management">Financial and Strategic Management</option>
                  </>
                ) : filters.examStage === 'Final' ? (
                  // Final subjects
                  <>
                    <option value="Financial Reporting">Financial Reporting</option>
                    <option value="Advanced Financial Management">Advanced Financial Management</option>
                    <option value="Advanced Auditing">Advanced Auditing</option>
                    <option value="Direct and International Tax Laws">Direct and International Tax Laws</option>
                    <option value="Indirect Tax Laws">Indirect Tax Laws</option>
                    <option value="Integrated Business Solutions">Integrated Business Solutions</option>
                  </>
                ) : (
                  // Default subjects when no exam stage is selected
                  <>
                    <option value="Advanced Accounting">Advanced Accounting</option>
                    <option value="Corporate Laws">Corporate Laws</option>
                    <option value="Taxation">Taxation</option>
                    <option value="Cost & Management">Cost & Management</option>
                    <option value="Auditing">Auditing</option>
                    <option value="Financial Management">Financial Management</option>
                  </>
                )}
              </select>
            </div>
            <div className="filter-group">
              <label>Filter by Paper Type:</label>
              <select
                value={filters.paperType}
                onChange={(e) => setFilters({ ...filters, paperType: e.target.value })}
              >
                <option value="">All</option>
                <option value="MTP">MTP</option>
                <option value="RTP">RTP</option>
                <option value="PYQS">PYQS</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Filter by Month:</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              >
                <option value="">All</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
            </div>
            {filters.examStage === 'Foundation' && (
              <div className="filter-group">
                <label>Filter by Paper No.:</label>
                <select
                  value={filters.paperNo}
                  onChange={(e) => setFilters({ ...filters, paperNo: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="Paper 1">Paper 1</option>
                  <option value="Paper 2">Paper 2</option>
                  <option value="Paper 3">Paper 3</option>
                  <option value="Paper 4">Paper 4</option>
                </select>
              </div>
            )}
            <div className="filter-group">
              <label>Filter by Question No.:</label>
              <select
                value={filters.questionNumber}
                onChange={(e) => setFilters({ ...filters, questionNumber: e.target.value })}
              >
                <option value="">All</option>
                {getUniqueQuestionNumbers().map((qn) => (
                  <option key={qn} value={qn}>
                    {qn}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Search Keyword:</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Enter keywords"
              />
            </div>
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                />
                Show Answers
              </label>
            </div>
            
            {/* Export PDF Button */}
            <div className="filter-group export-pdf">
              <button 
                className="export-pdf-btn" 
                onClick={handleExportPDF}
                title="Export filtered questions to PDF"
              >
                Export to PDF
              </button>
            </div>
          </div>

          {filteredQuestions.length === 0 && !error && <p className="no-questions">No questions available.</p>}
          {currentQuestions.length > 0 && (
            <>
              <div className="questions-list">
                {currentQuestions.map((question) => (
                  <div key={question.id} className="question-card">
                    <h2>
                      {question.subject} - {question.month}, {question.year}
                    </h2>
                    {question.questionNumber && (
                      <p><strong>Question Number:</strong> {question.questionNumber}</p>
                    )}
                    <p><strong>Question:</strong></p>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.questionText) }} />
                    {(showAnswers || individualShowAnswers[question.id]) && question.answerText && (
                      <>
                        <p><strong>Answer:</strong></p>
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.answerText) }} />
                      </>
                    )}
                    {question.pdfFile && (
                      <p>
                        <strong>PDF:</strong>{' '}
                        <a href={question.pdfFile} target="_blank" rel="noopener noreferrer">
                          {question.pdfFile}
                        </a>
                      </p>
                    )}
                    {question.pageNumber && (
                      <p><strong>Page:</strong> {question.pageNumber}</p>
                    )}
                    <div className="filter-group individual-answer-toggle">
                      <label>
                        <input
                          type="checkbox"
                          checked={individualShowAnswers[question.id] || false}
                          onChange={() => toggleIndividualAnswer(question.id)}
                        />
                        Show Answer for this Question
                      </label>
                    </div>
                    {question.subQuestions && question.subQuestions.length > 0 && (
                      <>
                        <h3>Sub-Questions</h3>
                        {question.subQuestions.map((subQ, index) => (
                          <div key={index} className="sub-question">
                            <p><strong>Sub-Question {subQ.subQuestionNumber}:</strong> {subQ.subQuestionText}</p>
                            <ul>
                              {subQ.subOptions.map((opt, optIndex) => (
                                <li key={optIndex}>
                                  {opt.optionText}{' '}
                                  {opt.isCorrect && <span className="correct-answer">(Correct)</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </>
                    )}
                    {/* Remove the preview button completely */}
                  </div>
                ))}
              </div>
              <div className="pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={currentPage === number ? 'active' : ''}
                  >
                    {number}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* PreviewPanel component is still available if needed in the future */}
      {previewOpen && selectedQuestion && (
        <PreviewPanel data={selectedQuestion} onClose={handleClosePreview} />
      )}
    </div>
  );
};

export default Questions;