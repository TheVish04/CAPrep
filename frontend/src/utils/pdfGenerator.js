import jsPDF from 'jspdf';
import DOMPurify from 'dompurify';

/**
 * Generates a PDF from filtered questions
 * @param {Array} questions - The filtered questions to include in the PDF
 * @param {Object} filters - The current filter settings
 * @param {Boolean} includeAnswers - Whether to include answers in the PDF
 * @param {Object} individualAnswers - Object tracking which individual questions show answers
 * @returns {jsPDF} - The generated PDF document
 */
export const generateQuestionsPDF = (questions, filters, includeAnswers, individualAnswers) => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Set initial position
  let y = 20;
  
  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CA Exam Questions', 105, y, { align: 'center' });
  y += 15;
  
  // Add date of generation
  const today = new Date();
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on: ${today.toLocaleDateString()}`, 20, y);
  y += 15;
  
  // Process each question
  questions.forEach((question, index) => {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    // Question number
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, 20, y);
    y += 8;
    
    // Question text
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Question text label
    doc.setFont('helvetica', 'bold');
    doc.text('Question:', 20, y);
    y += 7;
    
    doc.setFont('helvetica', 'normal');
    
    // Handle question text - preserve some basic formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(question.questionText);
    
    // Process case scenario and text with improved formatting
    const processedText = processHtmlContent(tempDiv);
    
    // Split lines and add to PDF with improved formatting
    y = addFormattedTextToPdf(doc, processedText, 20, y, 170);
    y += 5; // Add extra space after question text
    
    // Add sub-questions if they exist
    if (question.subQuestions && question.subQuestions.length > 0) {
      // Check if we need a new page for sub-questions
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Sub-Questions:', 20, y);
      y += 10;
      
      // Process each sub-question
      question.subQuestions.forEach((subQ, subIndex) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${subIndex + 1}. ${subQ.subQuestionNumber ? `Sub-Question ${subQ.subQuestionNumber}:` : ''}`, 20, y);
        y += 7;
        
        doc.setFont('helvetica', 'normal');
        
        if (subQ.subQuestionText) {
          const subQTempDiv = document.createElement('div');
          subQTempDiv.innerHTML = DOMPurify.sanitize(subQ.subQuestionText);
          const processedSubText = processHtmlContent(subQTempDiv);
          y = addFormattedTextToPdf(doc, processedSubText, 20, y, 170);
          y += 5;
        }
        
        // Process options for this sub-question
        if (subQ.subOptions && subQ.subOptions.length > 0) {
          subQ.subOptions.forEach((opt, optIndex) => {
            // Check if we need a new page for options
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            
            const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, etc.
            const optionTextDiv = document.createElement('div');
            optionTextDiv.innerHTML = DOMPurify.sanitize(opt.optionText || '');
            const optionText = optionTextDiv.textContent || optionTextDiv.innerText || '';
            
            // Format with correct answer indicator
            if (opt.isCorrect && (includeAnswers || individualAnswers[question._id])) {
              doc.setFont('helvetica', 'bold');
              const optionLine = `${optionLetter}. ${optionText} (Correct)`;
              const splitOptText = doc.splitTextToSize(optionLine, 160);
              doc.text(splitOptText, 25, y);
              y += splitOptText.length * 7;
            } else {
              doc.setFont('helvetica', 'normal');
              const optionLine = `${optionLetter}. ${optionText}`;
              const splitOptText = doc.splitTextToSize(optionLine, 160);
              doc.text(splitOptText, 25, y);
              y += splitOptText.length * 7;
            }
          });
          y += 5; // Add space after options
        }
      });
      y += 5; // Add space after all sub-questions
    }
    
    // Add answer if needed
    if ((includeAnswers || individualAnswers[question._id]) && question.answerText) {
      // Check if we need a new page for the answer
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Answer:', 20, y);
      y += 7;
      
      doc.setFont('helvetica', 'normal');
      
      // Handle answer text with improved formatting
      const answerTempDiv = document.createElement('div');
      answerTempDiv.innerHTML = DOMPurify.sanitize(question.answerText);
      const processedAnswerText = processHtmlContent(answerTempDiv);
      
      // Add formatted answer text
      y = addFormattedTextToPdf(doc, processedAnswerText, 20, y, 170);
      y += 10;
    } else {
      y += 10; // Add some space after the question if no answer
    }
    
    // Add a separator line between questions
    if (index < questions.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y - 5, 190, y - 5);
      y += 5;
    }
    
    // Check if we need a new page for the next question
    if (y > 270 && index < questions.length - 1) {
      doc.addPage();
      y = 20;
    }
  });
  
  return doc;
};

/**
 * Process HTML content and extract text with basic formatting retained
 * @param {HTMLElement} element - The HTML element containing content
 * @returns {Array} - Array of formatted text objects with indentation and font style info
 */
function processHtmlContent(element) {
  const result = [];
  const caseScenarioPrefix = 'Case Scenario: ';
  
  // Check for a Case Scenario section
  const caseScenarioDiv = element.querySelector('.case-scenario');
  if (caseScenarioDiv) {
    result.push({ text: caseScenarioPrefix + (caseScenarioDiv.textContent || '').trim(), indent: 0, bold: true });
    
    // Process potential bullet points within case scenario
    const bulletPoints = Array.from(caseScenarioDiv.querySelectorAll('li'));
    bulletPoints.forEach(li => {
      result.push({ text: '• ' + (li.textContent || '').trim(), indent: 1, bold: false });
    });
  } else {
    // Process text that might be a case scenario but doesn't have the class
    const text = element.textContent || element.innerText || '';
    if (text.includes('Case Scenario:')) {
      // Split text into lines
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      // Find the line with "Case Scenario:" and add it
      const scenarioIndex = lines.findIndex(line => line.includes('Case Scenario:'));
      if (scenarioIndex >= 0) {
        result.push({ text: lines[scenarioIndex], indent: 0, bold: true });
        
        // Add remaining lines, potentially as bullet points
        for (let i = scenarioIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          // Check if line starts with a bullet or looks like a bullet point
          if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || 
              line.match(/^\d+\.\s/) || line.match(/^[a-zA-Z]\)\s/)) {
            result.push({ text: line, indent: 1, bold: false });
          } else if (line.trim().length > 0) {
            // Regular line, not a bullet
            result.push({ text: line, indent: 0, bold: false });
          }
        }
      } else {
        // Just add the text as is
        result.push({ text: text, indent: 0, bold: false });
      }
    } else {
      // Regular text without case scenario
      const paragraphs = text.split('\n').map(p => p.trim()).filter(p => p);
      paragraphs.forEach(paragraph => {
        result.push({ text: paragraph, indent: 0, bold: false });
      });
    }
  }
  
  return result;
}

/**
 * Add formatted text to PDF document
 * @param {jsPDF} doc - The PDF document
 * @param {Array} formattedText - Array of text objects with formatting info
 * @param {Number} x - Starting x position
 * @param {Number} y - Starting y position
 * @param {Number} maxWidth - Maximum width for text wrapping
 * @returns {Number} - The new y position after adding text
 */
function addFormattedTextToPdf(doc, formattedText, x, y, maxWidth) {
  let currentY = y;
  
  formattedText.forEach(item => {
    // Set font based on bold property
    doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
    
    // Calculate indentation (10 points per level)
    const indentX = x + (item.indent * 10);
    
    // Adjust maxWidth based on indentation
    const adjustedMaxWidth = maxWidth - (item.indent * 10);
    
    // Split text to fit within adjusted max width
    const splitText = doc.splitTextToSize(item.text, adjustedMaxWidth);
    
    // Check if we need a new page
    if (currentY + (splitText.length * 7) > 280) {
      doc.addPage();
      currentY = 20;
    }
    
    // Add text to PDF
    doc.text(splitText, indentX, currentY);
    
    // Update y position for next text
    currentY += splitText.length * 7;
  });
  
  return currentY;
}

/**
 * Saves the PDF with a simple filename
 * @param {jsPDF} doc - The PDF document to save
 */
export const savePDF = (doc) => {
  // Generate a simple filename with date
  const date = new Date();
  const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  
  const filename = `ca-exam-questions-${dateStr}.pdf`;
  
  // Save the PDF
  doc.save(filename);
};