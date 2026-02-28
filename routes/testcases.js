// routes/testcases.js — Test Cases + Activity Log
const express         = require('express')
const router          = express.Router()
const TestCase        = require('../models/TestCase')
const { protect }     = require('../middleware/auth')
const { logActivity } = require('../utils/logger')

router.use(protect)

router.get('/', async (req, res) => {
  try {
    const filter = { user: req.user._id }
    if (req.query.status)  filter.status  = req.query.status
    if (req.query.project) filter.project = req.query.project

    const testCases = await TestCase.find(filter).sort({ createdAt: -1 })
    const total   = testCases.length
    const passed  = testCases.filter(t => t.status === 'Pass').length
    const failed  = testCases.filter(t => t.status === 'Fail').length
    const skipped = testCases.filter(t => t.status === 'Skip').length
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

    res.json({ success: true, testCases, stats: { total, passed, failed, skipped, passRate } })
  } catch { res.status(500).json({ success: false, message: 'Error fetching test cases' }) }
})

router.post('/', async (req, res) => {
  try {
    const { title, description, steps, expectedResult, priority, module, project } = req.body
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' })

    const testCase = await TestCase.create({ user: req.user._id, title, description, steps, expectedResult, priority, module, project })
    await logActivity(req, 'TEST_CREATED', `Created test case: "${title}"`, { testId: testCase._id, priority, module })

    res.status(201).json({ success: true, message: 'Test case created!', testCase })
  } catch { res.status(500).json({ success: false, message: 'Error creating test case' }) }
})

router.put('/:id', async (req, res) => {
  try {
    const tc = await TestCase.findById(req.params.id)
    if (!tc) return res.status(404).json({ success: false, message: 'Test case not found' })
    if (tc.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' })

    const updated = await TestCase.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true })

    const action = req.body.status === 'Pass' ? 'TEST_PASSED' : req.body.status === 'Fail' ? 'TEST_FAILED' : 'TEST_CREATED'
    await logActivity(req, action, `Test "${tc.title}" marked as ${req.body.status || 'updated'}`,
      { testId: tc._id, status: req.body.status }, req.body.status === 'Fail' ? 'warning' : 'info')

    res.json({ success: true, message: 'Test case updated!', testCase: updated })
  } catch { res.status(500).json({ success: false, message: 'Error updating test case' }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const tc = await TestCase.findById(req.params.id)
    if (!tc) return res.status(404).json({ success: false, message: 'Not found' })
    if (tc.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' })

    await TestCase.findByIdAndDelete(req.params.id)
    await logActivity(req, 'TEST_DELETED', `Deleted test case: "${tc.title}"`, {}, 'warning')

    res.json({ success: true, message: 'Test case deleted!' })
  } catch { res.status(500).json({ success: false, message: 'Error deleting test case' }) }
})

module.exports = router
