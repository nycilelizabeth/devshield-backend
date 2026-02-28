// routes/passwords.js — Password Vault + Activity Log
const express         = require('express')
const router          = express.Router()
const CryptoJS        = require('crypto-js')
const Password        = require('../models/Password')
const { protect }     = require('../middleware/auth')
const { logActivity } = require('../utils/logger')

router.use(protect)

const encrypt = (text) => CryptoJS.AES.encrypt(text, process.env.ENCRYPTION_KEY).toString()
const decrypt = (cipher) => {
  try { return CryptoJS.AES.decrypt(cipher, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8) }
  catch { return '' }
}

router.get('/', async (req, res) => {
  try {
    const passwords = await Password.find({ user: req.user._id }).sort({ createdAt: -1 })
    const decrypted = passwords.map(p => ({
      _id: p._id, service: p.service, username: p.username,
      password: decrypt(p.encryptedPassword),
      strength: p.strength, project: p.project, createdAt: p.createdAt
    }))
    res.json({ success: true, passwords: decrypted })
  } catch { res.status(500).json({ success: false, message: 'Error fetching passwords' }) }
})

router.post('/', async (req, res) => {
  try {
    const { service, username, password, strength, project } = req.body
    if (!service || !username || !password)
      return res.status(400).json({ success: false, message: 'Service, username and password are required' })

    const newPassword = await Password.create({
      user: req.user._id, service, username,
      encryptedPassword: encrypt(password),
      strength: strength || 0, project: project || 'General'
    })

    await logActivity(req, 'PASSWORD_SAVED',
      `Saved credential for: ${service}`,
      { service, project, strength }, 'info')

    res.status(201).json({
      success: true, message: 'Password saved securely!',
      password: { _id: newPassword._id, service, username, password, strength, project }
    })
  } catch { res.status(500).json({ success: false, message: 'Error saving password' }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const pw = await Password.findById(req.params.id)
    if (!pw) return res.status(404).json({ success: false, message: 'Password not found' })
    if (pw.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' })

    await Password.findByIdAndDelete(req.params.id)
    await logActivity(req, 'PASSWORD_DELETED', `Deleted credential for: ${pw.service}`,
      { service: pw.service }, 'warning')

    res.json({ success: true, message: 'Password deleted successfully' })
  } catch { res.status(500).json({ success: false, message: 'Error deleting password' }) }
})

module.exports = router
