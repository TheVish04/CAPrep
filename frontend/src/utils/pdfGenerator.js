import html2pdf from 'html2pdf.js';
import DOMPurify from 'dompurify';

const STYLES = `
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 210mm;
      margin: 0;
      padding: 20px;
    }
    
    .pdf-header {
      background: #03a9f4;
      color: white;
      padding: 15px;
      text-align: center;
      margin-bottom: 20px;
    }
    
    .filter-info {
      background: #f5f5f5;
      padding: 10px;
      margin-bottom: 20px;
      font-size: 12px;
    }
    
    .question-card {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      margin-bottom: 20px;
      padding: 15px;
      page-break-inside: avoid;
    }
    
    .question-header {
      background: #03a9f4;
      color: white;
      padding: 10px;
      margin: -15px -15px 15px -15px;
      border-radius: 4px 4px 0 0;
    }
    
    .question-content {
      margin-bottom: 15px;
    }
    
    .case-scenario {
      background: #e3f2fd;
      padding: 10px;
      margin: 10px 0;
      border-left: 4px solid #03a9f4;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    th {
      background-color: #f5f5f5;
    }
    
    .sub-questions {
      margin-left: 20px;
    }
    
    .options {
      margin-left: 20px;
    }
    
    .option {
      margin: 5px 0;
      padding: 5px;
    }
    
    .correct-option {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
    }
    
    .page-number {
      text-align: center;
      font-size: 12px;
      margin-top: 20px;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
  </style>
`;

export const generateQuestionsPDF = async (questions, filters, includeAnswers, individualAnswers) => {
  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        ${STYLES}
      </head>
      <body>
        <div class="pdf-header">
          <h1>CA Exam Preparation</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="filter-info">
          ${Object.entries(filters)
            .filter(([_, value]) => value)
            .map(([key, value]) => `<div>${key}: ${value}</div>`)
            .join('')}
        </div>
        
        ${questions.map((question, index) => `
          <div class="question-card">
            <div class="question-header">
              <h2>Question ${index + 1} - ${question.subject || ''} ${question.month || ''} ${question.year || ''}</h2>
              ${question.paperType ? `<div>Paper Type: ${question.paperType}</div>` : ''}
              ${question.paperNo ? `<div>Paper No: ${question.paperNo}</div>` : ''}
            </div>
            
            <div class="question-content">
              ${DOMPurify.sanitize(question.questionText || '')}
            </div>
            
            ${question.subQuestions?.map((subQ, subIndex) => `
              <div class="sub-questions">
                <h3>Sub-Question ${subQ.subQuestionNumber || (subIndex + 1)}</h3>
                ${subQ.subQuestionText ? 
                  `<div>${DOMPurify.sanitize(subQ.subQuestionText)}</div>` : ''}
                
                ${subQ.subOptions?.length ? `
                  <div class="options">
                    ${subQ.subOptions.map((opt, optIndex) => {
                      const isCorrect = opt.isCorrect && (includeAnswers || individualAnswers[question._id]);
                      return `
                        <div class="option ${isCorrect ? 'correct-option' : ''}">
                          ${String.fromCharCode(65 + optIndex)}. 
                          ${DOMPurify.sanitize(opt.optionText || '')}
                          ${isCorrect ? ' ✓' : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('') || ''}
          </div>
        `).join('')}
      </body>
    </html>
  `;

  // PDF generation options
  const options = {
    margin: [10, 10],
    filename: `ca-questions-${new Date().toISOString().slice(0, 10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: false
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait'
    },
    pagebreak: { mode: 'avoid-all' }
  };

  // Create temporary container
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Generate PDF
    const pdf = await html2pdf().set(options).from(container).save();
    return pdf;
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
};

export const savePDF = async (questions, filters, includeAnswers, individualAnswers) => {
  await generateQuestionsPDF(questions, filters, includeAnswers, individualAnswers);
};
