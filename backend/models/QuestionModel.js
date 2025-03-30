const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubOptionSchema = new Schema({
  optionText: {
    type: String,
    default: ''
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
});

const SubQuestionSchema = new Schema({
  subQuestionNumber: {
    type: String,
    default: ''
  },
  subQuestionText: {
    type: String,
    default: ''
  },
  subOptions: [SubOptionSchema]
});

const QuestionSchema = new Schema({
  subject: {
    type: String,
    required: true
  },
  paperType: {
    type: String,
    required: true,
    enum: ['MTP', 'RTP', 'PYQS']
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
  questionNumber: {
    type: String,
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  answerText: {
    type: String
  },
  pageNumber: {
    type: String,
    required: true,
    match: [/^\d+$/, 'Page number must be a valid number']
  },
  subQuestions: [SubQuestionSchema],
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

module.exports = mongoose.model('Question', QuestionSchema);