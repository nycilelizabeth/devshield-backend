const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
const dotenv   = require('dotenv')
dotenv.config()

const app = express()
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',      require('./routes/auth'))
app.use('/api/passwords', require('./routes/passwords'))
app.use('/api/bugs',      require('./routes/bugs'))
app.use('/api/testcases', require('./routes/testcases'))
app.use('/api/breach',    require('./routes/breach'))
app.use('/api/activity',  require('./routes/activity'))
app.use('/api/teams',     require('./routes/teams'))
app.use('/api/phishing',  require('./routes/phishing'))

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'DevShield API is running!',
    timestamp: new Date().toISOString(),
    email: process.env.EMAIL_USER ? 'configured' : 'not configured',
    googleSafeBrowsing: process.env.GOOGLE_SAFE_BROWSING_KEY ? 'configured' : 'not configured'
  })
})

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected')
    app.listen(process.env.PORT || 5000, () => {
      console.log('🚀 DevShield Server running on http://localhost:5000')
      console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ ' + process.env.EMAIL_USER : '⚠ Not configured'}`)
      console.log(`🔍 Google Safe Browsing: ${process.env.GOOGLE_SAFE_BROWSING_KEY ? '✅ configured' : '⚠ Not configured'}`)
    })
  })
  .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1) })