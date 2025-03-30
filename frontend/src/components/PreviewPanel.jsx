import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import './PreviewPanel.css'; // Import CSS for styling

const PreviewPanel = ({ data, onClose }) => {
  // Create a ref for the modal dialog
  const modalRef = useRef(null);
  
  // Handle keyboard events (Escape key to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Focus the modal when it opens for accessibility
    if (modalRef.current) {
      modalRef.current.focus();
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Log the data to debug
  console.log('Preview Data:', data);

  if (!data) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="preview-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal Content */}
      <div 
        className="preview-modal"
        ref={modalRef}
        tabIndex="-1"
        role="dialog"
        aria-labelledby="preview-title"
        aria-modal="true"
      >
        <h2 className="preview-title" id="preview-title">Question Preview</h2>
        <div className="preview-content">
          <div className="preview-info-grid">
            <p><strong>Subject:</strong> {data.subject || 'N/A'}</p>
            <p><strong>Exam Stage:</strong> {data.examStage || 'N/A'}</p>
            <p><strong>Paper Type:</strong> {data.paperType || 'N/A'}</p>
            <p><strong>Year:</strong> {data.year || 'N/A'}</p>
            <p><strong>Month:</strong> {data.month || 'N/A'}</p>
            <p><strong>Paper No.:</strong> {data.paperNo || 'N/A'}</p>
            <p><strong>Question Number:</strong> {data.questionNumber || 'N/A'}</p>
            {data.pageNumber && <p><strong>Page Number:</strong> {data.pageNumber}</p>}
          </div>

          <h3 className="preview-subtitle">Question Text:</h3>
          <div
            className="preview-text"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(
                data.questionText ? 
                  data.questionText.replace(/\n/g, '<br>') : 
                  'N/A'
              ) 
            }}
          />

          {data.answerText && (
            <>
              <h3 className="preview-subtitle">Answer Text:</h3>
              <div
                className="preview-text"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(
                    data.answerText ? 
                      data.answerText.replace(/\n/g, '<br>') : 
                      'N/A'
                  ) 
                }}
              />
            </>
          )}

          {data.subQuestions && data.subQuestions.length > 0 && (
            <div className="preview-subquestions-container">
              <h3 className="preview-subtitle">Sub-Questions:</h3>
              {data.subQuestions.map((subQ, subIdx) => (
                <div
                  key={subIdx}
                  className="preview-subquestion"
                >
                  <p><strong>Sub Question Number:</strong> {subQ.subQuestionNumber || 'N/A'}</p>
                  <p><strong>Sub Question Text:</strong> {subQ.subQuestionText || 'N/A'}</p>
                  {subQ.subOptions && subQ.subOptions.length > 0 && (
                    <div className="preview-options-container">
                      <h4 className="preview-subheading">Sub MCQ Options:</h4>
                      <ul className="preview-options">
                        {subQ.subOptions.map((subOpt, optIdx) => (
                          <li key={optIdx}>
                            {subOpt.optionText || 'N/A'}{' '}
                            {subOpt.isCorrect && <span className="preview-correct">Correct</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Preview content ends here */}
        </div>

        <button
          onClick={onClose}
          className="preview-close-btn"
          aria-label="Close preview"
        >
          Close Preview
        </button>
      </div>
    </>
  );
};

export default PreviewPanel;