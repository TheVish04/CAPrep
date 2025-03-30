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

// Removed duplicate index - already defined in schema with unique: true

module.exports = mongoose.model('User', UserSchema);