const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    match: [/^[A-Za-z ]+$/i, 'Full name can only contain letters and spaces'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    // We don't use match on password as we store the hash
    // Password strength is enforced in the routes
  },
  role: {
    type: String,
    required: true,
    default: 'user',
    enum: ['user', 'admin']
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  bookmarkedQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  quizHistory: [{
    subject: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true }, // Store percentage for easier display
    date: { type: Date, default: Date.now },
    questionsAttempted: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
        subQuestionIndex: { type: Number, required: true, default: 0 }, // Assuming one subquestion for now
        selectedOptionIndex: { type: Number, required: false }, // User might not select an option
        correctOptionIndex: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true }
      }
    ]
  }],
  bookmarkedResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  totalContribution: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Removed duplicate index - already defined in schema with unique: true

module.exports = mongoose.model('User', UserSchema);