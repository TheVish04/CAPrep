const express = require('express');
const router = express.Router();
// const axios = require('axios'); // No longer needed for the API call
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai'); // Import Gemini SDK
const { authMiddleware } = require('../middleware/authMiddleware');
const Question = require('../models/QuestionModel');
require('dotenv').config(); // Ensure environment variables are loaded

// Initialize Gemini Client
if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL ERROR: GEMINI_API_KEY is not defined in .env');
  // Optional: Exit process if key is critical for startup
  // process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure safety settings (adjust as needed)
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// POST /api/ai-quiz/generate - Generate questions using AI
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { subject, examStage, count = 5 } = req.body; // Default to 5 questions
    
    console.log('AI Quiz Request:', { subject, examStage, count });

    // 1. Input Validation (Basic)
    if (!subject || !examStage) {
      console.log('Missing required fields:', { subject, examStage });
      return res.status(400).json({ error: 'Subject and Exam Stage are required.' });
    }
    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI API Key not configured in .env');
        return res.status(500).json({ error: 'AI service configuration error.' });
    }
    
    console.log('Gemini API Key available:', !!process.env.GEMINI_API_KEY);

    // 2. Retrieve Example Questions
    console.log('Fetching example questions for subject:', subject, 'examStage:', examStage);
    const exampleQuestions = await Question.find({ subject, examStage }).limit(20).lean();
     if (!exampleQuestions || exampleQuestions.length === 0) {
       console.warn(`No example questions found for Subject: ${subject}, Stage: ${examStage}. Proceeding without examples.`);
     } else {
       console.log(`Using ${exampleQuestions.length} example questions for AI prompt context.`);
     }

    // 3. Construct Prompt using simple string concatenation
    let prompt = "You are an expert CA exam question generator. Generate " + count + 
                 " new, unique multiple-choice questions suitable for the CA " + examStage + 
                 " level, specifically for the subject \"" + subject + "\".\n\n";

    if (exampleQuestions.length > 0) {
      prompt += "Here are some examples of existing questions:\n\n";
      exampleQuestions.forEach((q, index) => {
        prompt += "Example " + (index + 1) + ":\nQuestion: " + q.questionText + "\n";
        
        // Check for options within subQuestions
        if (q.subQuestions && q.subQuestions.length > 0 && q.subQuestions[0].subOptions && q.subQuestions[0].subOptions.length > 0) {
          const options = q.subQuestions[0].subOptions.map(opt => opt.optionText).filter(Boolean);
          if (options.length > 0) {
            prompt += "Options: ";
            options.forEach((opt, i) => {
              prompt += String.fromCharCode(65 + i) + ") " + opt;
              if (i < options.length - 1) prompt += ", ";
            });
            prompt += "\n";
          }
        } else if (q.options && q.options.length > 0) {
          // Fallback if options are directly on the question object
          prompt += "Options: ";
          q.options.forEach((opt, i) => {
            prompt += String.fromCharCode(65 + i) + ") " + opt;
            if (i < q.options.length - 1) prompt += ", ";
          });
          prompt += "\n";
        }
        
        prompt += "\n"; // Add a blank line between examples
      });
    }

    // Reinforce JSON output format instructions
    prompt += "Important: Format your response strictly as a JSON array of objects. " +
              "Each object must have these exact keys: \"questionText\" (string), " +
              "\"options\" (array of 4 strings), and \"correctAnswerIndex\" (integer from 0 to 3 " +
              "indicating the index of the correct option in the 'options' array). Do not include " +
              "any introductory text, explanations, or markdown formatting like ```json outside " +
              "the JSON array itself. Only output the valid JSON array.";

    // 4. Call Google Gemini API
    console.log("Sending prompt to Google Gemini API...");
    console.log("Prompt length:", prompt.length, "characters");
    // console.log("Prompt:", prompt); // Uncomment for debugging

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", 
        safetySettings 
      });
      
      console.log("Using model: gemini-1.5-flash");

      const generationConfig = {
        temperature: 0.7,
        maxOutputTokens: 4096,
      };
      
      console.log("Generation config:", generationConfig);

      console.log("Calling Gemini API...");
      const result = await model.generateContent(prompt);
      console.log("Received response from Google Gemini API.");

      // 5. Parse Response
      let generatedQuestions = [];
      if (result && result.response) {
        const rawContent = result.response.text();
        console.log("Raw Content length:", rawContent.length, "characters");
        // console.log("Raw Content from AI:", rawContent);

        // Attempt to parse the content as JSON
        try {
          // Sometimes the AI might wrap the JSON in backticks or add intro text
          console.log("Attempting to parse JSON response...");
          const jsonMatch = rawContent.match(/```json\n?([\s\S]*?)```|(\[[\s\S]*\])/);
          let jsonString = rawContent.trim();
          if (jsonMatch) {
            console.log("Found JSON match with regex");
            jsonString = jsonMatch[1] || jsonMatch[2];
          }

          console.log("Parsing JSON string...");
          generatedQuestions = JSON.parse(jsonString);
          console.log("JSON parsed successfully");

          // Basic validation of the parsed structure
          if (!Array.isArray(generatedQuestions)) {
            console.error("Parsed response is not an array:", typeof generatedQuestions);
            throw new Error("Parsed response is not an array.");
          }
          
          console.log("Validating question objects...");
          let validationErrors = [];
          
          generatedQuestions.forEach((q, i) => {
            if (typeof q.questionText !== 'string') {
              validationErrors.push(`Question ${i}: questionText is not a string`);
            }
            if (!Array.isArray(q.options)) {
              validationErrors.push(`Question ${i}: options is not an array`);
            } else if (q.options.length < 2) {
              validationErrors.push(`Question ${i}: options has less than 2 items`);
            }
            if (typeof q.correctAnswerIndex !== 'number') {
              validationErrors.push(`Question ${i}: correctAnswerIndex is not a number`);
            } else if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
              validationErrors.push(`Question ${i}: correctAnswerIndex is out of bounds`);
            }
          });
          
          if (validationErrors.length > 0) {
            console.error("Validation errors:", validationErrors);
            throw new Error("Question objects have invalid structure: " + validationErrors.join("; "));
          }

          console.log("Successfully parsed " + generatedQuestions.length + " questions.");

        } catch (parseError) {
          console.error("Failed to parse AI response JSON:", parseError);
          console.error("First 200 chars of raw content:", rawContent.substring(0, 200));
          return res.status(500).json({ 
            error: 'Failed to parse AI response.', 
            details: parseError.message,
            rawContentPreview: rawContent.substring(0, 100) + "..." 
          });
        }

      } else {
        // Handle cases where the response might be blocked
        console.error('No valid text content received from AI API.', 
                    result ? JSON.stringify(result) : 'No result object');
        
        const blockReason = result?.promptFeedback?.blockReason;
        const safetyRatings = result?.candidates?.[0]?.safetyRatings;
        
        return res.status(500).json({
          error: 'Received no valid text content from AI service.',
          blockReason: blockReason || 'Unknown',
          safetyRatings: safetyRatings || []
        });
      }

      // 6. Send to Frontend
      console.log("Sending " + generatedQuestions.length + " questions to frontend");
      res.status(200).json(generatedQuestions);

    } catch (apiError) {
      console.error('Error calling Gemini API:', apiError);
      console.error('API error details:', JSON.stringify(apiError, null, 2));
      return res.status(500).json({ 
        error: 'Error calling AI service API', 
        details: apiError.message,
        apiErrorDetails: JSON.stringify(apiError)
      });
    }

  } catch (error) {
    // General error handling for API calls or other issues
    console.error('Error generating AI quiz:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate AI quiz.', 
      details: error.message,
      stack: error.stack
    });
  }
});

module.exports = router; 