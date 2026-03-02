// routes/bugs.js — Bug Tracker + Screenshot Upload
const express              = require('express')
const router               = express.Router()
const Bug                  = require('../models/Bug')
const { protect }          = require('../middleware/auth')
const { logActivity }      = require('../utils/logger')
const { sendEmail }        = require('../utils/mailer')
const { upload, cloudinary } = require('../utils/cloudinary')

router.use(protect)

// GET all bugs
router.get('/', async (req, res) => {
  try {
    const filter = { user: req.user._id }
    if (req.query.status)   filter.status   = req.query.status
    if (req.query.severity) filter.severity = req.query.severity
    if (req.query.project)  filter.project  = req.query.project
    const bugs = await Bug.find(filter).sort({ createdAt: -1 })
    res.json({ success: true, bugs, total: bugs.length })
  } catch (e) { res.status(500).json({ success: false, message: 'Error fetching bugs' }) }
})

// POST — create bug with optional screenshot
// multer (upload.single) must run BEFORE we read req.body
router.post('/', upload.single('screenshot'), async (req, res) => {
  try {
    const body = req.body || {}
    const { title, description, severity, project, module, steps, environment } = body

    if (!title) return res.status(400).json({ success: false, message: 'Bug title is required' })

    // Handle screenshot if uploaded
    let screenshot = { url: null, publicId: null }
    if (req.file) {
      screenshot = { url: req.file.path, publicId: req.file.filename }
    }

    const bug = await Bug.create({
      user: req.user._id,
      title, description, severity, project, module, steps, environment,
      screenshot
    })

    await logActivity(req, 'BUG_CREATED', `Created bug: "${title}"`,
      { bugId: bug._id, severity, project, hasScreenshot: !!req.file },
      severity === 'High' ? 'critical' : 'info')

    // Email alert for High severity
    if (severity === 'High') {
      sendEmail({
        to: req.user.email,
        subject: `🚨 High Severity Bug — ${title}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#1e293b,#7f1d1d);padding:30px;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;font-size:22px;">🛡 DevShield Alert</h1>
              <p style="color:#fca5a5;margin:8px 0 0;">High Severity Bug Reported</p>
            </div>
            <div style="background:#fff8f8;border:2px solid #fca5a5;border-radius:0 0 12px 12px;padding:30px;">
              <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:20px;">
                <p style="color:#dc2626;font-weight:bold;margin:0 0 4px;">🚨 HIGH SEVERITY BUG</p>
                <p style="color:#7f1d1d;font-size:18px;font-weight:bold;margin:0;">${title}</p>
              </div>
              <table style="width:100%;font-size:14px;">
                <tr><td style="color:#64748b;padding:6px 0;">Project</td><td style="font-weight:bold;">${project||'General'}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0;">Module</td><td style="font-weight:bold;">${module||'—'}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0;">Reported by</td><td style="font-weight:bold;">${req.user.name}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0;">Time</td><td style="font-weight:bold;">${new Date().toLocaleString('en-IN')}</td></tr>
                ${req.file ? `<tr><td style="color:#64748b;padding:6px 0;">Screenshot</td><td><a href="${screenshot.url}" style="color:#2563eb;">View Screenshot →</a></td></tr>` : ''}
              </table>
              ${description ? `<p style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:14px;color:#475569;">${description}</p>` : ''}
              ${req.file ? `<img src="${screenshot.url}" style="width:100%;border-radius:8px;margin-top:16px;border:1px solid #fca5a5;" alt="Bug Screenshot"/>` : ''}
              <a href="https://devshield-frontend.vercel.app/bugs" style="display:inline-block;margin-top:20px;background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View Bug →</a>
            </div>
          </div>
        `
      })
    }

    res.status(201).json({ success: true, message: 'Bug reported!', bug })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Error creating bug' })
  }
})

// PUT — update bug
router.put('/:id', async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id)
    if (!bug) return res.status(404).json({ success: false, message: 'Bug not found' })
    if (bug.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' })

    const updated = await Bug.findByIdAndUpdate(
      req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true })
    const action = req.body.status === 'Resolved' ? 'BUG_RESOLVED' : 'BUG_UPDATED'
    await logActivity(req, action,
      `${action === 'BUG_RESOLVED' ? 'Resolved' : 'Updated'} bug: "${bug.title}"`,
      { bugId: bug._id, newStatus: req.body.status })

    res.json({ success: true, message: 'Bug updated!', bug: updated })
  } catch (e) { res.status(500).json({ success: false, message: 'Error updating bug' }) }
})

// DELETE — delete bug + delete screenshot from Cloudinary
router.delete('/:id', async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id)
    if (!bug) return res.status(404).json({ success: false, message: 'Bug not found' })
    if (bug.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' })

    // Delete screenshot from Cloudinary if exists
    if (bug.screenshot?.publicId) {
      await cloudinary.uploader.destroy(bug.screenshot.publicId)
    }

    await Bug.findByIdAndDelete(req.params.id)
    await logActivity(req, 'BUG_DELETED', `Deleted bug: "${bug.title}"`,
      { severity: bug.severity }, 'warning')

    res.json({ success: true, message: 'Bug deleted!' })
  } catch (e) { res.status(500).json({ success: false, message: 'Error deleting bug' }) }
})

module.exports = router