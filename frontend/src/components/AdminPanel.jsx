import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import PreviewPanel from './PreviewPanel';
import Navbar from './Navbar';
import DOMPurify from 'dompurify';
import AdminAnalytics from './AdminAnalytics';
import ResourceUploader from './ResourceUploader';
import './AdminPanel.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getActiveTab = () => {
    if (location.pathname.includes('/resources')) return 'resources';
    if (location.pathname.includes('/analytics')) return 'analytics';
    return 'questions';
  };
  const [activeTab, setActiveTab] = useState(getActiveTab());
  
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Add question type state
  const [questionType, setQuestionType] = useState('objective-subjective');

  const [formData, setFormData] = useState({
    subject: '',
    paperType: '',
    year: '',
    month: '',
    examStage: '',
    paperNo: '',
    questionNumber: '',
    questionText: '',
    answerText: '',
    subQuestions: [],
  });

  const [errors, setErrors] = useState({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [storedQuestions, setStoredQuestions] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [filters, setFilters] = useState({
    subject: '',
    year: '',
    questionNumber: '',
    paperType: '',
    month: '',
    examStage: '',
    paperNo: '',
    search: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedId, setLastSubmittedId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  const fetchQuestions = useCallback(async (token, query = '') => {
    try {
      const response = await fetch(`https://caprep.onrender.com/api/questions${query ? `?${query}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      const data = await response.json();
      if (response.ok) {
        const questions = Array.isArray(data) ? data : [data];
        const sortedQuestions = [...questions].sort((a, b) => 
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        setStoredQuestions(sortedQuestions);
      } else {
        console.error('Failed to fetch questions:', response.statusText, data);
        alert(`Failed to fetch questions: ${response.statusText} - ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert(`Error fetching questions: ${error.message}`);
    }
  }, []);

  const applyFilters = useCallback((token) => {
    const query = new URLSearchParams(filters).toString();
    fetchQuestions(token, query);
  }, [filters, fetchQuestions]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    } else {
      applyFilters(token);
    }
  }, [navigate, applyFilters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    // If examStage is changing, reset subject and paperNo as they depend on examStage
    if (name === 'examStage') {
      setFilters(prev => ({
        ...prev,
        [name]: value,
        subject: '',
        paperNo: value !== 'Foundation' ? '' : prev.paperNo
      }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const addSubQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      subQuestions: [
        ...prev.subQuestions,
        { subQuestionNumber: '', subQuestionText: '', subOptions: [{ optionText: '', isCorrect: false }] },
      ],
    }));
  };

  const removeSubQuestion = (index) => {
    console.log('Removing subquestion at index:', index);
    setFormData((prev) => {
      const updatedSubQuestions = prev.subQuestions.filter((_, i) => i !== index);
      console.log('Updated subQuestions:', updatedSubQuestions);
      return { ...prev, subQuestions: updatedSubQuestions };
    });
  };

  const handleSubQuestionChange = (index, field, value) => {
    const updated = [...formData.subQuestions];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, subQuestions: updated }));
    validateSubQuestion(index, field, value);
  };

  const addSubOption = (subIndex) => {
    const updated = [...formData.subQuestions];
    updated[subIndex].subOptions.push({ optionText: '', isCorrect: false });
    setFormData((prev) => ({ ...prev, subQuestions: updated }));
  };

  const removeSubOption = (subIndex, optionIndex) => {
    const updated = [...formData.subQuestions];
    if (updated[subIndex].subOptions.length > 1) {
      updated[subIndex].subOptions = updated[subIndex].subOptions.filter((_, i) => i !== optionIndex);
    }
    setFormData((prev) => ({ ...prev, subQuestions: updated }));
  };

  const handleSubOptionChange = (subIndex, optionIndex, e) => {
    const { name, value } = e.target;
    const updated = [...formData.subQuestions];
    updated[subIndex].subOptions[optionIndex][name] = value;
    setFormData((prev) => ({ ...prev, subQuestions: updated }));
    validateSubOption(subIndex, optionIndex, name, value);
  };

  const markCorrectSubOption = (subIndex, optionIndex) => {
    const updated = [...formData.subQuestions];
    updated[subIndex].subOptions = updated[subIndex].subOptions.map((opt, i) => ({
      ...opt,
      isCorrect: i === optionIndex,
    }));
    setFormData((prev) => ({ ...prev, subQuestions: updated }));
    
    setTimeout(() => {
      const subOptionsElements = document.querySelectorAll(`.sub-question-${subIndex} .option-item`);
      subOptionsElements.forEach((el) => {
        el.classList.remove('correct-option');
      });
      
      const selectedOption = document.querySelector(`.option-item-${subIndex}-${optionIndex}`);
      if (selectedOption) {
        selectedOption.classList.add('correct-option');
      }
    }, 10);
  };

  const handlePreview = () => {
    const validation = validateForm();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      alert('Please fix the validation errors before previewing.');
    } else {
      window.scrollPreviewPosition = window.scrollY;
      setPreviewVisible(true);
    }
  };

  const closePreview = () => {
    setPreviewVisible(false);
    setTimeout(() => {
      if (window.scrollPreviewPosition !== undefined) {
        window.scrollTo(0, window.scrollPreviewPosition);
        window.scrollPreviewPosition = undefined;
      }
    }, 10);
  };

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'subject':
        if (!value || value === '') error = 'Subject is required';
        break;
      case 'paperType':
        if (!value || value === '') error = 'Paper Type is required';
        break;
      case 'year':
        if (!value || value === '') error = 'Year is required';
        break;
      case 'month':
        if (!value || value === '') error = 'Month is required';
        break;
      case 'examStage':
        if (!value || value === '' || value === 'Select Exam Stage') error = 'Exam Stage is required';
        break;
      case 'paperNo':
        if (formData.examStage === 'Foundation' && (!value || value === '' || value === 'Select Paper')) {
          error = 'Paper No. is required for Foundation stage';
        }
        break;
      case 'questionNumber':
        if (!value) error = 'Question Number is required';
        break;
      case 'questionText':
        // Question text is now optional
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateSubQuestion = (index, field, value) => {
    let error = field === 'subQuestionText' && !value.trim() ? `Sub-question ${index + 1} text is required` : '';
    setErrors((prev) => ({ ...prev, [`subQuestion_${index}`]: error }));
  };

  const validateSubOption = (subIndex, optionIndex, name, value) => {
    let error = name === 'optionText' && !value.trim() ? `Sub-question ${subIndex + 1}, Option ${optionIndex + 1} text is required` : '';
    setErrors((prev) => ({ ...prev, [`subOption_${subIndex}_${optionIndex}`]: error }));
  };

  const validateForm = () => {
    let tempErrors = {};
    
    // Core field validation for all question types
    if (!formData.subject || formData.subject === '') tempErrors.subject = 'Subject is required';
    if (!formData.paperType || formData.paperType === '') tempErrors.paperType = 'Paper Type is required';
    if (!formData.year || formData.year === '') tempErrors.year = 'Year is required';
    if (!formData.month || formData.month === '') tempErrors.month = 'Month is required';
    if (!formData.examStage || formData.examStage === '' || formData.examStage === 'Select Exam Stage') {
      tempErrors.examStage = 'Exam Stage is required';
    }
    if (formData.examStage === 'Foundation' && (!formData.paperNo || formData.paperNo === '' || formData.paperNo === 'Select Paper')) {
      tempErrors.paperNo = 'Paper No. is required for Foundation stage';
    }
    if (!formData.questionNumber) tempErrors.questionNumber = 'Question Number is required';
    
    // Question type-specific validation
    switch (questionType) {
      case 'objective-subjective':
        // Both subjective and objective elements, flexible validation
        break;
        
      case 'subjective-only':
        // Must have answer text for subjective-only
        if (!formData.answerText || formData.answerText.trim() === '') {
          tempErrors.answerText = 'Answer text is required for subjective questions';
        }
        break;
        
      case 'objective-only':
        // Must have at least one sub-question with options for objective-only
        if (formData.subQuestions.length === 0) {
          tempErrors.subQuestions = 'At least one question with options is required';
        } else {
          // Validate first sub-question has content and options
          const firstSubQ = formData.subQuestions[0];
          if (!firstSubQ.subOptions || firstSubQ.subOptions.length < 2) {
            tempErrors[`subQuestion_0`] = 'At least 2 options are required';
          } else {
            // Check if any option is marked as correct
            const hasCorrectOption = firstSubQ.subOptions.some(opt => opt.isCorrect);
            if (!hasCorrectOption) {
              tempErrors[`subQuestion_0`] = 'One option must be marked as correct';
            }
            
            // Check if all options have text
            firstSubQ.subOptions.forEach((opt, optIndex) => {
              if (!opt.optionText || opt.optionText.trim() === '') {
                tempErrors[`subOption_0_${optIndex}`] = `Option ${optIndex + 1} text is required`;
              }
            });
          }
        }
        break;
        
      default:
        break;
    }
    
    // Set errors state
    setErrors(tempErrors);
    return tempErrors;
  };

  const cleanSubQuestions = (subQuestions) => {
    return subQuestions.map((subQ, index) => ({
      subQuestionText: subQ.subQuestionText || '',
      subOptions: subQ.subOptions.map((opt) => ({
        optionText: opt.optionText || '',
        isCorrect: !!opt.isCorrect,
      })),
    }));
  };

  // Add useEffect to load cached form selections on component mount
  useEffect(() => {
    const cachedSelections = localStorage.getItem('adminFormSelections');
    if (cachedSelections) {
      try {
        const parsedSelections = JSON.parse(cachedSelections);
        setFormData(prevData => ({
          ...prevData,
          subject: parsedSelections.subject || '',
          paperType: parsedSelections.paperType || '',
          year: parsedSelections.year || '',
          month: parsedSelections.month || '',
          examStage: parsedSelections.examStage || '',
          paperNo: parsedSelections.paperNo || '',
        }));
      } catch (e) {
        console.error('Error parsing cached form selections:', e);
      }
    }
  }, []);

  // Add function to cache current selections
  const cacheFormSelections = () => {
    const selectionsToCache = {
      subject: formData.subject,
      paperType: formData.paperType,
      year: formData.year,
      month: formData.month,
      examStage: formData.examStage,
      paperNo: formData.paperNo,
    };
    localStorage.setItem('adminFormSelections', JSON.stringify(selectionsToCache));
  };

  // Modify resetForm to preserve cached selections
  const resetForm = () => {
    // Reset form data
    setFormData({
      subject: '',
      paperType: '',
      year: '',
      month: '',
      examStage: '',
      paperNo: '',
      questionNumber: '',
      questionText: '',
      answerText: '',
      subQuestions: [],
    });
    setErrors({});
    setQuestionType('objective-subjective'); // Reset question type
    
    // Try to load cached selections
    const cachedSelections = localStorage.getItem('adminFormSelections');
    if (cachedSelections) {
      try {
        const { subject, paperType, year, month, examStage, paperNo } = JSON.parse(cachedSelections);
        setFormData(prev => ({
          ...prev,
          subject: subject || '',
          paperType: paperType || '',
          year: year || '',
          month: month || '',
          examStage: examStage || '',
          paperNo: paperNo || '',
        }));
      } catch (error) {
        console.error('Error loading cached form selections:', error);
      }
    }
  };

  // Add function to clear cached selections
  const clearCachedSelections = () => {
    localStorage.removeItem('adminFormSelections');
    setFormData({
      subject: '',
      paperType: '',
      year: '',
      month: '',
      examStage: '',
      paperNo: '',
      questionNumber: '',
      questionText: '',
      answerText: '',
      subQuestions: [],
    });
    setErrors({});
    alert('Form cache cleared');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate the form
    const validation = validateForm();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      
      const errorMessages = Object.values(validation).filter(v => v);
      if (errorMessages.length > 0) {
        alert(`Please fix the following errors:\n- ${errorMessages.join('\n- ')}`);
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }
      
      // Prepare question data based on question type
      let questionData = { ...formData };
      
      // For subjective-only, ensure subQuestions is empty
      if (questionType === 'subjective-only') {
        questionData.subQuestions = [];
      }
      
      // For objective-only, ensure answer text is empty if not needed
      if (questionType === 'objective-only') {
        questionData.answerText = '';
      }
      
      // Clean and prepare data
      const cleanedSubQuestions = cleanSubQuestions(questionData.subQuestions);
      questionData.subQuestions = cleanedSubQuestions;
      
      const response = await fetch('https://caprep.onrender.com/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(questionData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setLastSubmittedId(data._id || data.id);
        alert('Question saved successfully!');
        
        // Cache selections for convenience
        cacheFormSelections();
        
        // Reset form but keep common fields like exam stage, subject
        const { examStage, subject, paperType, year, month, paperNo } = formData;
        resetForm();
        setFormData(prev => ({
          ...prev,
          examStage, 
          subject, 
          paperType, 
          year, 
          month, 
          paperNo
        }));
        
        // Refresh the questions list
        fetchQuestions(token);
      } else {
        throw new Error(data.error || 'Failed to save question');
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!editingQuestionId) {
      alert('No question selected for editing.');
      return;
    }
    
    // Validate form before submission
    const validation = validateForm();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      
      const errorMessages = Object.values(validation).filter(v => v);
      if (errorMessages.length > 0) {
        alert(`Please fix the following errors:\n- ${errorMessages.join('\n- ')}`);
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }
      
      // Prepare question data based on question type
      let questionData = { ...formData };
      
      // For subjective-only, ensure subQuestions is empty
      if (questionType === 'subjective-only') {
        questionData.subQuestions = [];
      }
      
      // For objective-only, ensure answer text is empty if not needed
      if (questionType === 'objective-only') {
        questionData.answerText = '';
      }
      
      // Clean and prepare data
      const cleanedSubQuestions = cleanSubQuestions(questionData.subQuestions);
      questionData.subQuestions = cleanedSubQuestions;
      
      const response = await fetch(`https://caprep.onrender.com/api/questions/${editingQuestionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(questionData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Question updated successfully!');
        
        // Cache selections for convenience
        cacheFormSelections();
        
        // Reset form and exit edit mode
        resetForm();
        setEditingQuestionId(null);
        
        // Refresh the questions list
        fetchQuestions(token);
      } else {
        throw new Error(data.error || 'Failed to update question');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestionId(question._id);
    
    // Determine question type based on content
    let detectedQuestionType = 'objective-subjective'; // Default
    
    if (question.answerText && (!question.subQuestions || question.subQuestions.length === 0)) {
      // If it has answer text but no sub-questions, it's subjective-only
      detectedQuestionType = 'subjective-only';
    } else if ((!question.answerText || question.answerText.trim() === '') && 
               question.subQuestions && question.subQuestions.length > 0) {
      // If it has sub-questions but no answer text, it's objective-only
      detectedQuestionType = 'objective-only';
    }
    
    setQuestionType(detectedQuestionType);
    
    // Ensure subQuestions is always an array
    const subQuestions = question.subQuestions || [];
    
    // Map subQuestions to ensure each has subOptions as an array
    const formattedSubQuestions = subQuestions.map(sq => ({
      ...sq,
      subOptions: sq.subOptions || []
    }));
    
    // Set form data (exclude pageNumber)
    setFormData({
      subject: question.subject || '',
      paperType: question.paperType || '',
      year: question.year || '',
      month: question.month || '',
      examStage: question.examStage || '',
      paperNo: question.paperNo || '',
      questionNumber: question.questionNumber || '',
      questionText: question.questionText || '',
      answerText: question.answerText || '',
      subQuestions: formattedSubQuestions,
    });
    
    // Scroll to the top of the form
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    console.log('Attempting to delete question with ID:', id);
    
    if (!id) {
      alert('Cannot delete: Invalid question ID');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`https://caprep.onrender.com/api/questions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      const result = await response.json();
      console.log('Delete response:', response.status, result);
      
      if (response.ok) {
        alert('Question deleted successfully');
        const currentQuery = new URLSearchParams(filters).toString();
        fetchQuestions(token, currentQuery);
      } else {
        const errorMessage = result.details || result.error || 'Unknown error';
        console.error('Failed to delete question:', errorMessage);
        alert(`Failed to delete question: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(`Error deleting question: ${error.message || 'Unknown error'}`);
    }
  };

  const visibleErrors = Object.values(errors).filter((error) => error);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'analytics':
        return <AdminAnalytics />;
      case 'resources':
        return <ResourceUploader />;
      case 'questions':
      default:
        return (
          <>
            {visibleErrors.length > 0 && (
              <div className="error">
                <h3 className="error-title">Validation Errors:</h3>
                <ul className="error-list">
                  {visibleErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {previewVisible && (
              <PreviewPanel
                data={formData}
                onClose={closePreview}
                questionType={questionType}
              />
            )}
            
            <div className="form-mode-indicator">
              <h2>{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h2>
              {editingQuestionId && (
                <p className="edit-mode-note">You are currently editing question ID: {editingQuestionId}</p>
              )}
              <button 
                type="button" 
                onClick={clearCachedSelections} 
                className="clear-cache-btn"
                title="Clear cached form selections and start fresh"
              >
                Clear Form Cache
              </button>
            </div>
            <form 
              onSubmit={editingQuestionId ? handleUpdate : handleSubmit} 
              className={`admin-form ${editingQuestionId ? 'edit-mode' : ''}`}
            >
              <div className="form-section">
                <h2>General Details</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Exam Stage:</label>
                    <select
                      name="examStage"
                      value={formData.examStage}
                      onChange={(e) => {
                        const newExamStage = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          examStage: newExamStage,
                          subject: '',
                          paperNo: ''
                        }));
                        validateField('examStage', newExamStage);
                      }}
                      className="form-input"
                      required
                    >
                      <option value="">Select Exam Stage</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Final">Final</option>
                    </select>
                    {errors.examStage && <p className="error-message">{errors.examStage}</p>}
                  </div>
                  <div className="form-group">
                    <label>Subject:</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="form-input"
                      required
                    >
                      <option value="">Select Subject</option>
                      {formData.examStage === 'Foundation' ? (
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
                      ) : formData.examStage === 'Intermediate' ? (
                        <>
                          <option value="Advanced Accounting">Advanced Accounting</option>
                          <option value="Corporate Laws">Corporate Laws</option>
                          <option value="Cost and Management Accounting">Cost and Management Accounting</option>
                          <option value="Taxation">Taxation</option>
                          <option value="Auditing and Code of Ethics">Auditing and Code of Ethics</option>
                          <option value="Financial and Strategic Management">Financial and Strategic Management</option>
                        </>
                      ) : formData.examStage === 'Final' ? (
                        <>
                          <option value="Financial Reporting">Financial Reporting</option>
                          <option value="Advanced Financial Management">Advanced Financial Management</option>
                          <option value="Advanced Auditing">Advanced Auditing</option>
                          <option value="Direct and International Tax Laws">Direct and International Tax Laws</option>
                          <option value="Indirect Tax Laws">Indirect Tax Laws</option>
                          <option value="Integrated Business Solutions">Integrated Business Solutions</option>
                        </>
                      ) : (
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
                    {errors.subject && <p className="error-message">{errors.subject}</p>}
                  </div>
                  <div className="form-group">
                    <label>Paper Type:</label>
                    <select
                      name="paperType"
                      value={formData.paperType}
                      onChange={handleChange}
                      className="form-input"
                      required
                    >
                      <option value="">Select Paper Type</option>
                      <option value="MTP">MTP</option>
                      <option value="RTP">RTP</option>
                      <option value="PYQS">PYQS</option>
                    </select>
                    {errors.paperType && <p className="error-message">{errors.paperType}</p>}
                  </div>
                  <div className="form-group">
                    <label>Year:</label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className="form-input"
                      required
                    >
                      <option value="">Select Year</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                    </select>
                    {errors.year && <p className="error-message">{errors.year}</p>}
                  </div>
                  <div className="form-group">
                    <label>Month:</label>
                    <select
                      name="month"
                      value={formData.month}
                      onChange={handleChange}
                      className="form-input"
                      required
                    >
                      <option value="">Select Month</option>
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
                    {errors.month && <p className="error-message">{errors.month}</p>}
                  </div>
                  {formData.examStage === 'Foundation' && (
                    <div className="form-group">
                      <label>Paper No.:</label>
                      <select
                        name="paperNo"
                        value={formData.paperNo}
                        onChange={handleChange}
                        className="form-input"
                        required
                      >
                        <option value="">Select Paper</option>
                        <option value="Paper 1">Paper 1</option>
                        <option value="Paper 2">Paper 2</option>
                        <option value="Paper 3">Paper 3</option>
                        <option value="Paper 4">Paper 4</option>
                      </select>
                      {errors.paperNo && <p className="error-message">{errors.paperNo}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <h2>Question Type</h2>
                <div className="question-type-selector">
                  <div 
                    className={`question-type-option ${questionType === 'objective-subjective' ? 'active' : ''}`}
                    onClick={() => setQuestionType('objective-subjective')}
                  >
                    <h3>Question + Answer + Options</h3>
                    <p>For questions with both objective and subjective components</p>
                  </div>
                  
                  <div 
                    className={`question-type-option ${questionType === 'subjective-only' ? 'active' : ''}`}
                    onClick={() => setQuestionType('subjective-only')}
                  >
                    <h3>Question + Answer Only</h3>
                    <p>For subjective questions without options</p>
                  </div>
                  
                  <div 
                    className={`question-type-option ${questionType === 'objective-only' ? 'active' : ''}`}
                    onClick={() => setQuestionType('objective-only')}
                  >
                    <h3>MCQs Only</h3>
                    <p>For objective multiple-choice questions</p>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h2>Question Details</h2>
                <div className="form-group">
                  <label>Question Number:</label>
                  <input
                    type="text"
                    name="questionNumber"
                    value={formData.questionNumber}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                  {errors.questionNumber && <p className="error-message">{errors.questionNumber}</p>}
                </div>
                <div className="form-group">
                  <label>Question Text:</label>
                  <textarea
                    name="questionText"
                    value={formData.questionText}
                    onChange={handleChange}
                    rows={6}
                    className="form-input"
                    placeholder="Paste HTML code for tables, or just type your question..."
                  />
                  {errors.questionText && <p className="error-message">{errors.questionText}</p>}
                </div>
              </div>

              {/* Conditionally show Answer section based on question type */}
              {(questionType === 'objective-subjective' || questionType === 'subjective-only') && (
                <div className="form-section">
                  <h2>Answer (for Subjective Questions)</h2>
                  <div className="form-group">
                    <label>Answer Text:</label>
                    <textarea
                      name="answerText"
                      value={formData.answerText}
                      onChange={handleChange}
                      rows={6}
                      className="form-input"
                      placeholder="Paste HTML code for tables, or just type your answer..."
                      required={questionType === 'subjective-only'}
                    />
                  </div>
                </div>
              )}

              {/* Conditionally show Sub-Questions section based on question type */}
              {(questionType === 'objective-subjective' || questionType === 'objective-only') && (
                <div className="form-section">
                  <h2>{questionType === 'objective-only' ? 'Options' : 'Sub-Questions with Options'}</h2>
                  {formData.subQuestions.map((subQ, subIndex) => (
                    <div key={subIndex} className={`sub-question-section sub-question-${subIndex}`}>
                      <div className="form-group">
                        <label>{questionType === 'objective-only' ? 'Question' : `Sub Question ${subIndex + 1}`}:</label>
                        <textarea
                          name="subQuestionText"
                          value={subQ.subQuestionText}
                          onChange={(e) => handleSubQuestionChange(subIndex, e.target.name, e.target.value)}
                          className="form-input"
                          rows={questionType === 'objective-only' ? 1 : 6}
                          placeholder={questionType === 'objective-only' ? 
                            "Enter question text (if different from main question)" : 
                            "Paste HTML code for tables, or just type your sub-question..."}
                          required={questionType === 'objective-only' && subIndex === 0}
                        />
                        {errors[`subQuestion_${subIndex}`] && <p className="error-message">{errors[`subQuestion_${subIndex}`]}</p>}
                      </div>
                      <div className="sub-options-section">
                        {subQ.subOptions.map((subOpt, optIndex) => (
                          <div 
                            key={optIndex} 
                            className={`form-group option-item option-item-${subIndex}-${optIndex} ${subOpt.isCorrect ? 'correct-option' : ''}`}
                          >
                            <label>Option {optIndex + 1}:</label>
                            <input
                              type="text"
                              name="optionText"
                              value={subOpt.optionText}
                              onChange={(e) => handleSubOptionChange(subIndex, optIndex, e)}
                              className="form-input"
                              required={questionType === 'objective-only' && subIndex === 0}
                            />
                            <div className="option-actions">
                              <button
                                type="button"
                                onClick={() => markCorrectSubOption(subIndex, optIndex)}
                                className="mark-correct-btn"
                              >
                                Mark as Correct
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSubOption(subIndex, optIndex)}
                                className="remove-btn"
                              >
                                Remove Option
                              </button>
                            </div>
                            {errors[`subOption_${subIndex}_${optIndex}`] && <p className="error-message">{errors[`subOption_${subIndex}_${optIndex}`]}</p>}
                          </div>
                        ))}
                        <button type="button" onClick={() => addSubOption(subIndex)} className="add-btn">
                          Add Option
                        </button>
                      </div>
                      <div className="sub-question-actions">
                        <button type="button" onClick={() => removeSubQuestion(subIndex)} className="remove-btn">
                          Remove {questionType === 'objective-only' ? 'This Question' : 'This Sub Question'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addSubQuestion} className="add-btn">
                    {questionType === 'objective-only' ? 'Add Another Question' : 'Add Sub Question'}
                  </button>
                </div>
              )}

              <div className="form-actions-container">
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="preview-btn"
                    disabled={isSubmitting}
                  >
                    Preview
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : editingQuestionId ? 'Update' : 'Submit'}
                  </button>
                  {editingQuestionId && (
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setEditingQuestionId(null);
                      }}
                      className="cancel-btn"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="filter-section">
              <h2>Filter Questions</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Exam Stage:</label>
                  <select
                    name="examStage"
                    value={filters.examStage}
                    onChange={handleFilterChange}
                    className="form-input"
                  >
                    <option value="">All</option>
                    <option value="Foundation">Foundation</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Final">Final</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject:</label>
                  <select
                    name="subject"
                    value={filters.subject}
                    onChange={handleFilterChange}
                    className="form-input"
                  >
                    <option value="">All Subjects</option>
                    {filters.examStage === 'Foundation' ? (
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
                      <>
                        <option value="Advanced Accounting">Advanced Accounting</option>
                        <option value="Corporate Laws">Corporate Laws</option>
                        <option value="Cost and Management Accounting">Cost and Management Accounting</option>
                        <option value="Taxation">Taxation</option>
                        <option value="Auditing and Code of Ethics">Auditing and Code of Ethics</option>
                        <option value="Financial and Strategic Management">Financial and Strategic Management</option>
                      </>
                    ) : filters.examStage === 'Final' ? (
                      <>
                        <option value="Financial Reporting">Financial Reporting</option>
                        <option value="Advanced Financial Management">Advanced Financial Management</option>
                        <option value="Advanced Auditing">Advanced Auditing</option>
                        <option value="Direct and International Tax Laws">Direct and International Tax Laws</option>
                        <option value="Indirect Tax Laws">Indirect Tax Laws</option>
                        <option value="Integrated Business Solutions">Integrated Business Solutions</option>
                      </>
                    ) : (
                      <option value="">Select an Exam Stage first</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Paper Type:</label>
                  <select
                    name="paperType"
                    value={filters.paperType}
                    onChange={handleFilterChange}
                    className="form-input"
                  >
                    <option value="">All</option>
                    <option value="MTP">MTP</option>
                    <option value="RTP">RTP</option>
                    <option value="PYQS">PYQS</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Year:</label>
                  <select
                    name="year"
                    value={filters.year}
                    onChange={handleFilterChange}
                    className="form-input"
                  >
                    <option value="">All Years</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Month:</label>
                  <select
                    name="month"
                    value={filters.month}
                    onChange={handleFilterChange}
                    className="form-input"
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
                  <div className="form-group">
                    <label>Paper No.:</label>
                    <select
                      name="paperNo"
                      value={filters.paperNo}
                      onChange={handleFilterChange}
                      className="form-input"
                    >
                      <option value="">All</option>
                      <option value="Paper 1">Paper 1</option>
                      <option value="Paper 2">Paper 2</option>
                      <option value="Paper 3">Paper 3</option>
                      <option value="Paper 4">Paper 4</option>
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Question Number:</label>
                  <input
                    type="text"
                    name="questionNumber"
                    value={filters.questionNumber}
                    onChange={handleFilterChange}
                    className="form-input"
                    placeholder="e.g. 1, 2a, etc."
                  />
                </div>
                <div className="form-group">
                  <label>Search Keyword:</label>
                  <input
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="form-input"
                    placeholder="Enter keywords"
                  />
                </div>
              </div>
              <button onClick={() => applyFilters(localStorage.getItem('token'))} className="apply-filter-btn">
                Apply Filters
              </button>
            </div>

            <div className="stored-questions-section">
              <h2>Stored Questions</h2>
              {storedQuestions.length === 0 ? (
                <p className="no-questions">No questions stored yet.</p>
              ) : (
                <div className="questions-list">
                  {storedQuestions.map((question) => (
                    <div key={question._id} className="question-card">
                      <p><strong>Subject:</strong> {question.subject || 'N/A'}</p>
                      <p><strong>Paper Type:</strong> {question.paperType || 'N/A'}</p>
                      <p><strong>Year:</strong> {question.year || 'N/A'}</p>
                      <p><strong>Month:</strong> {question.month || 'N/A'}</p>
                      <p><strong>Exam Stage:</strong> {question.examStage || 'N/A'}</p>
                      {question.paperNo && <p><strong>Paper No.:</strong> {question.paperNo || 'N/A'}</p>}
                      <p><strong>Question Number:</strong> {question.questionNumber || 'N/A'}</p>
                      <h3>Question Text:</h3>
                      <div
                        className="question-text"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.questionText || 'N/A') }}
                      />
                      {question.answerText && (
                        <>
                          <h3>Answer Text:</h3>
                          <div
                            className="question-text"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(question.answerText || 'N/A') }}
                          />
                        </>
                      )}
                      {question.subQuestions && question.subQuestions.length > 0 && (
                        <div>
                          <h3>Sub-Questions:</h3>
                          {question.subQuestions.map((subQ, subIdx) => (
                            <div key={subIdx} className="sub-question">
                              <p><strong>Sub Question Number:</strong> {subQ.subQuestionNumber || 'N/A'}</p>
                              <p><strong>Sub Question Text:</strong> {subQ.subQuestionText || 'N/A'}</p>
                              {subQ.subOptions && subQ.subOptions.length > 0 && (
                                <ul className="sub-options">
                                  {subQ.subOptions.map((subOpt, optIdx) => (
                                    <li key={optIdx}>
                                      {subOpt.optionText || 'N/A'}{' '}
                                      {subOpt.isCorrect && <span className="correct-answer">(Correct)</span>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="question-actions">
                        <button
                          onClick={() => handleEdit(question)}
                          className="edit-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(question._id)}
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <section className="admin-section">
        <div className="admin-container">
          <h1>Admin Panel</h1>
          
          <div className="admin-navigation">
            <Link 
              to="/admin" 
              className={`admin-nav-link ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')} 
            >
              Manage Questions
            </Link>
            <Link 
              to="/admin/resources" 
              className={`admin-nav-link ${activeTab === 'resources' ? 'active' : ''}`}
              onClick={() => setActiveTab('resources')} 
            >
              Manage PDF Resources
            </Link>
            <Link 
              to="/admin/analytics" 
              className={`admin-nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')} 
            >
              View Analytics
            </Link>
          </div>
          
          {renderActiveTab()}
          
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;
