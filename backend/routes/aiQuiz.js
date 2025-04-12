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
    // Get the total count of available questions first
    const totalQuestions = await Question.countDocuments({ subject, examStage });
    
    // Random sampling logic for example questions
    let exampleQuestions = [];
    if (totalQuestions > 0) {
      // Determine how many examples to use (up to 20)
      const sampleSize = Math.min(totalQuestions, 20);
      console.log(`Found ${totalQuestions} total questions, will sample ${sampleSize} random questions for AI context.`);
      
      // Use MongoDB's aggregate with $sample for truly random selection
      exampleQuestions = await Question.aggregate([
        { $match: { subject, examStage } },
        { $sample: { size: sampleSize } }
      ]);
    }
    
    if (!exampleQuestions || exampleQuestions.length === 0) {
      console.warn(`No example questions found for Subject: ${subject}, Stage: ${examStage}. Proceeding without examples.`);
    } else {
      console.log(`Using ${exampleQuestions.length} random example questions for AI prompt context.`);
    }

    // 3. Construct Prompt using simple string concatenation
    let prompt = "You are an expert CA exam question generator with deep knowledge of Chartered Accountancy in India. Generate " + count + 
                 " new, unique, high-quality multiple-choice questions suitable for the CA " + examStage + 
                 " level, specifically for the subject \"" + subject + "\".\n\n" +
                 "For each question:\n" +
                 "1. Ensure questions are clear, unambiguous, and test conceptual understanding\n" +
                 "2. Include 4 options with only one correct answer\n" +
                 "3. Make incorrect options plausible but clearly wrong to a knowledgeable student\n" +
                 "4. Provide a detailed explanation for the correct answer that explains both why it is correct and why other options are incorrect\n" +
                 "5. Aim for a mix of difficulty levels from straightforward to challenging\n" +
                 "6. Ensure questions are relevant to the latest CA curriculum and reflect current accounting standards and practices\n\n";

    if (exampleQuestions.length > 0) {
      prompt += "Here are some examples of existing questions to understand the style and format:\n\n";
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
              "\"options\" (array of 4 strings), \"correctAnswerIndex\" (integer from 0 to 3 " +
              "indicating the index of the correct option in the 'options' array), and " +
              "\"explanation\" (string containing a detailed explanation of why the correct answer is right and why the others are wrong). " +
              "Do not include any introductory text, explanations, or markdown formatting like ```json outside " +
              "the JSON array itself. Only output the valid JSON array.";

    // 4. Call Google Gemini API
    console.log("Sending prompt to Google Gemini API...");
    console.log("Prompt length:", prompt.length, "characters");
    // console.log("Prompt:", prompt); // Uncomment for debugging

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", 
        safetySettings 
      });
      
      console.log("Using model: gemini-2.0-flash");

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
            if (typeof q.explanation !== 'string' || !q.explanation) {
              validationErrors.push(`Question ${i}: missing or invalid explanation`);
            }
          });
          
          // Additional quality validation
          let qualityErrors = [];
          generatedQuestions.forEach((q, i) => {
            // Check for minimum question length (at least 20 characters)
            if (q.questionText.length < 20) {
              qualityErrors.push(`Question ${i}: questionText is too short`);
            }
            
            // Check for minimum explanation length (at least 50 characters)
            if (q.explanation && q.explanation.length < 50) {
              qualityErrors.push(`Question ${i}: explanation is too brief`);
            }
            
            // Check that all options are unique
            const uniqueOptions = new Set(q.options);
            if (uniqueOptions.size !== q.options.length) {
              qualityErrors.push(`Question ${i}: contains duplicate options`);
            }
          });
          
          if (validationErrors.length > 0) {
            console.error("Validation errors:", validationErrors);
            throw new Error("Question objects have invalid structure: " + validationErrors.join("; "));
          }
          
          if (qualityErrors.length > 0) {
            console.warn("Quality issues with generated questions:", qualityErrors);
            // We don't throw an error for quality issues, just log warnings
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

// POST /api/ai-quiz/ask - Answer CA-related questions using AI
router.post('/ask', async (req, res) => {
  try {
    const { question, examStage, subject, conversationHistory = [] } = req.body;
    
    console.log('AI Bot Question Request:', { question, examStage, subject, historyLength: conversationHistory.length });

    // Input Validation
    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI API Key not configured in .env');
      return res.status(500).json({ error: 'AI service configuration error.' });
    }

    // Build context based on provided parameters
    let contextDetails = '';
    if (examStage && subject) {
      contextDetails = `for ${examStage} level students studying ${subject}`;
    } else if (examStage) {
      contextDetails = `for ${examStage} level students`;
    } else if (subject) {
      contextDetails = `about the subject ${subject}`;
    }

    // System instructions for the chatbot
    const systemPrompt = `You are an expert Chartered Accountancy assistant with deep knowledge of CA curriculum in India. 
    You specialize in providing helpful, accurate, and educational responses to questions related to Chartered Accountancy ${contextDetails}.
    
    In your responses:
    1. Be accurate and reflect the latest CA curriculum and accounting standards
    2. Be educational and helpful for CA students
    3. Include relevant examples or explanations when appropriate
    4. Cite relevant accounting standards or legal provisions where applicable
    5. Be concise yet comprehensive
    ${examStage && subject ? `6. Specifically tailor your answers for ${examStage} level and the subject ${subject}` : ''}
    
    IMPORTANT: Do not use markdown formatting (like asterisks for emphasis) in your response. Use plain text only without any special formatting characters like *, _, \`, or #.`;

    try {
      // Initialize the model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", 
        safetySettings 
      });
      
      const generationConfig = {
        temperature: 0.3, // Lower temperature for more factual responses
        maxOutputTokens: 4096,
      };
      
      console.log("Setting up chat with Gemini...");
      
      // Convert conversation history to Gemini's chat format
      const chatHistory = [];
      
      // Add system prompt as first message if there's no history yet
      if (conversationHistory.length === 0) {
        chatHistory.push({
          role: "user",
          parts: [{ text: "System instructions: " + systemPrompt }]
        });
        
        chatHistory.push({
          role: "model",
          parts: [{ text: "I understand. I'll act as a Chartered Accountancy expert assistant, following all the guidelines you've provided." }]
        });
      } else {
        // Convert existing chat history to Gemini's format
        conversationHistory.forEach(msg => {
          chatHistory.push({
            role: msg.type === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        });
      }
      
      // Create a chat session with history
      const chat = model.startChat({
        history: chatHistory,
        generationConfig
      });
      
      console.log("Sending message to Gemini chat...");
      const result = await chat.sendMessage(question);
      console.log("Received response from Gemini chat API.");

      if (result && result.response) {
        const answer = result.response.text();
        console.log("Answer length:", answer.length, "characters");
        
        res.json({ answer });
      } else {
        throw new Error("Empty or invalid response from AI service");
      }
    } catch (aiError) {
      console.error("Error calling Gemini AI chat:", aiError);
      res.status(500).json({ error: 'Failed to generate answer', details: aiError.message });
    }
  } catch (error) {
    console.error('Error handling CA question:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router; 