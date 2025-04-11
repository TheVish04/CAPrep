const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/UserModel');
const Question = require('../models/QuestionModel');
const Resource = require('../models/ResourceModel');
const Discussion = require('../models/DiscussionModel');
const Announcement = require('../models/AnnouncementModel');

// Get all dashboard data in a single request
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data with selected fields
    let user;
    try {
      user = await User.findById(userId)
        .select('quizHistory bookmarkedQuestions bookmarkedResources studyHours recentlyViewedQuestions recentlyViewedResources subjectStrengths resourceEngagement')
        .populate({
          path: 'recentlyViewedQuestions.questionId',
          select: 'text subject difficulty subQuestions'
        })
        .populate({
          path: 'recentlyViewedResources.resourceId',
          select: 'title description subject resourceType'
        });

      // Handle potential issues with populating bookmarked resources
      try {
        await User.populate(user, {
          path: 'bookmarkedQuestions',
          select: 'text subject difficulty'
        });
      } catch (populateError) {
        console.error('Error populating bookmarked questions:', populateError);
        // Ensure this field exists even if population fails
        user.bookmarkedQuestions = [];
      }

      try {
        await User.populate(user, {
          path: 'bookmarkedResources',
          select: 'title description subject resourceType'
        });
      } catch (populateError) {
        console.error('Error populating bookmarked resources:', populateError);
        // Ensure this field exists even if population fails
        user.bookmarkedResources = [];
      }
    } catch (userError) {
      console.error('Error fetching user data:', userError);
      return res.status(404).json({ success: false, message: 'User not found or data error' });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get announcements
    const announcements = await Announcement.find({
      validUntil: { $gte: new Date() }
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(5);
    
    // Get new resources added in last 14 days
    const newResources = await Resource.find({
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title description subject resourceType createdAt');
    
    // Format quiz history for trend analysis
    const quizScoreTrends = {};
    if (user.quizHistory && user.quizHistory.length > 0) {
      // Group by subject
      user.quizHistory.forEach(quiz => {
        if (!quizScoreTrends[quiz.subject]) {
          quizScoreTrends[quiz.subject] = [];
        }
        quizScoreTrends[quiz.subject].push({
          date: quiz.date,
          score: quiz.percentage
        });
      });
      
      // Sort each subject's scores by date
      Object.keys(quizScoreTrends).forEach(subject => {
        quizScoreTrends[subject].sort((a, b) => new Date(a.date) - new Date(b.date));
      });
    }
    
    // Format study hours for weekly/monthly tracking
    const studyHoursSummary = {
      daily: [],
      weekly: {},
      monthly: {},
      bySubject: {}
    };
    
    if (user.studyHours && user.studyHours.length > 0) {
      const today = new Date();
      const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const filteredHours = user.studyHours.filter(entry => 
        new Date(entry.date) >= last30Days
      );
      
      // Daily tracking for last 30 days
      filteredHours.forEach(entry => {
        const date = new Date(entry.date);
        const dateStr = date.toISOString().split('T')[0];
        
        // Add to daily tracking
        const existingDayIndex = studyHoursSummary.daily.findIndex(d => d.date === dateStr);
        if (existingDayIndex >= 0) {
          studyHoursSummary.daily[existingDayIndex].hours += entry.hours;
        } else {
          studyHoursSummary.daily.push({ date: dateStr, hours: entry.hours });
        }
        
        // Weekly tracking
        const weekNumber = getWeekNumber(date);
        const weekKey = `${date.getFullYear()}-W${weekNumber}`;
        studyHoursSummary.weekly[weekKey] = (studyHoursSummary.weekly[weekKey] || 0) + entry.hours;
        
        // Monthly tracking
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        studyHoursSummary.monthly[monthKey] = (studyHoursSummary.monthly[monthKey] || 0) + entry.hours;
        
        // By subject tracking
        if (entry.subject) {
          if (!studyHoursSummary.bySubject[entry.subject]) {
            studyHoursSummary.bySubject[entry.subject] = 0;
          }
          studyHoursSummary.bySubject[entry.subject] += entry.hours;
        }
      });
      
      // Sort daily data by date
      studyHoursSummary.daily.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    // Format resource usage statistics
    const resourceStats = {
      mostUsed: [],
      timeSpentByType: {},
      totalTimeSpent: 0
    };
    
    if (user.resourceEngagement && user.resourceEngagement.length > 0) {
      // Calculate total time spent
      resourceStats.totalTimeSpent = user.resourceEngagement.reduce(
        (total, resource) => total + resource.timeSpent, 0
      );
      
      // Get most used resources (by access count)
      const sortedByUsage = [...user.resourceEngagement]
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 5);
      
      // Populate resource details for most used
      const resourceIds = sortedByUsage.map(item => item.resourceId);
      const resources = await Resource.find({
        _id: { $in: resourceIds }
      }).select('title resourceType subject');
      
      // Combine usage data with resource details
      sortedByUsage.forEach(usage => {
        const resourceDetails = resources.find(r => r._id.toString() === usage.resourceId.toString());
        if (resourceDetails) {
          resourceStats.mostUsed.push({
            ...usage._doc,
            title: resourceDetails.title,
            resourceType: resourceDetails.resourceType,
            subject: resourceDetails.subject
          });
          
          // Add to time spent by type
          const type = resourceDetails.resourceType;
          resourceStats.timeSpentByType[type] = (resourceStats.timeSpentByType[type] || 0) + usage.timeSpent;
        }
      });
    }
    
    // Prepare the dashboard response
    const dashboardData = {
      quizScoreTrends: user.quizHistory ? formatQuizScoreTrends(user.quizHistory) : {},
      studyHoursSummary: user.studyHours ? formatStudyHours(user.studyHours) : { daily: [], weekly: {}, monthly: {}, bySubject: {} },
      recentlyViewedQuestions: user.recentlyViewedQuestions || [],
      recentlyViewedResources: user.recentlyViewedResources || [],
      bookmarkedContent: {
        questions: user.bookmarkedQuestions || [],
        resources: user.bookmarkedResources || []
      },
      subjectStrengths: user.subjectStrengths || [],
      announcements: announcements || [],
      newResources: newResources || [],
      resourceStats: formatResourceStats(user.resourceEngagement)
    };
    
    res.status(200).json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving dashboard data', error: error.message });
  }
});

// Track study session (for Pomodoro timer)
router.post('/study-session', authMiddleware, async (req, res) => {
  try {
    const { hours, subject, date } = req.body;
    const userId = req.user.id;
    
    if (!hours || hours <= 0) {
      return res.status(400).json({ success: false, message: 'Study hours must be greater than 0' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Create study hour entry
    const studyEntry = {
      hours: Number(hours),
      date: date ? new Date(date) : new Date(),
      subject: subject || null
    };
    
    // Add to user's study hours
    if (!user.studyHours) {
      user.studyHours = [];
    }
    user.studyHours.push(studyEntry);
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Study session tracked successfully',
      data: studyEntry
    });
  } catch (error) {
    console.error('Study session tracking error:', error);
    res.status(500).json({ success: false, message: 'Error tracking study session', error: error.message });
  }
});

// Track resource engagement
router.post('/resource-engagement', authMiddleware, async (req, res) => {
  try {
    const { resourceId, timeSpent } = req.body;
    const userId = req.user.id;
    
    if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ success: false, message: 'Valid resource ID is required' });
    }
    
    if (!timeSpent || timeSpent < 0) {
      return res.status(400).json({ success: false, message: 'Valid time spent is required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if resource exists
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    // Initialize resourceEngagement array if it doesn't exist
    if (!user.resourceEngagement) {
      user.resourceEngagement = [];
    }
    
    // Find if this resource is already being tracked
    const existingIndex = user.resourceEngagement.findIndex(
      item => item.resourceId.toString() === resourceId
    );
    
    if (existingIndex >= 0) {
      // Update existing engagement
      user.resourceEngagement[existingIndex].timeSpent += Number(timeSpent);
      user.resourceEngagement[existingIndex].accessCount += 1;
      user.resourceEngagement[existingIndex].lastAccessed = new Date();
    } else {
      // Add new resource engagement
      user.resourceEngagement.push({
        resourceId,
        timeSpent: Number(timeSpent),
        lastAccessed: new Date(),
        accessCount: 1
      });
    }
    
    // Add to beginning of recently viewed
    user.recentlyViewedResources.unshift({
      resourceId,
      viewedAt: new Date()
    });
    
    // Limit to 10 recent resources
    if (user.recentlyViewedResources.length > 10) {
      user.recentlyViewedResources = user.recentlyViewedResources.slice(0, 10);
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Resource engagement tracked successfully'
    });
  } catch (error) {
    console.error('Resource engagement tracking error:', error);
    res.status(500).json({ success: false, message: 'Error tracking resource engagement', error: error.message });
  }
});

// Track question view
router.post('/question-view', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.user.id;
    
    if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ success: false, message: 'Valid question ID is required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    // Initialize recentlyViewedQuestions array if it doesn't exist
    if (!user.recentlyViewedQuestions) {
      user.recentlyViewedQuestions = [];
    }
    
    // Remove if already in recently viewed
    const recentIndex = user.recentlyViewedQuestions.findIndex(
      item => item.questionId.toString() === questionId
    );
    
    if (recentIndex >= 0) {
      user.recentlyViewedQuestions.splice(recentIndex, 1);
    }
    
    // Add to beginning of recently viewed
    user.recentlyViewedQuestions.unshift({
      questionId,
      viewedAt: new Date()
    });
    
    // Limit to 10 recent questions
    if (user.recentlyViewedQuestions.length > 10) {
      user.recentlyViewedQuestions = user.recentlyViewedQuestions.slice(0, 10);
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Question view tracked successfully'
    });
  } catch (error) {
    console.error('Question view tracking error:', error);
    res.status(500).json({ success: false, message: 'Error tracking question view', error: error.message });
  }
});

// Get active announcements
router.get('/announcements', authMiddleware, async (req, res) => {
  try {
    const announcements = await Announcement.find({
      validUntil: { $gte: new Date() }
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(req.query.limit ? parseInt(req.query.limit) : 10)
    .populate('createdBy', 'fullName');
    
    res.status(200).json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Announcements retrieval error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving announcements', error: error.message });
  }
});

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper function to format quiz score trends
function formatQuizScoreTrends(quizHistory) {
  const quizScoreTrends = {};
  if (quizHistory && quizHistory.length > 0) {
    // Group by subject
    quizHistory.forEach(quiz => {
      if (!quizScoreTrends[quiz.subject]) {
        quizScoreTrends[quiz.subject] = [];
      }
      quizScoreTrends[quiz.subject].push({
        date: quiz.date,
        score: quiz.percentage
      });
    });
    
    // Sort each subject's scores by date
    Object.keys(quizScoreTrends).forEach(subject => {
      quizScoreTrends[subject].sort((a, b) => new Date(a.date) - new Date(b.date));
    });
  }
  return quizScoreTrends;
}

// Helper function to format study hours
function formatStudyHours(studyHours) {
  const studyHoursSummary = {
    daily: [],
    weekly: {},
    monthly: {},
    bySubject: {}
  };
  
  if (studyHours && studyHours.length > 0) {
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const filteredHours = studyHours.filter(entry => 
      new Date(entry.date) >= last30Days
    );
    
    // Daily tracking for last 30 days
    filteredHours.forEach(entry => {
      const date = new Date(entry.date);
      const dateStr = date.toISOString().split('T')[0];
      
      // Add to daily tracking
      const existingDayIndex = studyHoursSummary.daily.findIndex(d => d.date === dateStr);
      if (existingDayIndex >= 0) {
        studyHoursSummary.daily[existingDayIndex].hours += entry.hours;
      } else {
        studyHoursSummary.daily.push({ date: dateStr, hours: entry.hours });
      }
      
      // Weekly tracking
      const weekNumber = getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${weekNumber}`;
      studyHoursSummary.weekly[weekKey] = (studyHoursSummary.weekly[weekKey] || 0) + entry.hours;
      
      // Monthly tracking
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      studyHoursSummary.monthly[monthKey] = (studyHoursSummary.monthly[monthKey] || 0) + entry.hours;
      
      // By subject tracking
      if (entry.subject) {
        if (!studyHoursSummary.bySubject[entry.subject]) {
          studyHoursSummary.bySubject[entry.subject] = 0;
        }
        studyHoursSummary.bySubject[entry.subject] += entry.hours;
      }
    });
    
    // Sort daily data by date
    studyHoursSummary.daily.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  
  return studyHoursSummary;
}

// Helper function to format resource stats
function formatResourceStats(resourceEngagement) {
  const resourceStats = {
    mostUsed: [],
    timeSpentByType: {},
    totalTimeSpent: 0
  };
  
  if (resourceEngagement && resourceEngagement.length > 0) {
    // Calculate total time spent
    resourceStats.totalTimeSpent = resourceEngagement.reduce(
      (total, resource) => total + (resource.timeSpent || 0), 0
    );
  }
  
  return resourceStats;
}

module.exports = router; 