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

    // 1. Input Validation (Basic)
    if (!subject || !examStage) {
      return res.status(400).json({ error: 'Subject and Exam Stage are required.' });
    }
    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI API Key not configured in .env');
        return res.status(500).json({ error: 'AI service configuration error.' });
    }

    // 2. Retrieve Example Questions
    const exampleQuestions = await Question.find({ subject, examStage }).limit(5).lean();
     if (!exampleQuestions || exampleQuestions.length === 0) {
       console.warn(`No example questions found for Subject: ${subject}, Stage: ${examStage}. Proceeding without examples.`);
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
    // console.log("Prompt:", prompt); // Uncomment for debugging

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", 
      safetySettings 
    });

    const generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 2048,
    };

    const result = await model.generateContent(prompt);
    const response = result.response;

    console.log("Received response from Google Gemini API.");

    // 5. Parse Response
    let generatedQuestions = [];
    if (response && response.text) {
      const rawContent = response.text();
      console.log("Raw Content from AI:", rawContent);

      // Attempt to parse the content as JSON
      try {
        // Sometimes the AI might wrap the JSON in backticks or add intro text
        const jsonMatch = rawContent.match(/```json\n?([\s\S]*?)```|(\[[\s\S]*\])/);
        let jsonString = rawContent.trim();
        if (jsonMatch) {
          jsonString = jsonMatch[1] || jsonMatch[2];
        }

        generatedQuestions = JSON.parse(jsonString);

        // Basic validation of the parsed structure
        if (!Array.isArray(generatedQuestions)) {
          throw new Error("Parsed response is not an array.");
        }
        
        generatedQuestions.forEach((q, i) => {
          if (typeof q.questionText !== 'string' || 
              !Array.isArray(q.options) || 
              q.options.length < 2 || 
              typeof q.correctAnswerIndex !== 'number' || 
              q.correctAnswerIndex < 0 || 
              q.correctAnswerIndex >= q.options.length) {
            throw new Error("Question object at index " + i + " has invalid structure or correctAnswerIndex.");
          }
        });

        console.log("Successfully parsed " + generatedQuestions.length + " questions.");

      } catch (parseError) {
        console.error("Failed to parse AI response JSON:", parseError);
        console.error("Raw content received:", rawContent);
        return res.status(500).json({ error: 'Failed to parse AI response. Raw response logged on server.' });
      }

    } else {
      // Handle cases where the response might be blocked
      console.error('No valid text content received from AI API.', 
                   response ? JSON.stringify(response) : 'No response object');
      
      const blockReason = response?.promptFeedback?.blockReason;
      const safetyRatings = response?.candidates?.[0]?.safetyRatings;
      
      return res.status(500).json({
        error: 'Received no valid text content from AI service.',
        blockReason: blockReason || 'Unknown',
        safetyRatings: safetyRatings || []
      });
    }

    // 6. Send to Frontend
    res.status(200).json(generatedQuestions);

  } catch (error) {
    // General error handling for API calls or other issues
    console.error('Error generating AI quiz:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI quiz.', 
      details: error.message 
    });
  }
});

module.exports = router; 