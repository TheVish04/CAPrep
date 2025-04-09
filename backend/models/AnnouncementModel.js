const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnnouncementSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required'],
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['system', 'syllabus', 'exam', 'general', 'feature'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetSubjects: [{
    type: String
  }],
  validUntil: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Announcement', AnnouncementSchema); 