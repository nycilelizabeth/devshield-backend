// ============================================
// models/Password.js — Password Vault Model
// ============================================

const mongoose = require('mongoose');

const passwordSchema = new mongoose.Schema({

  // Which user owns this password
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  service: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true
  },

  username: {
    type: String,
    required: [true, 'Username or email is required'],
    trim: true
  },

  // This stores the AES-256 ENCRYPTED password
  // Never stored as plain text
  encryptedPassword: {
    type: String,
    required: true
  },

  // Strength score 0-6 (calculated on frontend)
  strength: {
    type: Number,
    min: 0,
    max: 6,
    default: 0
  },

  project: {
    type: String,
    default: 'General'
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Password', passwordSchema);
