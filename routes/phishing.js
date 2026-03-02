// routes/phishing.js — Phishing Scanner with Google Safe Browsing API
const express        = require('express')
const router         = express.Router()
const axios          = require('axios')
const { protect }    = require('../middleware/auth')
const { logActivity} = require('../utils/logger')

router.use(protect)

router.post('/scan', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ success: false, message: 'URL is required' })

    let parsedUrl = url.trim()
    if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) {
      parsedUrl = 'https://' + parsedUrl
    }

    let googleResult = null
    let googleThreatTypes = []

    // Google Safe Browsing API check
    const apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY
    if (apiKey) {
      try {
        const googleRes = await axios.post(
          `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
          {
            client: { clientId: 'devshield', clientVersion: '1.0' },
            threatInfo: {
              threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url: parsedUrl }]
            }
          },
          { timeout: 5000 }
        )
        googleResult = googleRes.data
        if (googleResult.matches && googleResult.matches.length > 0) {
          googleThreatTypes = googleResult.matches.map(m => m.threatType)
        }
      } catch (e) {
        console.log('Google Safe Browsing API error:', e.message)
        googleResult = null
      }
    }

    // Log activity
    await logActivity(req, 'PHISHING_SCAN', `Scanned URL for phishing: ${parsedUrl}`,
      { url: parsedUrl, googleChecked: !!apiKey, threats: googleThreatTypes.length },
      googleThreatTypes.length > 0 ? 'critical' : 'info')

    res.json({
      success: true,
      url: parsedUrl,
      googleSafeBrowsing: {
        checked: !!apiKey,
        safe: googleThreatTypes.length === 0,
        threats: googleThreatTypes,
        message: !apiKey
          ? 'Google Safe Browsing API not configured'
          : googleThreatTypes.length > 0
            ? `⚠ Google flagged this URL: ${googleThreatTypes.join(', ')}`
            : '✅ Google Safe Browsing: No threats detected'
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Scan failed' })
  }
})

module.exports = router