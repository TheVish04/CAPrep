const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const Resource = require('../models/ResourceModel');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCache } = require('../middleware/cacheMiddleware');
const User = require('../models/UserModel');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/resources');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename to prevent conflicts
    const uniqueFilename = `${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueFilename);
  }
});

// File filter to ensure only PDF files are uploaded
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // Limit to 15MB
});

// GET all resources with optional filtering
router.get('/', [authMiddleware, cacheMiddleware(300)], async (req, res) => {
  try {
    const { subject, paperType, examStage, year, month, paperNo, search, bookmarked } = req.query;
    const filters = {};
    
    // Apply standard filters
    if (subject) filters.subject = subject;
    if (paperType) filters.paperType = paperType;
    if (examStage) filters.examStage = examStage;
    if (year) filters.year = year;
    if (month) filters.month = month;
    if (paperNo) filters.paperNo = paperNo;
    
    // Text search
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Bookmark filter
    if (bookmarked === 'true') {
        const user = await User.findById(req.user.id).select('bookmarkedResources');
        if (!user) {
            return res.status(404).json({ error: 'User not found for bookmark filtering' });
        }
        // Ensure user.bookmarkedResources is an array, even if empty
        const bookmarkedIds = user.bookmarkedResources || []; 
        // If filtering by bookmarks, the resource _id must be in the user's list
        filters._id = { $in: bookmarkedIds }; 
    }
    
    const resources = await Resource.find(filters).sort({ createdAt: -1 });
    
    res.status(200).json(resources);
  } catch (error) {
    if (typeof logger !== 'undefined' && logger.error) {
         logger.error(`Error retrieving resources: ${error.message}`);
    } else {
        console.error(`Error retrieving resources: ${error.message}`);
    }
    res.status(500).json({ error: 'Failed to retrieve resources' });
  }
});

// GET a single resource by ID
router.get('/:id', [authMiddleware, cacheMiddleware(3600)], async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.status(200).json(resource);
  } catch (error) {
    logger.error(`Error retrieving resource: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve resource' });
  }
});

// POST - Create a new resource (admin only)
router.post('/', authMiddleware, adminMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    // Create file URL (relative path)
    const fileUrl = `/uploads/resources/${req.file.filename}`;
    
    // Create new resource
    const resource = new Resource({
      title: req.body.title,
      description: req.body.description,
      subject: req.body.subject,
      paperType: req.body.paperType,
      year: req.body.year,
      month: req.body.month,
      examStage: req.body.examStage,
      paperNo: req.body.paperNo,
      fileUrl: fileUrl,
      fileType: 'pdf',
      fileSize: req.file.size
    });
    
    await resource.save();
    clearCache('/api/resources');
    res.status(201).json(resource);
  } catch (error) {
    // Delete uploaded file if there was an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    logger.error(`Error creating resource: ${error.message}`);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// PUT - Update a resource (admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allowedUpdates = [
      'title', 'description', 'subject', 'paperType', 
      'year', 'month', 'examStage', 'paperNo'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    clearCache([`/api/resources/${req.params.id}`, '/api/resources']);
    res.status(200).json(resource);
  } catch (error) {
    logger.error(`Error updating resource: ${error.message}`);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// DELETE - Remove a resource (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Delete the file from storage
    const filePath = path.join(__dirname, '..', resource.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete the resource from database
    await Resource.findByIdAndDelete(req.params.id);
    clearCache([`/api/resources/${req.params.id}`, '/api/resources']);
    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting resource: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// POST - Increment download count
router.post('/:id/download', authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.status(200).json({ downloadCount: resource.downloadCount });
  } catch (error) {
    // Use logger if available
    if (typeof logger !== 'undefined' && logger.error) {
      logger.error(`Error incrementing download count: ${error.message}`);
    } else {
      console.error(`Error incrementing download count: ${error.message}`);
    }
    res.status(500).json({ error: 'Failed to increment download count' });
  }
});

module.exports = router;