import jsPDF from 'jspdf';
import DOMPurify from 'dompurify';

// Constants for styling
const PRIMARY_COLOR = '#03a9f4';
const SECONDARY_COLOR = '#333333';
const TEXT_COLOR = '#121212';
const LINE_HEIGHT = 1.2;
const SECTION_SPACING = 8;

export const generateQuestionsPDF = (questions, filters, includeAnswers, individualAnswers) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4'
  });

  // Set default font
  doc.setFont('helvetica');
  doc.setTextColor(TEXT_COLOR);

  // Add header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PRIMARY_COLOR);
  doc.text('CA Exam Preparation', 105, 20, { align: 'center' });
  
  // Add filter info
  doc.setFontSize(10);
  doc.setTextColor(SECONDARY_COLOR);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
  
  let y = 35;

  questions.forEach((question, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
      doc.setFontSize(10);
      doc.text(`CA Exam Preparation - Page ${doc.internal.getNumberOfPages()}`, 105, 15, { align: 'center' });
      y = 25;
    }

    // Question number
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PRIMARY_COLOR);
    doc.text(`Question ${index + 1}`, 20, y);
    y += SECTION_SPACING;

    // Question text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_COLOR);
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(question.questionText);
    const processedText = processHtmlContent(tempDiv);
    
    y = addFormattedTextToPdf(doc, processedText, 20, y, 170);
    y += SECTION_SPACING;

    // Sub-questions
    if (question.subQuestions?.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Sub-Questions:', 20, y);
      y += SECTION_SPACING;

      question.subQuestions.forEach((subQ, subIndex) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${subIndex + 1}. ${subQ.subQuestionNumber || ''}`, 20, y);
        y += SECTION_SPACING/2;

        doc.setFont('helvetica', 'normal');
        if (subQ.subQuestionText) {
          const subQTempDiv = document.createElement('div');
          subQTempDiv.innerHTML = DOMPurify.sanitize(subQ.subQuestionText);
          const processedSubText = processHtmlContent(subQTempDiv);
          y = addFormattedTextToPdf(doc, processedSubText, 25, y, 165);
          y += SECTION_SPACING/2;
        }

        // Options
        if (subQ.subOptions?.length > 0) {
          subQ.subOptions.forEach((opt, optIndex) => {
            const optionLetter = String.fromCharCode(65 + optIndex);
            const optionTextDiv = document.createElement('div');
            optionTextDiv.innerHTML = DOMPurify.sanitize(opt.optionText || '');
            const optionText = optionTextDiv.textContent || optionTextDiv.innerText || '';
            
            const isCorrect = opt.isCorrect && (includeAnswers || individualAnswers[question._id]);
            doc.setFont('helvetica', isCorrect ? 'bold' : 'normal');
            doc.setTextColor(isCorrect ? PRIMARY_COLOR : TEXT_COLOR);
            
            const optionLine = `${optionLetter}. ${optionText}${isCorrect ? ' ✓' : ''}`;
            const splitOptText = doc.splitTextToSize(optionLine, 160);
            doc.text(splitOptText, 30, y);
            y += splitOptText.length * 5 * LINE_HEIGHT;
          });
          y += SECTION_SPACING;
        }
      });
    }

    // Separator
    doc.setDrawColor(PRIMARY_COLOR);
    doc.setLineWidth(0.2);
    doc.line(20, y, 190, y);
    y += SECTION_SPACING;
  });

  return doc;
};

function addFormattedTextToPdf(doc, formattedText, x, y, maxWidth) {
  let currentY = y;
  
  formattedText.forEach(item => {
    doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
    doc.setTextColor(item.bold ? PRIMARY_COLOR : TEXT_COLOR);
    
    const indentX = x + (item.indent * 10);
    const adjustedMaxWidth = maxWidth - (item.indent * 10);
    const splitText = doc.splitTextToSize(item.text, adjustedMaxWidth);
    
    if (currentY + (splitText.length * 5 * LINE_HEIGHT) > 280) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.text(splitText, indentX, currentY);
    currentY += splitText.length * 5 * LINE_HEIGHT;
  });
  
  return currentY;
}

function processHtmlContent(element) {
  const result = [];
  const caseScenarioPrefix = 'Case Scenario: ';
  
  const caseScenarioDiv = element.querySelector('.case-scenario');
  if (caseScenarioDiv) {
    result.push({ text: caseScenarioPrefix + (caseScenarioDiv.textContent || '').trim(), indent: 0, bold: true });
    
    const bulletPoints = Array.from(caseScenarioDiv.querySelectorAll('li'));
    bulletPoints.forEach(li => {
      result.push({ text: '• ' + (li.textContent || '').trim(), indent: 1, bold: false });
    });
  } else {
    const text = element.textContent || element.innerText || '';
    if (text.includes('Case Scenario:')) {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      const scenarioIndex = lines.findIndex(line => line.includes('Case Scenario:'));
      if (scenarioIndex >= 0) {
        result.push({ text: lines[scenarioIndex], indent: 0, bold: true });
        for (let i = scenarioIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || 
              line.match(/^\d+\.\s/) || line.match(/^[a-zA-Z]\)\s/)) {
            result.push({ text: line, indent: 1, bold: false });
          } else if (line.trim().length > 0) {
            result.push({ text: line, indent: 0, bold: false });
          }
        }
      } else {
        result.push({ text: text, indent: 0, bold: false });
      }
    } else {
      const paragraphs = text.split('\n').map(p => p.trim()).filter(p => p);
      paragraphs.forEach(paragraph => {
        result.push({ text: paragraph, indent: 0, bold: false });
      });
    }
  }
  
  return result;
}

export const savePDF = (doc, filename = 'ca-questions.pdf') => {
  doc.save(filename);
};