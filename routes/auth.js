const express              = require('express')
const router               = express.Router()
const jwt                  = require('jsonwebtoken')
const User                 = require('../models/User')
const ActivityLog          = require('../models/ActivityLog')
const { protect }          = require('../middleware/auth')
const { sendWelcomeEmail } = require('../utils/mailer')

const createToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' })

    const existing = await User.findOne({ email })
    if (existing)
      return res.status(400).json({ success: false, message: 'An account with this email already exists' })

    const user  = await User.create({ name, email, password, role })
    const token = createToken(user._id)

    // Log — wrapped so it never crashes registration
    try {
      await ActivityLog.create({
        user: user._id, userName: user.name,
        action: 'USER_REGISTER',
        description: `New account registered: ${email}`,
        severity: 'info', ipAddress: req.ip || 'unknown'
      })
    } catch(e) { console.log('Log skip:', e.message) }

    // Welcome email — non-blocking
    sendWelcomeEmail({ to: email, userName: name }).catch(() => {})

    res.status(201).json({
      success: true, message: 'Account created successfully!', token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ success: false, message: 'Server error during registration' })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password' })

    const user = await User.findOne({ email }).select('+password')
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid email or password' })

    const isMatch = await user.matchPassword(password)
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid email or password' })

    const token = createToken(user._id)

    // Log — wrapped so it NEVER crashes login
    try {
      await ActivityLog.create({
        user: user._id, userName: user.name,
        action: 'USER_LOGIN',
        description: `User logged in: ${email}`,
        severity: 'info', ipAddress: req.ip || 'unknown'
      })
    } catch(e) { console.log('Log skip:', e.message) }

    res.json({
      success: true, message: 'Login successful!', token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ success: false, message: 'Server error during login' })
  }
})

// GET ME
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, createdAt: req.user.createdAt }
  })
})

module.exports = router