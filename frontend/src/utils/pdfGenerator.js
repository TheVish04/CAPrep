import jsPDF from 'jspdf';
import DOMPurify from 'dompurify';
import { texify } from 'texifier';

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
  
  // Generate LaTeX content
  const latexContent = generateLatexContent(questions, includeAnswers, individualAnswers, formattedDate);
  
  try {
    // Convert LaTeX to PDF using jsPDF
    renderLatexToPDF(doc, latexContent);
  } catch (error) {
    console.error("Error rendering LaTeX to PDF:", error);
    // Fallback to direct rendering if LaTeX conversion fails
    fallbackDirectRendering(doc, questions, includeAnswers, individualAnswers, formattedDate);
  }
  
  return doc;
};

/**
 * Generate LaTeX content from questions
 * @param {Array} questions - The questions to include
 * @param {Boolean} includeAnswers - Whether to include all answers
 * @param {Object} individualAnswers - Individual answers to show
 * @param {String} formattedDate - The formatted date
 * @returns {String} - LaTeX document content
 */
function generateLatexContent(questions, includeAnswers, individualAnswers, formattedDate) {
  // LaTeX document preamble
  let latexContent = `
\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{a4paper, margin=2cm}
\\usepackage{amsmath,amssymb}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{xcolor}
\\usepackage{array}
\\usepackage{hyperref}
\\usepackage{fontspec}
\\setmainfont{Arial}

\\pagestyle{fancy}
\\fancyhf{}
\\rhead{CA Exam Questions}
\\lhead{Generated on: ${formattedDate}}
\\cfoot{Page \\thepage}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

\\begin{center}
\\textbf{\\Large CA Exam Questions}
\\end{center}

\\vspace{0.5cm}
\\noindent\\textit{Generated on: ${formattedDate}}
\\vspace{0.5cm}

`;

  // Process each question
  questions.forEach((question, index) => {
    // Question number and title
    latexContent += `\\section*{${index + 1}.}\n`;
    latexContent += `\\textbf{Question:}\n\n`;
    
    // Process question text
    const questionText = processTextForLatex(question.questionText);
    
    // Check for case scenario
    if (questionText.includes('Case Scenario:')) {
      latexContent += formatCaseScenario(questionText);
    } else {
      latexContent += `${questionText}\n\n`;
    }
    
    // Process sub-questions if they exist
    if (question.subQuestions && question.subQuestions.length > 0) {
      latexContent += `\\textbf{Sub-Questions:}\n\n`;
      
      question.subQuestions.forEach((subQ, subIndex) => {
        latexContent += `\\subsection*{${subIndex + 1}. ${subQ.subQuestionNumber ? `Sub-Question ${subQ.subQuestionNumber}:` : ''}}\n`;
        
        if (subQ.subQuestionText) {
          latexContent += `${processTextForLatex(subQ.subQuestionText)}\n\n`;
        }
        
        // Process options for this sub-question
        if (subQ.subOptions && subQ.subOptions.length > 0) {
          latexContent += `\\begin{enumerate}[label=\\Alph*.]\n`;
          
          subQ.subOptions.forEach((opt, optIndex) => {
            const optionText = processTextForLatex(opt.optionText || '');
            
            if (opt.isCorrect && (includeAnswers || individualAnswers[question._id])) {
              latexContent += `\\item \\textbf{${optionText} (Correct)}\n`;
            } else {
              latexContent += `\\item ${optionText}\n`;
            }
          });
          
          latexContent += `\\end{enumerate}\n\n`;
        }
      });
    }
    
    // Add answer if needed
    if ((includeAnswers || individualAnswers[question._id]) && question.answerText) {
      latexContent += `\\textbf{Answer:}\n\n`;
      latexContent += `${processTextForLatex(question.answerText)}\n\n`;
    }
    
    // Add a separator between questions
    if (index < questions.length - 1) {
      latexContent += `\\vspace{0.5cm}\\hrule\\vspace{0.5cm}\n\n`;
    }
  });
  
  // Close the LaTeX document
  latexContent += `\\end{document}`;
  
  return latexContent;
}

/**
 * Process text for LaTeX compatibility
 * @param {String} text - The HTML text to process
 * @returns {String} - LaTeX-compatible text
 */
function processTextForLatex(text) {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = DOMPurify.sanitize(text || '');
  
  // Get the clean text
  let cleanText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Escape LaTeX special characters
  cleanText = cleanText.replace(/\\/g, '\\textbackslash')
                       .replace(/&/g, '\\&')
                       .replace(/%/g, '\\%')
                       .replace(/\$/g, '\\$')
                       .replace(/#/g, '\\#')
                       .replace(/_/g, '\\_')
                       .replace(/\{/g, '\\{')
                       .replace(/\}/g, '\\}')
                       .replace(/~/g, '\\textasciitilde')
                       .replace(/\^/g, '\\textasciicircum');
  
  // Format currency symbols
  cleanText = cleanText.replace(/₹/g, '₹');
  
  return cleanText;
}

/**
 * Format a case scenario for LaTeX
 * @param {String} text - The case scenario text
 * @returns {String} - Formatted LaTeX text
 */
function formatCaseScenario(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  let latexOutput = '';
  
  // Find the case scenario title
  const scenarioIndex = lines.findIndex(line => line.includes('Case Scenario:'));
  if (scenarioIndex >= 0) {
    // Add the case scenario title
    latexOutput += `\\textbf{${lines[scenarioIndex]}}\n\n`;
    
    // Start itemized list for bullet points
    latexOutput += `\\begin{itemize}[leftmargin=*,label={$\\bullet$}]\n`;
    
    // Process remaining lines
    for (let i = scenarioIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Special handling for financial lines
      if (line.includes('₹') || line.includes('crore') || line.includes('lacs') || 
          line.match(/^\s*The cost of/i) || line.match(/^\s*Cost of/i) ||
          line.match(/^The Company/i) || line.match(/^At the beginning/i)) {
        
        // Clean up the line for LaTeX
        const cleanedLine = line.replace(/\s+/g, ' ')
                                .replace(/₹\s+/g, '₹')
                                .replace(/(\d)\s+(\d)/g, '$1$2')
                                .replace(/\s+crore/g, ' crore')
                                .replace(/\s+lacs/g, ' lacs');
        
        latexOutput += `\\item ${cleanedLine}\n`;
      }
      // Notes like "Ignore the effect of depreciation"
      else if (line.toLowerCase().startsWith('ignore') || line.toLowerCase().startsWith('answer the')) {
        latexOutput += `\\end{itemize}\n\n${line}\n\n`;
      }
      // Regular bullet point
      else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        latexOutput += `\\item ${line.substring(1).trim()}\n`;
      }
      // Other lines
      else {
        latexOutput += `\\item ${line}\n`;
      }
    }
    
    // Close the itemized list if not already closed
    if (!latexOutput.endsWith('\\end{itemize}\n\n')) {
      latexOutput += `\\end{itemize}\n\n`;
    }
  } else {
    // If no case scenario format detected, just return the text
    latexOutput = `${text}\n\n`;
  }
  
  return latexOutput;
}

/**
 * Render LaTeX content to PDF
 * @param {jsPDF} doc - The PDF document
 * @param {String} latexContent - The LaTeX content
 */
function renderLatexToPDF(doc, latexContent) {
  // NOTE: In a real implementation, this would use a LaTeX to PDF conversion service or library
  // For now, we'll use a simulated approach since full LaTeX rendering in browser is complex
  
  try {
    // If a LaTeX rendering library exists, use it
    if (typeof texify === 'function') {
      const pdfBuffer = texify(latexContent);
      doc.addPDF(pdfBuffer);
    } else {
      // Otherwise fall back to direct rendering
      throw new Error("LaTeX rendering library not available");
    }
  } catch (error) {
    console.error("LaTeX rendering failed:", error);
    throw error; // Let the main function handle the fallback
  }
}

/**
 * Fallback method for direct PDF rendering when LaTeX fails
 * This is essentially our original implementation with improved formatting
 */
function fallbackDirectRendering(doc, questions, includeAnswers, individualAnswers, formattedDate) {
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
      let cleanedLine = line.replace(/\s+/g, ' ')
                           .replace(/₹\s+/g, '₹')
                           .replace(/(\d)\s+(\d)/g, '$1$2')
                           .replace(/\s+crore/g, ' crore')
                           .replace(/\s+lacs/g, ' lacs');
      
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
 * Saves the PDF with a simple filename
 * @param {jsPDF} doc - The PDF document to save
 */
export const savePDF = (doc) => {
  // Generate filename with date
  const date = new Date();
  const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  
  const filename = `ca-exam-questions-${dateStr}.pdf`;
  
  // Save the PDF
  doc.save(filename);
};