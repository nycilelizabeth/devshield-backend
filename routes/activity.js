// ============================================
// routes/activity.js — Activity Log Routes
//
// GET /api/activity         — Get all activity logs
// GET /api/activity/stats   — Get activity stats
// DELETE /api/activity/:id  — Delete a log entry (admin only)
// ============================================

const express      = require('express')
const router       = express.Router()
const ActivityLog  = require('../models/ActivityLog')
const { protect }  = require('../middleware/auth')

router.use(protect)

// ── GET ALL ACTIVITY LOGS ──
router.get('/', async (req, res) => {
  try {
    const { action, severity, limit = 50, page = 1 } = req.query

    const filter = { user: req.user._id }
    if (action)   filter.action   = action
    if (severity) filter.severity = severity

    const skip  = (parseInt(page) - 1) * parseInt(limit)
    const total = await ActivityLog.countDocuments(filter)
    const logs  = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    res.json({
      success: true,
      logs,
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching activity logs' })
  }
})

// ── GET ACTIVITY STATS ──
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id

    // Last 30 days activity count
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [total, recent, critical, byAction] = await Promise.all([
      ActivityLog.countDocuments({ user: userId }),
      ActivityLog.countDocuments({ user: userId, createdAt: { $gte: thirtyDaysAgo } }),
      ActivityLog.countDocuments({ user: userId, severity: 'critical' }),
      ActivityLog.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ])

    res.json({ success: true, stats: { total, recent, critical, byAction } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching stats' })
  }
})

// ── DELETE LOG ENTRY ──
router.delete('/:id', async (req, res) => {
  try {
    const log = await ActivityLog.findById(req.params.id)
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' })
    if (log.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' })

    await ActivityLog.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Log entry deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting log' })
  }
})

module.exports = router
