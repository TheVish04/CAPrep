const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResourceSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  paperType: {
    type: String,
    required: true,
    enum: ['MTP', 'RTP', 'PYQS', 'Other', 'Model TP']
  },
  year: {
    type: String,
    required: true
  },
  month: {
    type: String,
    required: true,
    enum: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
  },
  examStage: {
    type: String,
    required: true,
    enum: ['Foundation', 'Intermediate', 'Final']
  },
  paperNo: {
    type: String
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    default: 'pdf'
  },
  fileSize: {
    type: Number
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add compound index for common filter fields
ResourceSchema.index({ 
  examStage: 1, 
  subject: 1, 
  paperType: 1, 
  year: 1, 
  month: 1, 
  paperNo: 1 
});

// Add text index for searching title only
ResourceSchema.index({ title: 'text' });

// Add index for sorting by creation date
ResourceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Resource', ResourceSchema); 