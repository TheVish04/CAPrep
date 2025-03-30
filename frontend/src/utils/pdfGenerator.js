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
    
    // Handle question text - strip HTML and add to PDF
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(question.questionText);
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Split text into lines to fit PDF width
    const splitText = doc.splitTextToSize(plainText, 170);
    doc.text(splitText, 20, y);
    y += splitText.length * 7 + 5;
    
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
        const subQText = subQ.subQuestionText || '';
        const splitSubQText = doc.splitTextToSize(subQText, 170);
        doc.text(splitSubQText, 20, y);
        y += splitSubQText.length * 7 + 5;
        
        // Process options for this sub-question
        if (subQ.subOptions && subQ.subOptions.length > 0) {
          subQ.subOptions.forEach((opt, optIndex) => {
            // Check if we need a new page for options
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            
            const optionLetter = String.fromCharCode(97 + optIndex); // a, b, c, etc.
            const optionText = opt.optionText || '';
            
            // Format with correct answer indicator
            if (opt.isCorrect) {
              doc.setFont('helvetica', 'bold');
              const optionLine = `${optionLetter}) ${optionText} (Correct)`;
              const splitOptText = doc.splitTextToSize(optionLine, 170);
              doc.text(splitOptText, 20, y);
              y += splitOptText.length * 7;
            } else {
              doc.setFont('helvetica', 'normal');
              const optionLine = `${optionLetter}) ${optionText}`;
              const splitOptText = doc.splitTextToSize(optionLine, 170);
              doc.text(splitOptText, 20, y);
              y += splitOptText.length * 7;
            }
          });
          y += 5; // Add space after options
        }
      });
      y += 5; // Add space after all sub-questions
    }
    
    // Add answer if needed
    if ((includeAnswers || individualAnswers[question.id]) && question.answerText) {
      // Check if we need a new page for the answer
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Answer:', 20, y);
      y += 7;
      
      doc.setFont('helvetica', 'normal');
      
      // Handle answer text - strip HTML and add to PDF
      tempDiv.innerHTML = DOMPurify.sanitize(question.answerText);
      const plainAnswerText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Split answer text into lines
      const splitAnswerText = doc.splitTextToSize(plainAnswerText, 170);
      doc.text(splitAnswerText, 20, y);
      y += splitAnswerText.length * 7 + 10;
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