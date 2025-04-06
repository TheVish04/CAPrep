import jsPDF from 'jspdf';
import DOMPurify from 'dompurify';
// We won't use texifier, but we'll implement a LaTeX-inspired approach

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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add title and date to the first page
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  try {
    // Use LaTeX-inspired structured document approach
    generateStructuredPDF(doc, questions, includeAnswers, individualAnswers, formattedDate);
  } catch (error) {
    console.error("Error in structured PDF generation:", error);
    // Fallback to direct rendering if structure approach fails
    enhancedDirectRendering(doc, questions, includeAnswers, individualAnswers, formattedDate);
  }
  
  return doc;
};

/**
 * Generate a structured PDF with LaTeX-inspired formatting
 * @param {jsPDF} doc - The PDF document
 * @param {Array} questions - The questions to include
 * @param {Boolean} includeAnswers - Whether to include all answers
 * @param {Object} individualAnswers - Individual answers to show
 * @param {String} formattedDate - The formatted date
 */
function generateStructuredPDF(doc, questions, includeAnswers, individualAnswers, formattedDate) {
  // Set document properties
  doc.setProperties({
    title: 'CA Exam Questions',
    subject: 'Generated CA Exam Questions',
    author: 'CA Exam Platform',
    keywords: 'CA, Exam, Questions',
    creator: 'CA Exam Platform'
  });
  
  // Add headers and footers to all pages
  const totalPages = calculateTotalPages(doc, questions, includeAnswers, individualAnswers);
  setupHeadersAndFooters(doc, formattedDate, totalPages);
  
  // Set initial position
  let y = 30; // Start a bit lower to account for header
  
  // Add title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CA Exam Questions', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 15;
  
  // Add date of generation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on: ${formattedDate}`, 20, y);
  y += 15;
  
  // Process each question using improved typesetting
  let currentPage = 1;
  
  questions.forEach((question, index) => {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      currentPage++;
      y = 30; // Start below header
    }
    
    // Question number and title with section formatting
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, 20, y);
    y += 8;
    
    // Question text label
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Question:', 20, y);
    y += 7;
    
    // Process question text with enhanced formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(question.questionText);
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Format case scenarios with proper typesetting
    if (text.includes('Case Scenario:')) {
      y = addStructuredCaseScenario(doc, text, 20, y);
    } else {
      // Process regular question text with proper spacing and hyphenation
      y = addFormattedParagraphs(doc, text, 20, y, 170);
    }
    
    // Add sub-questions with proper enumeration
    if (question.subQuestions && question.subQuestions.length > 0) {
      if (y > 240) {
        doc.addPage();
        currentPage++;
        y = 30;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Sub-Questions:', 20, y);
      y += 10;
      
      question.subQuestions.forEach((subQ, subIndex) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${subIndex + 1}. ${subQ.subQuestionNumber ? `Sub-Question ${subQ.subQuestionNumber}:` : ''}`, 20, y);
        y += 7;
        
        if (subQ.subQuestionText) {
          y = addFormattedParagraphs(doc, subQ.subQuestionText, 20, y, 170);
        }
        
        // Process options with proper enumeration
        if (subQ.subOptions && subQ.subOptions.length > 0) {
          y = addFormattedOptions(doc, subQ.subOptions, y, includeAnswers, individualAnswers, question._id);
        }
      });
      y += 5;
    }
    
    // Add answer if needed with proper formatting
    if ((includeAnswers || individualAnswers[question._id]) && question.answerText) {
      if (y > 240) {
        doc.addPage();
        currentPage++;
        y = 30;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Answer:', 20, y);
      y += 7;
      
      y = addFormattedParagraphs(doc, question.answerText, 20, y, 170);
    }
    
    // Add a separator between questions (horizontal rule)
    if (index < questions.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, 190, y);
      y += 10;
    }
    
    // New page for next question if needed
    if (y > 270 && index < questions.length - 1) {
      doc.addPage();
      currentPage++;
      y = 30;
    }
  });
}

/**
 * Add formatted paragraphs to the PDF with proper text flow
 * @param {jsPDF} doc - The PDF document
 * @param {String} text - The text to format
 * @param {Number} x - The x position
 * @param {Number} y - The y position
 * @param {Number} maxWidth - Maximum width for text
 * @returns {Number} - The new y position
 */
function addFormattedParagraphs(doc, text, x, y, maxWidth) {
  // Clean up the HTML content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = DOMPurify.sanitize(text);
  
  // Get the cleaned text
  const cleanedText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Process text with proper spacing fixes
  const processedText = fixTextSpacing(cleanedText);
  
  // Split into paragraphs
  const paragraphs = processedText.split('\n')
    .map(para => para.trim())
    .filter(para => para.length > 0);
  
  let currentY = y;
  doc.setFont('helvetica', 'normal');
  
  paragraphs.forEach(paragraph => {
    // Check if we need a new page
    if (currentY > 270) {
      doc.addPage();
      currentY = 30;
    }
    
    // Split text to fit within max width with improved hyphenation
    const splitText = doc.splitTextToSize(paragraph, maxWidth);
    
    // Add the paragraph
    doc.text(splitText, x, currentY);
    currentY += splitText.length * 7 + 3; // Add a bit more space between paragraphs
  });
  
  return currentY + 2; // Return the new position with a little extra space
}

/**
 * Add a structured case scenario with proper formatting
 * @param {jsPDF} doc - The PDF document
 * @param {String} text - The case scenario text
 * @param {Number} x - The x position
 * @param {Number} y - The y position
 * @returns {Number} - The new y position
 */
function addStructuredCaseScenario(doc, text, x, y) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  let currentY = y;
  
  // Find the case scenario title
  const scenarioIndex = lines.findIndex(line => line.includes('Case Scenario:'));
  if (scenarioIndex >= 0) {
    // Add the title in bold with proper formatting
    doc.setFont('helvetica', 'bold');
    const titleText = doc.splitTextToSize(lines[scenarioIndex], 170);
    doc.text(titleText, x, currentY);
    currentY += titleText.length * 7 + 3;
    
    // Create an indented list for the case points
    doc.setFont('helvetica', 'normal');
    
    // First, collect sections to process them properly
    const sections = [];
    let currentSection = [];
    
    for (let i = scenarioIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Special handling for section breaks
      if (line.toLowerCase().startsWith('ignore') || line.toLowerCase().startsWith('answer the')) {
        if (currentSection.length > 0) {
          sections.push({type: 'bullet-list', lines: currentSection});
          currentSection = [];
        }
        sections.push({type: 'note', text: line});
      } else {
        // Add to current section
        currentSection.push(line);
      }
    }
    
    // Add the last section if any
    if (currentSection.length > 0) {
      sections.push({type: 'bullet-list', lines: currentSection});
    }
    
    // Now process each section with proper spacing and formatting
    sections.forEach(section => {
      // Check if we need a new page
      if (currentY > 270) {
        doc.addPage();
        currentY = 30;
      }
      
      if (section.type === 'note') {
        // Process notes without bullet points
        const splitLine = doc.splitTextToSize(section.text, 170);
        doc.text(splitLine, x, currentY);
        currentY += splitLine.length * 7 + 5;
      } else if (section.type === 'bullet-list') {
        // Process bullet list with proper indentation and bullet points
        section.lines.forEach(line => {
          // Check if we need a new page
          if (currentY > 270) {
            doc.addPage();
            currentY = 30;
          }
          
          // Clean up the line - fix spacing issues
          let cleanedLine = fixTextSpacing(line);
          
          // Special formatting for financial items and other key lines
          if (line.includes('₹') || line.includes('crore') || line.includes('lacs') || 
              line.match(/^\s*The cost of/i) || line.match(/^\s*Cost of/i) ||
              line.match(/^The Company/i) || line.match(/^At the beginning/i)) {
            
            // Add bullet point if not already present
            if (!cleanedLine.startsWith('•') && !cleanedLine.startsWith('-')) {
              cleanedLine = '• ' + cleanedLine;
            }
          }
          // Regular bullet point - ensure it starts with a bullet
          else if (!line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*')) {
            cleanedLine = '• ' + cleanedLine;
          }
          
          // Format the line as a bullet point with proper spacing
          const bulletText = cleanedLine.startsWith('•') ? cleanedLine : 
                            cleanedLine.startsWith('-') ? '•' + cleanedLine.substring(1) :
                            cleanedLine.startsWith('*') ? '•' + cleanedLine.substring(1) : 
                            '• ' + cleanedLine;
          
          const splitLine = doc.splitTextToSize(bulletText, 160);
          
          // Handle multi-line bullet points with proper indentation
          doc.text(splitLine[0], x + 5, currentY);
          currentY += 7;
          
          // Handle continuation lines with indentation
          if (splitLine.length > 1) {
            for (let i = 1; i < splitLine.length; i++) {
              doc.text(splitLine[i], x + 10, currentY);
              currentY += 7;
            }
          }
          
          currentY += 2; // Add a small space between bullet points
        });
      }
    });
  } else {
    // Just add the text normally if no case scenario format is detected
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(text, 170);
    doc.text(splitText, x, currentY);
    currentY += splitText.length * 7 + 5;
  }
  
  return currentY;
}

/**
 * Add formatted options to the PDF with proper enumeration
 * @param {jsPDF} doc - The PDF document
 * @param {Array} options - The options to add
 * @param {Number} y - The starting y position
 * @param {Boolean} includeAnswers - Whether to include all answers
 * @param {Object} individualAnswers - Individual answers to show
 * @param {String} questionId - The ID of the question
 * @returns {Number} - The new y position
 */
function addFormattedOptions(doc, options, y, includeAnswers, individualAnswers, questionId) {
  let currentY = y;
  
  options.forEach((opt, optIndex) => {
    // Check if we need a new page
    if (currentY > 270) {
      doc.addPage();
      currentY = 30;
    }
    
    const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, etc.
    const optDiv = document.createElement('div');
    optDiv.innerHTML = DOMPurify.sanitize(opt.optionText || '');
    const optionText = optDiv.textContent || optDiv.innerText || '';
    
    // Process option text with proper spacing
    const cleanedOptionText = fixTextSpacing(optionText);
    
    if (opt.isCorrect && (includeAnswers || individualAnswers[questionId])) {
      doc.setFont('helvetica', 'bold');
      const optionLine = `${optionLetter}. ${cleanedOptionText} (Correct)`;
      const splitOptText = doc.splitTextToSize(optionLine, 160);
      
      // First line with option letter
      doc.text(splitOptText[0], 25, currentY);
      currentY += 7;
      
      // Continuation lines with indentation
      if (splitOptText.length > 1) {
        for (let i = 1; i < splitOptText.length; i++) {
          doc.text(splitOptText[i], 30, currentY);
          currentY += 7;
        }
      }
    } else {
      doc.setFont('helvetica', 'normal');
      const optionLine = `${optionLetter}. ${cleanedOptionText}`;
      const splitOptText = doc.splitTextToSize(optionLine, 160);
      
      // First line with option letter
      doc.text(splitOptText[0], 25, currentY);
      currentY += 7;
      
      // Continuation lines with indentation
      if (splitOptText.length > 1) {
        for (let i = 1; i < splitOptText.length; i++) {
          doc.text(splitOptText[i], 30, currentY);
          currentY += 7;
        }
      }
    }
    
    currentY += 3; // Add space between options
  });
  
  return currentY + 5; // Return with some extra spacing
}

/**
 * Calculate approximate total pages needed
 * @param {jsPDF} doc - The PDF document
 * @param {Array} questions - The questions to include
 * @param {Boolean} includeAnswers - Whether to include all answers
 * @param {Object} individualAnswers - Individual answers to show
 * @returns {Number} - Estimated total pages
 */
function calculateTotalPages(doc, questions, includeAnswers, individualAnswers) {
  let totalLines = 0;
  const linesPerPage = 40; // Approximate lines per page
  
  questions.forEach(question => {
    // Add lines for question text (estimate)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(question.questionText);
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Estimate lines needed for question text
    totalLines += Math.ceil(text.length / 70) + 5; // Rough estimate + some padding
    
    // Add lines for sub-questions
    if (question.subQuestions && question.subQuestions.length > 0) {
      question.subQuestions.forEach(subQ => {
        if (subQ.subQuestionText) {
          totalLines += Math.ceil(subQ.subQuestionText.length / 70) + 2;
        }
        
        // Add lines for options
        if (subQ.subOptions && subQ.subOptions.length > 0) {
          totalLines += subQ.subOptions.length * 3; // Each option takes approximately 3 lines
        }
      });
    }
    
    // Add lines for answer if included
    if ((includeAnswers || individualAnswers[question._id]) && question.answerText) {
      totalLines += Math.ceil(question.answerText.length / 70) + 3;
    }
    
    // Add lines for separators
    totalLines += 3;
  });
  
  // Calculate pages and add a buffer
  return Math.ceil(totalLines / linesPerPage) + 1;
}

/**
 * Set up headers and footers for all pages
 * @param {jsPDF} doc - The PDF document
 * @param {String} formattedDate - The formatted date
 * @param {Number} totalPages - Total number of pages
 */
function setupHeadersAndFooters(doc, formattedDate, totalPages) {
  // We'll need to add this after content is complete
  const addHeadersAndFooters = () => {
    const pageCount = doc.internal.getNumberOfPages();
    
    // For each page, add header and footer
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Header - right aligned date
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${formattedDate}`, 190, 10, { align: 'right' });
      
      // Header - left aligned title
      doc.text('CA Exam Questions', 20, 10);
      
      // Footer - centered page number
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, 
               doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
  };
  
  // Store the function to be called after all content is added
  doc.headerFooterCallback = addHeadersAndFooters;
  
  // Create a wrapper for the save function to ensure headers/footers are added
  const originalSave = doc.save;
  doc.save = function(filename) {
    if (this.headerFooterCallback) {
      this.headerFooterCallback();
    }
    return originalSave.call(this, filename);
  };
}

/**
 * Enhanced direct PDF rendering with improved formatting for financial data
 * @param {jsPDF} doc - The PDF document
 * @param {Array} questions - Questions to add to the document
 * @param {Boolean} includeAnswers - Whether to include all answers
 * @param {Object} individualAnswers - Individual answers to show
 * @param {String} formattedDate - The formatted date
 */
function enhancedDirectRendering(doc, questions, includeAnswers, individualAnswers, formattedDate) {
  // Set initial position
  let y = 20;
  
  // Add title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CA Exam Questions', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  y += 15;
  
  // Add date of generation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on: ${formattedDate}`, 20, y);
  y += 15;
  
  // Process each question
  questions.forEach((question, index) => {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    // Question number
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, 20, y);
    y += 8;
    
    // Question text label
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Question:', 20, y);
    y += 7;
    
    // Process question text with enhanced formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(question.questionText);
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Improved formatting for case scenarios
    if (text.includes('Case Scenario:')) {
      y = addFormattedCaseScenario(doc, text, 20, y);
    } else {
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(text, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 7 + 5;
    }
    
    // Add sub-questions if they exist
    if (question.subQuestions && question.subQuestions.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Sub-Questions:', 20, y);
      y += 10;
      
      question.subQuestions.forEach((subQ, subIndex) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${subIndex + 1}. ${subQ.subQuestionNumber ? `Sub-Question ${subQ.subQuestionNumber}:` : ''}`, 20, y);
        y += 7;
        
        if (subQ.subQuestionText) {
          doc.setFont('helvetica', 'normal');
          const subQDiv = document.createElement('div');
          subQDiv.innerHTML = DOMPurify.sanitize(subQ.subQuestionText);
          const subQText = subQDiv.textContent || subQDiv.innerText || '';
          const splitSubQText = doc.splitTextToSize(subQText, 170);
          doc.text(splitSubQText, 20, y);
          y += splitSubQText.length * 7 + 5;
        }
        
        // Process options
        if (subQ.subOptions && subQ.subOptions.length > 0) {
          subQ.subOptions.forEach((opt, optIndex) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            
            const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, etc.
            const optDiv = document.createElement('div');
            optDiv.innerHTML = DOMPurify.sanitize(opt.optionText || '');
            const optionText = optDiv.textContent || optDiv.innerText || '';
            
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
          y += 5;
        }
      });
      y += 5;
    }
    
    // Add answer if needed
    if ((includeAnswers || individualAnswers[question._id]) && question.answerText) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Answer:', 20, y);
      y += 7;
      
      doc.setFont('helvetica', 'normal');
      const answerDiv = document.createElement('div');
      answerDiv.innerHTML = DOMPurify.sanitize(question.answerText);
      const answerText = answerDiv.textContent || answerDiv.innerText || '';
      const splitAnswerText = doc.splitTextToSize(answerText, 170);
      doc.text(splitAnswerText, 20, y);
      y += splitAnswerText.length * 7 + 10;
    } else {
      y += 10;
    }
    
    // Add separator line
    if (index < questions.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y - 5, 190, y - 5);
      y += 5;
    }
    
    // New page for next question if needed
    if (y > 270 && index < questions.length - 1) {
      doc.addPage();
      y = 20;
    }
  });
}

/**
 * Add formatted case scenario to PDF with proper bullet points
 */
function addFormattedCaseScenario(doc, text, x, y) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  let currentY = y;
  
  // Find case scenario title
  const scenarioIndex = lines.findIndex(line => line.includes('Case Scenario:'));
  if (scenarioIndex >= 0) {
    // Add the title in bold
    doc.setFont('helvetica', 'bold');
    const titleText = doc.splitTextToSize(lines[scenarioIndex], 170);
    doc.text(titleText, x, currentY);
    currentY += titleText.length * 7 + 3;
    
    // Process the remaining lines
    doc.setFont('helvetica', 'normal');
    for (let i = scenarioIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Check if we need a new page
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      
      // Clean up the line - fix spacing issues
      let cleanedLine = fixTextSpacing(line);
      
      // Special formatting for financial items and other key lines
      if (line.includes('₹') || line.includes('crore') || line.includes('lacs') || 
          line.match(/^\s*The cost of/i) || line.match(/^\s*Cost of/i) ||
          line.match(/^The Company/i) || line.match(/^At the beginning/i)) {
        
        // Add bullet point if not already present
        if (!cleanedLine.startsWith('•') && !cleanedLine.startsWith('-')) {
          cleanedLine = '• ' + cleanedLine;
        }
        
        const splitLine = doc.splitTextToSize(cleanedLine, 160);
        doc.text(splitLine, x + 10, currentY); // Indent for bullet point
        currentY += splitLine.length * 7 + 2;
      }
      // Notes like "Ignore the effect of depreciation"
      else if (line.toLowerCase().startsWith('ignore') || line.toLowerCase().startsWith('answer the')) {
        const splitLine = doc.splitTextToSize(cleanedLine, 170);
        doc.text(splitLine, x, currentY); // No indent for notes
        currentY += splitLine.length * 7 + 2;
      }
      // Regular bullet point
      else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        const splitLine = doc.splitTextToSize(cleanedLine, 160);
        doc.text(splitLine, x + 10, currentY); // Indent for bullet point
        currentY += splitLine.length * 7 + 2;
      }
      // Other lines - treat as bullet points in a case scenario
      else {
        cleanedLine = '• ' + cleanedLine;
        const splitLine = doc.splitTextToSize(cleanedLine, 160);
        doc.text(splitLine, x + 10, currentY); // Indent for bullet point
        currentY += splitLine.length * 7 + 2;
      }
    }
  } else {
    // Just add the text normally if no case scenario format is detected
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(text, 170);
    doc.text(splitText, x, currentY);
    currentY += splitText.length * 7 + 5;
  }
  
  return currentY;
}

/**
 * Processes text to fix spacing issues in financial and numeric text
 * @param {String} text - The text to process
 * @returns {String} - Cleaned text with fixed spacing
 */
function fixTextSpacing(text) {
  let fixedText = text;
  
  // Replace multiple spaces with a single space
  fixedText = fixedText.replace(/\s{2,}/g, ' ');
  
  // Fix currency spacing
  fixedText = fixedText.replace(/₹\s+/g, '₹');
  fixedText = fixedText.replace(/rupees\s+/gi, '₹');
  
  // Fix number spacing
  fixedText = fixedText.replace(/(\d)\s+(\d)/g, '$1$2');
  
  // Fix spacing around common financial terms
  fixedText = fixedText.replace(/\s+crore/g, ' crore');
  fixedText = fixedText.replace(/\s+lacs/g, ' lacs');
  fixedText = fixedText.replace(/\s+lakhs/g, ' lakhs');
  
  // Fix spacing between letters in financial amounts
  fixedText = fixedText.replace(/(\d)\s+([cC]rore)/g, '$1 $2');
  fixedText = fixedText.replace(/(\d)\s+([lL]acs)/g, '$1 $2');
  fixedText = fixedText.replace(/(\d)\s+([lL]akhs)/g, '$1 $2');
  
  return fixedText;
}

/**
 * Saves the PDF with a simple filename
 * @param {jsPDF} doc - The PDF document to save
 */
export const savePDF = (doc) => {
  // Add headers and footers before saving if the callback exists
  if (doc.headerFooterCallback) {
    doc.headerFooterCallback();
  }
  
  // Generate filename with date
  const date = new Date();
  const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  
  const filename = `ca-exam-questions-${dateStr}.pdf`;
  
  // Save the PDF
  doc.save(filename);
};