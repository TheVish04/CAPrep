const express = require('express');
const router = express.Router();
const Discussion = require('../models/DiscussionModel');
const { authMiddleware } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Get discussion for a specific item
router.get('/:itemType/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    
    // Validate itemType
    if (!['question', 'resource'].includes(itemType)) {
      return res.status(400).json({ error: 'Invalid item type' });
    }
    
    // Validate itemId
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    
    const itemModel = itemType === 'question' ? 'Question' : 'Resource';
    
    // Find existing discussion or create new one
    let discussion = await Discussion.findOne({ 
      itemType, 
      itemId 
    }).populate({
      path: 'messages.userId',
      select: 'name email'
    });
    
    if (!discussion) {
      // Create a new discussion
      discussion = await Discussion.create({
        itemType,
        itemId,
        itemModel,
        messages: [],
        participants: [req.user._id]
      });
      
      // Immediately populate the user info for the new discussion
      discussion = await Discussion.findById(discussion._id).populate({
        path: 'messages.userId',
        select: 'name email'
      });
    }
    
    res.json(discussion);
  } catch (error) {
    console.error('Error fetching discussion:', error);
    res.status(500).json({ error: 'Failed to fetch discussion' });
  }
});

// Add message to discussion
router.post('/:itemType/:itemId/message', authMiddleware, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { content } = req.body;
    
    // Validate input
    if (!['question', 'resource'].includes(itemType)) {
      return res.status(400).json({ error: 'Invalid item type' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }
    
    const itemModel = itemType === 'question' ? 'Question' : 'Resource';
    
    // Find or create the discussion
    let discussion = await Discussion.findOne({ itemType, itemId });
    
    if (!discussion) {
      discussion = await Discussion.create({
        itemType,
        itemId,
        itemModel,
        messages: [],
        participants: [req.user._id]
      });
    }
    
    // Add message to discussion
    const newMessage = {
      userId: req.user._id,
      content: content.trim()
    };
    
    discussion.messages.push(newMessage);
    
    // Add user to participants if not already there
    if (!discussion.participants.includes(req.user._id)) {
      discussion.participants.push(req.user._id);
    }
    
    await discussion.save();
    
    // Return the updated discussion with populated user info
    const updatedDiscussion = await Discussion.findById(discussion._id)
      .populate({
        path: 'messages.userId',
        select: 'name email'
      });
    
    res.json(updatedDiscussion);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Get all discussions for a user (for notification/activity purposes)
router.get('/user/me', authMiddleware, async (req, res) => {
  try {
    const discussions = await Discussion.find({
      participants: req.user._id
    })
    .select('itemType itemId updatedAt messages')
    .sort('-updatedAt')
    .limit(10);
    
    res.json(discussions);
  } catch (error) {
    console.error('Error fetching user discussions:', error);
    res.status(500).json({ error: 'Failed to fetch discussions' });
  }
});

module.exports = router; 