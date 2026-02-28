// ============================================
// utils/logger.js — Activity Log Helper
//
// Call logActivity() anywhere in your routes
// to record what happened.
//
// Usage:
//   await logActivity(req, 'BUG_CREATED', 'Created bug: Login crashes', { severity:'High' })
// ============================================

const ActivityLog = require('../models/ActivityLog')

const logActivity = async (req, action, description, metadata = {}, severity = 'info') => {
  try {
    await ActivityLog.create({
      user:        req.user._id,
      userName:    req.user.name,
      action,
      description,
      metadata,
      severity,
      ipAddress:   req.ip || req.connection?.remoteAddress || 'unknown'
    })
  } catch (err) {
    // Never let logging failures crash the main request
    console.error('Activity log error:', err.message)
  }
}

module.exports = { logActivity }
