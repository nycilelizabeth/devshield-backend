// ============================================
// models/TestCase.js — Test Case Model
// ============================================

const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:          { type: String, required: [true, 'Test case title is required'], trim: true },
  description:    { type: String, default: '' },
  steps:          { type: String, default: '' },        // Step-by-step test instructions
  expectedResult: { type: String, default: '' },        // What should happen if test passes
  actualResult:   { type: String, default: '' },        // What actually happened
  status:         { type: String, enum: ['Not Run', 'Pass', 'Fail', 'Skip'], default: 'Not Run' },
  priority:       { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  module:         { type: String, default: 'General' },
  project:        { type: String, default: 'General' },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestCase', testCaseSchema);
