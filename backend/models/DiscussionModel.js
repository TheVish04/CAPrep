const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const DiscussionSchema = new Schema({
  itemType: {
    type: String,
    enum: ['question', 'resource'],
    required: true
  },
  itemId: {
    type: Schema.Types.ObjectId,
    required: true,
    // Dynamic reference based on itemType
    refPath: 'itemModel'
  },
  itemModel: {
    type: String,
    required: true,
    enum: ['Question', 'Resource']
  },
  messages: [MessageSchema],
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
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

// Create indexes for faster queries
DiscussionSchema.index({ itemType: 1, itemId: 1 }, { unique: true });
DiscussionSchema.index({ participants: 1 });

module.exports = mongoose.model('Discussion', DiscussionSchema); 