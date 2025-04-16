const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/UserModel');
const Question = require('../models/QuestionModel');
const Resource = require('../models/ResourceModel'); // Import Resource model

// Helper function to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET user's profile including bookmarks (questions and resources)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
                           .select('-password -quizHistory') // Exclude password and potentially large history
                           .populate('bookmarkedQuestions', 'subject questionNumber paperType year month') // Populate needed fields
                           .populate('bookmarkedResources', 'title subject paperType year month fileUrl'); // Populate needed fields
                           
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET user's bookmarked question IDs
router.get('/me/bookmarks/ids', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('bookmarkedQuestions');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ bookmarkedQuestionIds: user.bookmarkedQuestions });
    } catch (error) {
      console.error('Error fetching bookmarked question IDs:', error);
      res.status(500).json({ error: 'Failed to fetch bookmarked question IDs' });
    }
  });

// POST Add a question to bookmarks
router.post('/me/bookmarks/:questionId', authMiddleware, async (req, res) => {
  const { questionId } = req.params;

  if (!isValidObjectId(questionId)) {
    return res.status(400).json({ error: 'Invalid question ID format' });
  }

  try {
    // Check if the question actually exists
    const questionExists = await Question.findById(questionId);
    if (!questionExists) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Add bookmark if it doesn't already exist
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { bookmarkedQuestions: questionId } }, // Use $addToSet to prevent duplicates
      { new: true } // Return the updated document
    ).select('bookmarkedQuestions');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Bookmark added successfully', bookmarkedQuestionIds: user.bookmarkedQuestions });

  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// DELETE Remove a question from bookmarks
router.delete('/me/bookmarks/:questionId', authMiddleware, async (req, res) => {
  const { questionId } = req.params;

  if (!isValidObjectId(questionId)) {
    return res.status(400).json({ error: 'Invalid question ID format' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { bookmarkedQuestions: questionId } },
      { new: true }
    ).select('bookmarkedQuestions');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Bookmark removed successfully', bookmarkedQuestionIds: user.bookmarkedQuestions });

  } catch (error) {
    console.error('Error removing bookmark:', error);
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
        return res.status(400).json({ error: 'Invalid ID format' });
    }
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// --- Resource Bookmarks --- 

// GET user's bookmarked resource IDs
router.get('/me/bookmarks/resources/ids', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('bookmarkedResources');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ bookmarkedResourceIds: user.bookmarkedResources });
    } catch (error) {
      console.error('Error fetching bookmarked resource IDs:', error);
      res.status(500).json({ error: 'Failed to fetch bookmarked resource IDs' });
    }
  });

// POST Add a resource to bookmarks
router.post('/me/bookmarks/resource/:resourceId', authMiddleware, async (req, res) => {
  const { resourceId } = req.params;

  if (!isValidObjectId(resourceId)) {
    return res.status(400).json({ error: 'Invalid resource ID format' });
  }

  try {
    const resourceExists = await Resource.findById(resourceId);
    if (!resourceExists) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { bookmarkedResources: resourceId } },
      { new: true }
    ).select('bookmarkedResources');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Resource bookmark added', bookmarkedResourceIds: user.bookmarkedResources });

  } catch (error) {
    console.error('Error adding resource bookmark:', error);
    res.status(500).json({ error: 'Failed to add resource bookmark' });
  }
});

// DELETE Remove a resource from bookmarks
router.delete('/me/bookmarks/resource/:resourceId', authMiddleware, async (req, res) => {
  const { resourceId } = req.params;

  if (!isValidObjectId(resourceId)) {
    return res.status(400).json({ error: 'Invalid resource ID format' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { bookmarkedResources: resourceId } },
      { new: true }
    ).select('bookmarkedResources');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Resource bookmark removed', bookmarkedResourceIds: user.bookmarkedResources });

  } catch (error) {
    console.error('Error removing resource bookmark:', error);
    res.status(500).json({ error: 'Failed to remove resource bookmark' });
  }
});

// --- Quiz History --- 

// POST Add a quiz result to history
router.post('/me/quiz-history', authMiddleware, async (req, res) => {
    // Destructure expected fields, including the new questionsAttempted array
    const { subject, score, totalQuestions, questionsAttempted, isAiQuiz } = req.body;

    // Basic validation for core fields
    if (typeof subject !== 'string' || subject.trim() === '') {
        return res.status(400).json({ error: 'Subject is required and must be a string.' });
    }
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
        return res.status(400).json({ error: 'Score is required and must be a non-negative integer.' });
    }
    if (typeof totalQuestions !== 'number' || !Number.isInteger(totalQuestions) || totalQuestions <= 0) {
        return res.status(400).json({ error: 'Total questions is required and must be a positive integer.' });
    }
    if (score > totalQuestions) {
        return res.status(400).json({ error: 'Score cannot be greater than total questions.' });
    }

    // Validate questionsAttempted array
    if (!Array.isArray(questionsAttempted)) {
        return res.status(400).json({ error: 'questionsAttempted must be an array.' });
    }
    
    try {
        // Calculate percentage server-side for consistency
        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
        
        const newHistoryEntry = {
            subject,
            score,
            totalQuestions,
            percentage,
            questionsAttempted, // Include the detailed attempts
            date: new Date(),
            isAiQuiz: isAiQuiz || false // Track if this was an AI-generated quiz
        };

        // Add the new entry
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                $push: {
                    quizHistory: {
                        $each: [newHistoryEntry],
                        $position: 0 // Add to the beginning
                        // $slice: -50 // Optional: Keep only the latest 50 entries
                    }
                }
            },
            { new: true }
        ).select('quizHistory'); // Select only history to return confirmation

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return only the newly added entry for confirmation, or the whole history
        res.status(201).json(user.quizHistory[0]); // Return the entry just added

    } catch (error) {
        console.error('Error saving quiz history:', error);
        console.error('Error details:', error.stack);
        res.status(500).json({ 
            error: 'Failed to save quiz history',
            details: error.message 
        });
    }
});

// GET User's Quiz History
router.get('/me/quiz-history', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('quizHistory');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // The history is already sorted newest first due to $position: 0 on push
        res.json(user.quizHistory || []);

    } catch (error) {
        console.error('Error fetching quiz history:', error);
        res.status(500).json({ error: 'Failed to fetch quiz history' });
    }
});

// --- Profile Management ---

// PUT Update user profile
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const { fullName } = req.body;
        
        // Validate input
        if (fullName && (typeof fullName !== 'string' || fullName.trim() === '')) {
            return res.status(400).json({ error: 'Full name must be a non-empty string' });
        }
        
        // Find user and update
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { fullName: fullName.trim() } },
            { new: true }
        ).select('-password -quizHistory');
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// POST Upload profile picture
router.post('/me/profile-image', authMiddleware, async (req, res) => {
    try {
        // This would typically use multer middleware and cloudinary for image upload
        // For this implementation, we'll assume the image URL is sent directly
        const { profilePicture } = req.body;
        
        if (!profilePicture) {
            return res.status(400).json({ error: 'Profile picture URL is required' });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { profilePicture } },
            { new: true }
        ).select('-password -quizHistory');
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({ error: 'Failed to update profile picture' });
    }
});

// DELETE User account
router.delete('/me', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ error: 'Password is required to delete account' });
        }
        
        // Find user with password
        const user = await User.findById(req.user.id).select('+password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify password (this would typically use bcrypt.compare)
        // For this implementation, we'll assume password verification
        // const isMatch = await bcrypt.compare(password, user.password);
        const isMatch = password === user.password; // Simplified for demo
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        // Delete user
        await User.findByIdAndDelete(req.user.id);
        
        res.json({ message: 'Account successfully deleted' });
    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

module.exports = router;