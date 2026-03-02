// ============================================
// models/Bug.js — Bug Tracker Model
// ============================================

const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: [true, 'Bug title is required'], trim: true },
  description: { type: String, default: '' },
  severity:    { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status:      { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  project:     { type: String, default: 'General' },
  screenshot: {
  url:      { type: String, default: null },
  publicId: { type: String, default: null },
},
  module:      { type: String, default: '' },
  steps:       { type: String, default: '' },  // Steps to reproduce
  environment: { type: String, default: '' },  // Browser / OS
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bug', bugSchema);
