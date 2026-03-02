// models/TestCase.js — Test Case Model with Team Support
const mongoose = require('mongoose')

const testCaseSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team:           { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  assignedTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  title:          { type: String, required: [true, 'Test case title is required'], trim: true },
  description:    { type: String, default: '' },
  steps:          { type: String, default: '' },
  expectedResult: { type: String, default: '' },
  actualResult:   { type: String, default: '' },
  status:         { type: String, enum: ['Not Run', 'Pass', 'Fail', 'Skip'], default: 'Not Run' },
  priority:       { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  module:         { type: String, default: 'General' },
  project:        { type: String, default: 'General' },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now }
})

module.exports = mongoose.model('TestCase', testCaseSchema)