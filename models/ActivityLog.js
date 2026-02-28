// ============================================
// models/ActivityLog.js — Audit Trail Model
//
// Every important action in the system gets
// recorded here automatically.
// This is required for legal compliance in
// industries like healthcare, banking, etc.
// ============================================

const mongoose = require('mongoose')

const activityLogSchema = new mongoose.Schema({

  // Who did the action
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true  // Store name directly so log is readable even if user is deleted
  },

  // What they did
  action: {
    type: String,
    required: true,
    enum: [
      // Bug actions
      'BUG_CREATED', 'BUG_UPDATED', 'BUG_RESOLVED', 'BUG_DELETED',
      // Test actions
      'TEST_CREATED', 'TEST_PASSED', 'TEST_FAILED', 'TEST_DELETED',
      // Vault actions
      'PASSWORD_SAVED', 'PASSWORD_DELETED', 'PASSWORD_COPIED',
      // Security actions
      'BREACH_CHECKED', 'PHISHING_SCANNED', 'NOTE_CREATED', 'NOTE_DELETED',
      // Auth actions
      'USER_LOGIN', 'USER_REGISTER', 'USER_LOGOUT',
    ]
  },

  // Human readable description
  description: {
    type: String,
    required: true
    // e.g. "Created bug: Login page crashes on wrong password"
  },

  // Extra details (optional)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // e.g. { bugId: '...', severity: 'High', project: 'DevShield' }
  },

  // Severity of the action for filtering
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },

  // IP address of the request (for security audits)
  ipAddress: {
    type: String,
    default: 'unknown'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Index for fast queries — most common use case is getting logs by user + date
activityLogSchema.index({ user: 1, createdAt: -1 })
activityLogSchema.index({ createdAt: -1 })

module.exports = mongoose.model('ActivityLog', activityLogSchema)
