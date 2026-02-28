// routes/breach.js — Breach Checker + Email Alert + Activity Log
const express              = require('express')
const router               = express.Router()
const https                = require('https')
const { protect }          = require('../middleware/auth')
const { logActivity }      = require('../utils/logger')
const { sendBreachAlert }  = require('../utils/mailer')

router.use(protect)

router.get('/check', async (req, res) => {
  const { email } = req.query
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' })

  const emailRegex = /\S+@\S+\.\S+/
  if (!emailRegex.test(email))
    return res.status(400).json({ success: false, message: 'Invalid email format' })

  try {
    const encodedEmail = encodeURIComponent(email)
    const apiUrl = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodedEmail}?truncateResponse=false`

    const options = {
      headers: {
        'hibp-api-key':  process.env.HIBP_API_KEY || '',
        'User-Agent':    'DevShield-App',
        'Content-Type':  'application/json'
      }
    }

    https.get(apiUrl, options, (apiRes) => {
      let data = ''
      apiRes.on('data', chunk => { data += chunk })
      apiRes.on('end', async () => {

        if (apiRes.statusCode === 404) {
          // Safe — no breaches found
          await logActivity(req, 'BREACH_CHECKED',
            `Breach check: ${email} — No breaches found ✅`,
            { email, safe: true, breachCount: 0 }, 'info')

          return res.json({
            success: true, safe: true, email,
            breachCount: 0, breaches: [],
            message: `Good news! ${email} was not found in any known data breaches.`
          })
        }

        if (apiRes.statusCode === 200) {
          const breaches = JSON.parse(data)

          // Log as critical — this is serious
          await logActivity(req, 'BREACH_CHECKED',
            `Breach check: ${email} — Found in ${breaches.length} breach(es) 🚨`,
            { email, safe: false, breachCount: breaches.length }, 'critical')

          // Send email alert automatically
          sendBreachAlert({
            to:          req.user.email,
            userName:    req.user.name,
            email,
            breachCount: breaches.length,
            breaches:    breaches.map(b => ({ name: b.Name, title: b.Title, date: b.BreachDate }))
          })

          return res.json({
            success: true, safe: false, email,
            breachCount: breaches.length,
            breaches: breaches.map(b => ({
              name: b.Name, title: b.Title, date: b.BreachDate,
              pwnCount: b.PwnCount, description: b.Description
            })),
            message: `Warning! ${email} was found in ${breaches.length} data breach(es). Change your passwords immediately!`
          })
        }

        if (apiRes.statusCode === 429)
          return res.status(429).json({ success: false, message: 'Too many requests. Wait 1 minute and try again.' })

        // Demo fallback (no API key)
        const isSafe = Math.random() > 0.4
        await logActivity(req, 'BREACH_CHECKED',
          `Breach check (demo): ${email} — ${isSafe ? 'Safe' : '2 demo breaches'}`,
          { email, demo: true }, isSafe ? 'info' : 'warning')

        res.json({
          success: true, safe: isSafe, email,
          breachCount: isSafe ? 0 : 2,
          breaches: isSafe ? [] : [
            { name: 'Adobe', title: 'Adobe', date: '2013-10-04' },
            { name: 'LinkedIn', title: 'LinkedIn', date: '2016-05-22' }
          ],
          message: isSafe ? `Demo: ${email} appears safe.` : `Demo: ${email} found in 2 simulated breaches.`,
          demo: true
        })
      })
    }).on('error', async () => {
      const isSafe = Math.random() > 0.4
      await logActivity(req, 'BREACH_CHECKED', `Breach check (offline demo): ${email}`, { email, demo: true })
      res.json({
        success: true, safe: isSafe, email,
        breachCount: isSafe ? 0 : 2,
        breaches: isSafe ? [] : [{ name: 'Adobe', title: 'Adobe', date: '2013-10-04' }],
        message: isSafe ? `Demo: ${email} appears safe.` : `Demo: ${email} found in demo breach.`,
        demo: true
      })
    })
  } catch {
    res.status(500).json({ success: false, message: 'Error checking breach status' })
  }
})

module.exports = router
